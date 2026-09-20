from __future__ import annotations

import math

from sqlalchemy.orm import Session

from app.core.config import STATE_NAME
from app.db import seed_data
from app.db.models import (
    Case,
    CategoryStat,
    CostBaseline,
    DistrictQuarterly,
    LedgerEntry,
    ModuleScore,
    MonthlyTrend,
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


def reseed(db: Session, force: bool = False) -> bool:
    """Idempotent seed: clears the demo tables and re-derives all module scores,
    composites and gates from the stored facts."""
    if not force and db.query(Case).count():
        return False

    db.query(OverrideRecord).delete()
    db.query(ModuleScore).delete()
    db.query(LedgerEntry).delete()
    db.query(MpStat).delete()
    db.query(CategoryStat).delete()
    db.query(StateStat).delete()
    db.query(MonthlyTrend).delete()
    db.query(DistrictQuarterly).delete()
    db.query(CostBaseline).delete()
    db.query(OfficialStat).delete()
    db.query(Case).delete()

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

    db.flush()
    for row in seed_data.CASES:
        mapped = {}
        for k, v in row.items():
            if k == "facts":
                continue
            mapped[CASE_FIELD_MAP.get(k, k)] = v
        case = Case(**mapped)
        case.facts = row["facts"]
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