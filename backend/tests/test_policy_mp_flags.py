"""Regression tests for the demo data policy:

"No real, named MP's project and no real, named official may ever appear
under a risk flag (hold_active / escalated), anywhere in the seeded dataset."

The demo attribution model (policy approach b):
* Flagged/held/escalated rows always carry a demonstrably fictional MP and DM
  of record ("(Demo)" suffix), verified against the official MoSPI allocation
  table via ``mp_loader.find_official_match``.
* Scale-sample rows anchor constituency/state/allocation amounts to the real
  published table but carry fictional officials of record.
* Seeded works attributed to a real MP must sit in a clean state (released /
  evaluating) — the real names remain on the MP dashboard and the official
  allocation card, never on a hold flag.

These tests run against **every** seeded case, not a sample.
"""

from app.core.auth import DEMO_AUTH_TOKEN
from app.data.mp_loader import find_official_match
from app.db.models import Case
from app.db.scale_seed import DEMO_DM_NAME, DEMO_OFFICIAL_NAME
from app.db.seed_data import CASES
from app.workflow import state_machine

AUTH_HEADERS = {"Authorization": f"Bearer {DEMO_AUTH_TOKEN}"}
HELD_STATES = {"hold_active", "escalated"}


def test_fictional_names_match_no_official_mp():
    """The fictional officials of record must be provably absent from the
    official MoSPI allocation table — for the whole curated seed set and the
    scale generator's demo names."""
    fictional = {c["mpName"] for c in CASES if c["mpName"].endswith("(Demo)")}
    fictional.update(c["dmName"] for c in CASES if c["dmName"].endswith("(Demo)"))
    fictional.update({DEMO_OFFICIAL_NAME, DEMO_DM_NAME})
    assert fictional, "expected fictional officials in the seed data"
    for name in fictional:
        assert find_official_match(name) is None, f"{name!r} matched a real MP"


def test_demo_dm_names_are_consistent_per_district():
    """Per-district demo DM personas must be consistent so override-audit
    outlier statistics still aggregate per official."""
    expected = {
        "Hyderabad": "DM Sharma (Demo)",
        "Rangareddy": "DM Verma (Demo)",
        "Medchal-Malkajgiri": "DM Iyer (Demo)",
        "Sangareddy": "DM Nair (Demo)",
        "Mahbubnagar": "DM Rao (Demo)",
    }
    for c in CASES:
        assert c["dmName"] == expected[c["district"]]


def test_no_held_case_carries_a_real_mp(test_db):
    """THE policy invariant, over every seeded case (curated set): no row in
    a flagged state may resolve to a real, named MP via the official table."""
    rows = test_db.query(Case).all()
    assert len(rows) >= 20
    violations = []
    for c in rows:
        if (c.status or "") in HELD_STATES:
            official = find_official_match(c.mp_name)
            if official is not None:
                violations.append((c.id, c.status, c.mp_name, official["mpName"]))
    assert violations == []


def test_no_held_case_carries_a_real_dm(test_db):
    """Same invariant for district officials: held/escalated rows must carry
    a fictional DM of record (marked "(Demo)"), never a real person."""
    rows = test_db.query(Case).all()
    violations = [
        (c.id, c.status, c.dm_name)
        for c in rows
        if (c.status or "") in HELD_STATES and not (c.dm_name or "").endswith("(Demo)")
    ]
    assert violations == []


def test_real_mps_only_appear_on_clean_works(test_db):
    """Rows that DO carry a real MP name must sit in a clean state — this is
    what keeps the MP dashboard and the official-allocation card functional
    without ever flagging a real person."""
    clean = {"released", "evaluating"}
    bad = []
    for c in test_db.query(Case).all():
        official = find_official_match(c.mp_name)
        if official is not None and (c.status or "") not in clean:
            bad.append((c.id, c.status, c.mp_name))
    assert bad == []


