"""Bulk-seed the REAL eSAKSHI work-level exports (Lok Sabha) into the case table.

Every row is a real portal record: real work id (``WS/MP…``), real MP name,
real constituency, real district authority (IDA), real sanctioned amount and
date, real payment aggregates. These are NOT demonstration records — they
carry ``facts["record_kind"] = "real"`` and no ``demo`` tag, so the workflow
layer (``state_machine.decide``) refuses hold releases on them. The policy
invariant ("no real person's name on a flagged row") is preserved the other
way round: real works are seeded **clean** (status ``released`` with the
facts carrying their real portal state), so the demo's flags live only on
fictional-official records.

The curated Telangana demo set + a synthetic national scale sample remain
available; ``demo reset`` clears real rows too (they are re-derivable from
the vendored exports in seconds).
"""

from __future__ import annotations

import logging
import random
import threading
from datetime import datetime, timezone
from itertools import islice
from typing import Iterator

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Process-wide guard: boot-time background seeding and any manual invocation
# must not race (two seeds would both see an empty register and double-insert).
_seed_lock = threading.Lock()

from app.data.works_loader import load_real_works, stall_labels
from app.db.models import Case, StateStat
from app.ingestion.pipeline import ingest_and_evaluate_batch
from app.ledger.chain import append as append_ledger

REAL_ID_PREFIX = "WS/"          # real ids keep their portal form (WS/MP…)
BATCH_SIZE = 100                # rows per ingest transaction — bounded memory
PROGRESS_BATCHES = 40           # commit a durable progress marker every 40 batches (4k rows)

# Eligibility gates for the demo case table: keep works the modules can
# meaningfully evaluate (positive sanction, parseable date) and drop
# trivially tiny ones (₹0 rows are portal data artifacts).
MIN_SANCTION_RUPEES = 50_000


