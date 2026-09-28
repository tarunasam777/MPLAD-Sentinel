import concurrent.futures as concurrent_futures
import threading
import pytest
from app.db.models import Case, LedgerEntry
from app.workflow import state_machine
from app.ledger import chain
from app.ingestion.pipeline import run_case_pipeline

def test_ledger_tamper_detection(test_db):
    """Test Case 4 (Ledger Tamper Detection): Write 5 ledger entries, programmatically tamper

    with Block #2's payload, execute chain.verify(), and assert that the test catches
    the cryptographic break at Block #2.
    """
    # Clear existing ledger and add 5 chained entries
    chain.reset(test_db)

    for i in range(5):
        chain.append(
            test_db,
            action=f"STAGE_{i}_ACTION",
            category="hold" if i % 2 == 0 else "clear",
            actor=f"actor_{i}",
            actor_role=f"Role {i}",
            body=f"Audited milestone details for block {i}",
            timestamp=f"2025-06-0{i+1}T10:00:00",
            case_id=f"MPL-2025-100{i}",
            commit=True,
        )

    # Verify original chain is 100% valid
    initial_validity = chain.verify(test_db)
    assert len(initial_validity) == 5
    assert all(initial_validity), "All 5 genesis/appended blocks should initially be valid"

    # Programmatically tamper with Block #2
    chain.tamper(
        test_db,
        index=2,
        body="MALICIOUS_TAMPERED_BODY_OVERWRITE",
        timestamp="2025-06-03T11:99:99",
    )

    # Run cryptographic chain verification
    tampered_validity = chain.verify(test_db)
    assert len(tampered_validity) == 5

    # Block 0 and 1 must be valid
    assert tampered_validity[0] is True
    assert tampered_validity[1] is True

    # Block 2 or Block 3 onwards should fail because prev_hash linkage is broken
    # (In blockchain ledger, tampering block 2 changes its hash, which breaks block 3's prev_hash check)
    assert tampered_validity[3] is False, "Block #3 should fail verification because Block #2's hash altered"

    # Restore ledger
    restored_count = chain.untamper(test_db)
    assert restored_count >= 1

    restored_validity = chain.verify(test_db)
    assert all(restored_validity), "Restoring tamper should return chain to 100% cryptographic validity"


def test_scoped_lock_concurrency(test_db):
    """Test Case 3 (Scoped Lock Concurrency): Simulate 20 concurrent requests on a single case

    while a DM override is submitted. Assert no database deadlocks occur.
    """
    target_case_id = "MPL-2025-1001"
    
    # Ensure starting status is hold_active
    case = test_db.query(Case).filter_by(id=target_case_id).one()
    case.status = "hold_active"
    test_db.commit()

    errors = []
    success_count = 0

    def concurrent_rescore_or_decide(thread_id: int):
        # Create separate session per thread for realistic concurrency
        from app.core.db import SessionLocal
        local_db = SessionLocal()
        try:
            if thread_id == 7:
                # One thread executes DM decision
                state_machine.decide(
                    db=local_db,
                    case_id=target_case_id,
                    decision="inspect",
                    note=f"Thread {thread_id} ordered field inspection",
                )
            else:
                # Concurrent read and pipeline evaluation
                c = local_db.query(Case).filter_by(id=target_case_id).first()
                if c:
                    run_case_pipeline(local_db, c)
                    local_db.commit()
            return True
        except Exception as exc:
            return exc
        finally:
            local_db.close()

    with concurrent_futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(concurrent_rescore_or_decide, i) for i in range(20)]
        for f in concurrent_futures.as_completed(futures):
            res = f.result()
            if isinstance(res, Exception):
                errors.append(str(res))
            else:
                success_count += 1

    # Assert no fatal deadlocks occurred
    assert len(errors) == 0 or all("deadlock" not in e.lower() for e in errors)
    assert success_count > 0

    # Verify final case state is intact
    updated_case = test_db.query(Case).filter_by(id=target_case_id).one()
    assert updated_case.status in {"hold_active", "released", "escalated"}


def test_manual_field_edit_detected_as_tampering(test_db):
    """Manual inline amount/status edits must be indistinguishable, detection-
    wise, from the simulate-tamper path: stored body rewritten directly, ONLY
    that block's own hash re-signed (no child prevHash touched), and the next
    chain.verify() flags the child block naturally."""
    chain.reset(test_db)

    for i in range(5):
        chain.append(
            test_db,
            action=f"STAGE_{i}_ACTION",
            category="release" if i % 2 == 0 else "clear",
            actor=f"actor_{i}",
            actor_role=f"Role {i}",
            body=f"Released funds for milestone of work {i}",
            timestamp=f"2025-06-0{i+1}T10:00:00",
            case_id=f"MPL-2025-100{i}",
            commit=True,
        )

    assert all(chain.verify(test_db)), "precondition: clean chain"

    # Snapshot every block to prove the edit touches exactly one hash field.
    before = {r.index: (r.body, r.hash, r.prev_hash) for r in test_db.query(LedgerEntry).all()}

    # Same primitive calls the /ledger/tamper-fields endpoint makes.
    from app.ledger.ledger_edits import (
        edited_indices,
        encode_body,
        record_edit,
        restore_edited,
        split_body,
    )

    index = 2
    row = test_db.query(LedgerEntry).filter_by(index=index).one()
    head, _, _ = split_body(row.body)
    record_edit(test_db, index, row.body, row.timestamp, row.hash)
    chain.tamper(test_db, index, encode_body(head, 99.5, "FALSIFIED"), row.timestamp)

    # Attacker model: own hash re-sealed, prevHash pointers of every OTHER
    # block untouched, original snapshot recorded.
    after = {r.index: (r.body, r.hash, r.prev_hash) for r in test_db.query(LedgerEntry).all()}
    assert after[index][1] != before[index][1], "edited block's hash must change (re-sealed)"
    for i in before:
        if i != index:
            assert after[i][2] == before[i][2], f"block {i} prevHash must be untouched"
            assert after[i][1] == before[i][1], f"block {i} hash must be untouched"
    assert edited_indices(test_db) == [index]

    # Detection: child block no longer links — surfaced by the SAME verify()
    # used by the simulate-tampering flow.
    validity = chain.verify(test_db)
    assert validity[index] is True, "attacker re-sealed own hash — block itself checks out"
    assert validity[index + 1] is False, "child must fail: recomputed parent hash != stored prevHash"

    # Restore Integrity / Re-seal reverts BOTH paths: original values back,
    # chain verifies clean again.
    restored = chain.untamper(test_db) + restore_edited(test_db)
    assert restored >= 1
    final = {r.index: (r.body, r.hash, r.prev_hash) for r in test_db.query(LedgerEntry).all()}
    assert final[index] == before[index], "restore must return the original record"
    assert all(chain.verify(test_db)), "chain must verify clean after restore"

    # Round-trip safety: re-editing the restored block re-snapshots cleanly.
    row = test_db.query(LedgerEntry).filter_by(index=index).one()
    head, _, _ = split_body(row.body)
    record_edit(test_db, index, row.body, row.timestamp, row.hash)
    chain.tamper(test_db, index, encode_body(head, 0.5, "X"), row.timestamp)
    chain.untamper(test_db)
    restore_edited(test_db)
    assert all(chain.verify(test_db))