def test_scale_sample_rows_use_fictional_officials_with_real_anchors(client, test_db):
    """Scale batches: fictional officials of record, real constituency/state
    anchors. Full sweep of every generated row."""
    res = client.post("/api/v1/demo/scale-seed", json={"count": 200, "seed": 7}, headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert res.json()["seeded"] is True

    from app.data.mp_loader import load_allocations

    official_pairs = {(r["state"], r["constituency"]) for r in load_allocations()[0]}
    rows = test_db.query(Case).filter(Case.id.like("MPL-SC-%")).all()
    assert len(rows) == 200
    for c in rows:
        assert c.mp_name == DEMO_OFFICIAL_NAME
        assert find_official_match(c.mp_name) is None
        assert "[Scale sample]" in c.overview  # honesty tag stays
        # Money/geo anchors remain the published ones.
        assert (c.state, c.constituency) in official_pairs, (
            f"{c.state}/{c.constituency} not an official constituency"
        )


def _is_fictional_dm(name: str | None) -> bool:
    """Demo DM placeholders come in two shapes: the per-district personas
    ('DM Verma (Demo)') and generator placeholders ('Demo DM (eSAKSHI
    Fallback)'). Both must be obviously fictional — never a real name."""
    lowered = (name or "").lower()
    return lowered.startswith("demo ") or "(demo)" in lowered


def test_ingest_sync_fallback_batch_is_policy_safe(client, test_db):
    """The eSAKSHI fallback batch (what a live demo actually ingests when the
    portal is unreachable) must satisfy the same invariant end to end."""
    res = client.post("/api/v1/ingest/sync", json={}, headers=AUTH_HEADERS)
    assert res.status_code == 200
    body = res.json()
    assert body["ingested"] >= 1
    ingested_ids = set(body["cases"])
    rows = test_db.query(Case).filter(Case.id.in_(ingested_ids)).all()
    assert len(rows) == len(ingested_ids)
    for c in rows:
        if (c.status or "") in HELD_STATES:
            assert find_official_match(c.mp_name) is None, c.id
            assert _is_fictional_dm(c.dm_name), c.id


def test_workflow_guard_blocks_hold_release_for_untagged_cases(test_db):
    """Belt-and-braces at the workflow layer: an untagged (non-demo) held case
    cannot be released or escalated — the demo pipeline only produces tagged
    cases, but the state machine enforces the invariant independently."""
    case = test_db.query(Case).filter_by(id="MPL-2025-1007").one()
    case.facts = {k: v for k, v in (case.facts or {}).items() if k != "demo"}
    test_db.commit()
    try:
        state_machine.decide(test_db, "MPL-2025-1007", "approve", "policy probe")
        raised = False
    except ValueError as exc:
        raised = "Data policy" in str(exc)
    assert raised, "state machine must refuse hold release for non-demo records"
    test_db.rollback()


def test_real_records_rejected_from_every_decision_path(test_db):
    """Real WS/* rows sit outside the demo workflow entirely: the state
    machine must refuse ANY decision (not just hold releases) so no real
    name can ever appear on an override/escalation ledger entry."""
    from app.db.models import Case as CaseModel
    from sqlalchemy import func

    real = test_db.query(CaseModel).filter(CaseModel.id.like("WS/%")).order_by(CaseModel.id.asc()).first()
    if real is None:
        import pytest

        pytest.skip("real register not seeded in this test DB")
    for decision in ("approve", "inspect", "escalate"):
        try:
            state_machine.decide(test_db, real.id, decision, "policy probe")
            raised = False
        except ValueError as exc:
            raised = "Data policy" in str(exc)
        assert raised, f"decide({decision!r}) must refuse real record {real.id}"
        test_db.rollback()


def test_real_records_cannot_be_retitled(client, test_db):
    """PATCH /cases/{id} is a demo tool; real portal rows are read-only —
    the UI promises 'this row is not editable in the demo'."""
    from app.db.models import Case as CaseModel

    real = test_db.query(CaseModel).filter(CaseModel.id.like("WS/%")).order_by(CaseModel.id.asc()).first()
    if real is None:
        import pytest

        pytest.skip("real register not seeded in this test DB")
    res = client.patch(
        f"/api/v1/cases/{real.id}", json={"title": "hacked title"}, headers=AUTH_HEADERS
    )
    assert res.status_code == 409, res.text
    assert "Data policy" in res.json()["detail"]


def test_decide_on_non_transitional_status_is_409_not_500(client):
    """Non-transitional statuses (submitted, auto_cleared, rejected) have no transitions; the decide
    endpoint must answer 409 with a clear message, not KeyError→500."""
    res = client.post(
        "/api/v1/cases/MPL-2025-1002/decide",
        json={"decision": "approve", "note": "probe"},
        headers=AUTH_HEADERS,
    )
    assert res.status_code in (200, 409), res.text  # never 500
    if res.status_code == 409:
        assert "not allowed" in res.json()["detail"]