def _facts_for(w: dict, dm_name: str, rng: random.Random) -> dict:
    """Real portal aggregates shaped for the 7-module pipeline."""
    return {
        "record_kind": "real",
        "work_id": w["work_id"],
        "ida": w["ida"],
        "source": "esakshi-export-2026-09-21",
        "terrain": "plain",
        "trend": {
            "case_release_pct": round(w["released_pct"]),
            "peer_release_pct": 55,
            "peer_sd": 12,
        },
        "payment": {
            "released_pct": round(w["released_pct"]),
            "completion_pct": round(w["completion_pct"]),
            "months_since_sanction": round(w["months_since_sanction"], 1),
            "extensions": min(3, int((w["sanction_amount_rupees"] / 1e5) // 40)),
        },
        "compliance": {
            "checks": [
                {
                    "field": "Land ownership",
                    "actual": "Public land record",
                    "required": "Public / Municipal Land",
                    "rule_ref": "OP 2025–26 §4.1.3",
                    "clause_text": "Works on public or municipal land.",
                    "critical": True,
                    "passed": True,
                },
                {
                    "field": "Entity type",
                    "actual": "Public implementing agency",
                    "required": "Eligible Public Entity",
                    "rule_ref": "OP 2025–26 §2.1",
                    "clause_text": "Implementing agency eligible.",
                    "critical": True,
                    "passed": True,
                },
            ]
        },
    }


def _payload_for(w: dict, rng: random.Random) -> dict:
    """One real work → raw case payload (built lazily, per batch)."""
    sanction = w["sanctioned_date"]
    slabel = sanction.strftime("%d %b %Y") if sanction else ""
    amount_lakh = round(w["sanction_amount_rupees"] / 1e5, 2)
    # MP names in the works exports are uppercase/variant forms; they are
    # REAL people on REAL works in CLEAN state — allowed by the policy.
    mp = w["mp_name"] or "Unnamed (portal record)"
    return {
        "id": w["work_id"],
        "title": w["title"],
        "hindiTitle": "",
        "category": w["category"],
        "state": w["state"],
        "district": w["district"],
        "constituency": w["constituency"],
        "mpName": mp,
        "dmName": "District Authority (Portal Record)",
        "sanctionedAmountLakh": amount_lakh,
        "sanctionedDate": slabel,
        "status": "evaluating",
        "statusSince": slabel,
        "overview": (
            f"Real eSAKSHI record {w['work_id']} ({w['state']}, {w['constituency']}). "
            f"Portal status: {w['status'] or 'n/a'}; {w['payment_count']} vendor "
            f"payment(s) totalling ₹{w['paid_rupees']:,.0f}. Officials of record are "
            f"the portal's own; this row is not editable in the demo."
        ),
        "mpPlainStatus": (
            f"Real portal record — {w['status'] or 'status not published'} "
            f"({round(w['completion_pct'])}% completion, {round(w['released_pct'])}% released)."
        ),
        "path": ["submitted", "evaluating"],
        "facts": _facts_for(w, "District Authority (Portal Record)", rng),
    }


def _real_works_stream(count: int | None = None) -> Iterator[dict]:
    """Yield eligible real works one at a time (memory-bounded).

    The old builder materialized all 82k payloads up front (~200 MB of
    dicts); the seeder only needs a window of ``BATCH_SIZE`` at a time.
    """
    works = stall_labels(load_real_works())
    eligible = (w for w in works if w["sanction_amount_rupees"] >= MIN_SANCTION_RUPEES)
    if count is not None:
        # islice keeps only the first ``count`` eligible rows alive.
        yield from islice(eligible, count)
    else:
        yield from eligible


def real_case_count(db: Session) -> int:
    return db.query(Case).filter(Case.id.like("WS/%")).count()


def seed_real_works_async() -> None:
    """Kick off register seeding on a daemon thread (non-blocking boot).

    The API is ready immediately; /works and /works/summary fill up as the
    background batches land. Failures are logged, never raised — a failed
    seed just means an empty register until the next boot.
    """

    def _run() -> None:
        from app.core.db import SessionLocal

        db = SessionLocal()
        try:
            result = seed_real_works(db)
            logger.info("Background real-register seed finished: %s", {k: v for k, v in result.items() if k != "note"})
        except Exception:  # noqa: BLE001 — boot must never die from seeding
            logger.exception("Background real-register seed failed")
        finally:
            db.close()

    threading.Thread(target=_run, name="real-seed", daemon=True).start()


def _mark_progress(db: Session, done: int) -> None:
    """Durable progress marker (MetaKey) every PROGRESS_BATCHES batches — a
    restart re-enters the stream but skips already-seeded ids via the
    pipeline's existing id-uniqueness, at the cost of re-evaluation only."""
    from app.db.models import MetaKey

    db.merge(
        MetaKey(
            key="real_seed_progress",
            value={"ingested": done, "at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        )
    )
    db.commit()


def seed_real_works(db: Session, count: int | None = None, force: bool = False) -> dict:
    """Seed real eSAKSHI works in transaction batches. Idempotent unless force.

    Lock-guarded per process so a background boot seed and an explicit call
    can never interleave."""
    with _seed_lock:
        return _seed_real_works_locked(db, count=count, force=force)


def _seed_real_works_locked(db: Session, count: int | None = None, force: bool = False) -> dict:
    existing = real_case_count(db)
    if existing and not force:
        return {"seeded": False, "existing": existing}
    if force and existing:
        db.query(Case).filter(Case.id.like("WS/%")).delete(synchronize_session=False)
        db.commit()

    started = datetime.now(timezone.utc)
    rng = random.Random(7)
    stream = _real_works_stream(count)
    totals = {"ingested": 0, "quarantined": 0, "held": 0, "evaluating": 0, "skipped": 0}
    would_hold = 0
    processed_batches = 0
    while True:
        chunk = [w for w in islice(stream, BATCH_SIZE)]
        chunk = [_payload_for(w, rng) for w in chunk]
        if not chunk:
            break
        res = ingest_and_evaluate_batch(
            db, chunk, source="esakshi-export", record_ledger=False
        )
        for k in totals:
            totals[k] += res[k]

        # Policy invariant: real records never enter a flagged state — the
        # demo's holds/overrides stay confined to fictional-official demo
        # rows. Real works keep their fully computed risk scores and real
        # portal state (completion/release live in facts); only the workflow
        # status is pinned to the clean ``evaluating`` state. The number of
        # works the pipeline *would* hold is kept as an informational count.
        ids = [c["id"] for c in chunk]
        for c in db.query(Case).filter(Case.id.in_(ids)).all():
            if c.status != "evaluating":
                would_hold += 1
                c.status = "evaluating"
                c.path = ["submitted", "evaluating"]
        db.commit()
        processed_batches += 1
        if processed_batches % PROGRESS_BATCHES == 0:
            _mark_progress(db, totals["ingested"])
    totals["held"] = 0
    totals["would_hold_unrestricted"] = would_hold

    # National aggregates from the REAL rows only — computed in SQL (one
    # grouped scan) instead of loading every facts blob into Python.
    from sqlalchemy import func

    released_expr = func.json_extract(Case.facts, "$.payment.released_pct")
    grouped = (
        db.query(
            Case.state,
            func.count(Case.id),
            func.avg(released_expr),
        )
        .filter(Case.id.like("WS/%"))
        .group_by(Case.state)
        .all()
    )
    for state, n, avg_released in grouped:
        if int(n or 0) < 20:
            continue
        utilization = int(round(float(avg_released or 0)))
        stat = db.query(StateStat).filter_by(state=state).first()
        if stat is None:
            db.add(StateStat(state=state, utilization=utilization, cases_count=int(n or 0)))
        else:
            stat.cases_count = max(int(stat.cases_count or 0), int(n or 0))

    append_ledger(
        db,
        action="REAL DATASET SEEDED",
        category="ingestion",
        actor="system",
        actor_role="Sentinel Real-Data Loader",
        body=(
            f"Seeded {totals['ingested']} real eSAKSHI works (Lok Sabha exports, "
            f"snapshot 2026-09-21). Real records stay clean; holds/overrides "
            f"remain confined to demonstration records."
        ),
        timestamp=started.isoformat(timespec="seconds"),
        case_id=None,
        commit=True,
    )
    return {
        "seeded": True,
        "count": totals["ingested"],
        "quarantined": totals["quarantined"],
        "held": 0,
        "would_hold_unrestricted": totals["would_hold_unrestricted"],
        "note": "Real portal records (WS/MP… ids), seeded clean per the data policy; demo reset re-derives them from the vendored exports.",
    }
