from __future__ import annotations

import math

from sqlalchemy.orm import Session

from app.core.config import STATE_NAME
from app.data.mp_loader import load_allocations
from app.db import seed_data
from app.db.models import (
    Case,
    CategoryStat,
    CostBaseline,
    DistrictQuarterly,
    LedgerEntry,
    ModuleScore,
    MonthlyTrend,
    MpAllocation,
    MpStat,
    OfficialStat,
    OverrideRecord,
    StateStat,
)
from app.ingestion.pipeline import run_case_pipeline
from app.ledger.chain import block_hash

CASE_FIELD_MAP = {
    "hindiTitle": "hindi_title",
    "mpName": "mp_name",
    "dmName": "dm_name",
    "sanctionedAmountLakh": "sanctioned_amount_lakh",
    "sanctionedDate": "sanctioned_date",
    "statusSince": "status_since",
    "mpPlainStatus": "mp_plain_status",
}


def _seed_mp_allocations(db: Session) -> None:
    """Idempotently sync the MpAllocation table from the vendored CSV.

    Runs on every boot (even when the demo reseed is skipped): a fast
    count check keeps the common path instant, while a fresh/empty DB or a
    schema change always self-heals to the full 543-row official table.
    """
    rows = load_allocations()[0]
    existing = db.query(MpAllocation.mp_name).count()
    if existing == len(rows):
        return
    db.query(MpAllocation).delete()
    for row in rows:
        db.add(
            MpAllocation(
                mp_name=row["mpName"],
                state=row["state"],
                constituency=row["constituency"],
                allocated_cr=row["allocatedCr"],
            )
        )
    db.flush()


def reseed(db: Session, force: bool = False) -> bool:
    """Idempotent seed: clears the demo tables and re-derives all module scores,
    composites and gates from the stored facts."""
    _seed_mp_allocations(db)
    if not force and db.query(Case).count():
        return False

    db.query(OverrideRecord).delete()
    db.query(ModuleScore).filter(~ModuleScore.case_id.like("WS/%")).delete(synchronize_session=False)
    db.query(LedgerEntry).delete()
    db.query(MpStat).delete()
    db.query(CategoryStat).delete()
    db.query(StateStat).delete()
    db.query(MonthlyTrend).delete()
    db.query(DistrictQuarterly).delete()
    db.query(CostBaseline).delete()
    db.query(OfficialStat).delete()
    # Real eSAKSHI register rows (WS/*) are read-only reference data, not
    # demo state — a demo reset preserves them. Demo/scale rows are cleared
    # and re-derived from the vendored seed sets below.
    # MpAllocation rows are synced idempotently at the top of reseed() —
    # not cleared here — so a demo reset never blanks the official table.
    # ModuleScores for deleted demo cases must go too: WS/* scores are kept,
    # but the blanket keep-orphaned every MPL-* score and broke the reseed
    # flush with a case_id FK violation (module_scores.case_id → cases.id).
    db.query(ModuleScore).filter(ModuleScore.case_id.notlike("WS/%")).delete(synchronize_session=False)
    db.query(Case).filter(~Case.id.like("WS/%")).delete(synchronize_session=False)

    for row in seed_data.COST_BASELINES:
        db.add(CostBaseline(**{**row, "mean_log_cost": math.log(row["median_lakh"])}))
    for row in seed_data.DISTRICT_QUARTERLY:
        db.add(DistrictQuarterly(**row))
    for row in seed_data.MONTHLY_TREND:
        db.add(MonthlyTrend(**row))
    for row in seed_data.STATE_STATS:
        db.add(StateStat(**{"cases_count": row["cases"], **{k: v for k, v in row.items() if k != "cases"}}))
    for row in seed_data.CATEGORY_STATS:
        db.add(CategoryStat(**row))
    for row in seed_data.MP_STATS:
        db.add(MpStat(**row))
    for row in seed_data.OFFICIALS:
        db.add(OfficialStat(**{**row, "state": STATE_NAME}))

    # (Official MoSPI allocation table is synced by _seed_mp_allocations above.)

    db.flush()
    for row in seed_data.CASES:
        mapped = {}
        for k, v in row.items():
            if k == "facts":
                continue
            mapped[CASE_FIELD_MAP.get(k, k)] = v
        case = Case(**mapped)
        case.facts = {"demo": True, **row["facts"]}
        db.add(case)
        db.flush()
        run_case_pipeline(db, case)

    db.flush()
    prev_hash = "0" * 16
    for index, seed in enumerate(seed_data.LEDGER_SEEDS):
        entry = LedgerEntry(
            index=index,
            action=seed["action"],
            category=seed["category"],
            actor=seed["actor"],
            actor_role=seed["actor_role"],
            body=seed["body"],
            timestamp=seed["timestamp"],
            case_id=seed.get("case_id"),
            prev_hash=prev_hash,
            hash="",
        )
        entry.hash = block_hash(
            prev_hash, entry.index, entry.action, entry.actor, entry.body, entry.timestamp
        )
        db.add(entry)
        prev_hash = entry.hash

    db.flush()
    for row in seed_data.OVERRIDES:
        db.add(OverrideRecord(**row))

    db.commit()
    return True