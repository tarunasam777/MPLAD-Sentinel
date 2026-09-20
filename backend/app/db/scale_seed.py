"""National scale-sample generator.

Produces 500–1,000 synthetic works across 5+ states so the national
heatmap and public metrics can show genuine multi-state coverage in live
mode. Everything is *obviously* synthetic: ids use the ``MPL-SC-`` prefix,
overviews carry a "[Scale sample]" tag, and MP/DM names are role-style
placeholders — no real, named, identifiable person's project is ever
flagged. Rows are scored by the real pipeline (rule gates + trained ML),
and per-state ``StateStat`` aggregates are upserted so ``/bootstrap``
(and therefore the heatmap) reflects the coverage.

Deliberately excluded from the default ``reseed()`` (which stays fast and
curated for tests); a demo reset wipes scale rows.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import Case, StateStat
from app.ingestion.pipeline import ingest_and_evaluate_batch
from app.ledger.chain import append as append_ledger

SCALE_ID_PREFIX = "MPL-SC-"

SCALE_STATES: dict[str, list[str]] = {
    "Telangana": ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Sangareddy", "Mahbubnagar"],
    "Maharashtra": ["Pune", "Nagpur", "Nashik"],
    "Uttar Pradesh": ["Lucknow", "Varanasi", "Agra"],
    "West Bengal": ["Howrah", "Hooghly", "Nadia"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
}

# State-level cost multipliers applied to the Telangana cell medians.
STATE_COST_FACTOR = {
    "Telangana": 1.0,
    "Maharashtra": 1.10,
    "Uttar Pradesh": 0.90,
    "West Bengal": 0.95,
    "Tamil Nadu": 1.05,
}

CATEGORIES = [
    "Community Assets",
    "Rural Roads",
    "Drinking Water",
    "Renewable Energy",
    "Education",
    "Health & Sanitation",
    "Social Infrastructure",
]

TITLE_TEMPLATES = [
    "Construction of CC Road and Side Drain, {loc}",
    "Community Hall with Drinking Water Point, {loc}",
    "Solar Street Lighting Array, {loc}",
    "Primary School Classroom Block, {loc}",
    "Rural Water Supply Extension, {loc}",
    "Health Sub-Centre Repairs, {loc}",
    "Drainage and Culvert Works, {loc}",
]

LOCALITIES = [
    "Ward 4", "Ward 7", "Ward 12", "Station Road", "Gandhi Chowk",
    "Shivaji Nagar", "Market Area", "Bus Stand Road", "School Para",
    "Hospital Road", "Lake View Colony", "Old Town",
]


def _cell_median(category: str, state: str) -> float:
    from app.db.seed_data import COST_BASELINES

    medians = [c["median_lakh"] for c in COST_BASELINES if c["category"] == category]
    base = sum(medians) / len(medians) if medians else 16.0
    return base * STATE_COST_FACTOR.get(state, 1.0)


def build_scale_batch(count: int, seed: int = 7) -> list[dict]:
    rng = random.Random(seed)
    states = list(SCALE_STATES)
    batch: list[dict] = []
    for i in range(count):
        state = states[i % len(states)]
        district = rng.choice(SCALE_STATES[state])
        category = rng.choice(CATEGORIES)
        loc = rng.choice(LOCALITIES)
        title = rng.choice(TITLE_TEMPLATES).format(loc=f"{loc}, {district}")
        year = rng.choice([2021, 2022, 2023, 2024, 2025])
        month = rng.randint(1, 12)

        roll = rng.random()
        if roll < 0.03:
            # Cost outlier → likely cost hold.
            amount = round(_cell_median(category, state) * rng.uniform(2.0, 3.0), 1)
        elif roll < 0.08:
            amount = round(_cell_median(category, state) * rng.uniform(0.4, 0.6), 1)
        else:
            amount = round(_cell_median(category, state) * math.exp(rng.gauss(0, 0.25)), 1)

        ghost = rng.random() < 0.03
        laggard = (not ghost) and rng.random() < 0.06
        if ghost:
            released, completed, months = rng.randint(90, 100), rng.randint(5, 15), rng.randint(6, 12)
            extensions = rng.randint(1, 3)
        elif laggard:
            released, completed, months = rng.randint(5, 30), rng.randint(5, 30), rng.randint(8, 14)
            extensions = rng.randint(1, 3)
        else:
            # Healthy majority: pace near the peer band, age consistent with
            # pace, money tracking physical progress.
            released = int(min(100, max(5, 62 + rng.gauss(0, 10))))
            completed = int(min(100, max(0, released + rng.gauss(0, 6))))
            months = int(min(14, max(0, released / rng.uniform(6, 10) + rng.gauss(0, 1.5))))
            extensions = rng.choice([0, 0, 0, 0, 1])

        checks = [
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
        if rng.random() < 0.02:
            checks[0] = {
                "field": "Land ownership",
                "actual": "Private un-regularised plot",
                "required": "Public / Municipal Land",
                "rule_ref": "OP 2025–26 §4.1.3",
                "clause_text": "Works on public or municipal land.",
                "critical": True,
                "passed": False,
            }

        batch.append(
            {
                "id": f"{SCALE_ID_PREFIX}{i + 1:05d}",
                "title": title,
                "hindiTitle": "",
                "category": category,
                "state": state,
                "district": district,
                "constituency": f"{district} Central",
                "mpName": f"Sample MP ({district} Central)",
                "dmName": f"Sample DM ({district})",
                "sanctionedAmountLakh": max(1.0, amount),
                "sanctionedDate": f"{month:02d} {year}",
                "status": "evaluating",
                "statusSince": f"{month:02d} {year}",
                "overview": f"[Scale sample] {title} in {district} ({state}). Synthetic coverage row.",
                "mpPlainStatus": "Scale-sample record for national coverage demonstration.",
                "path": ["submitted", "evaluating"],
                "facts": {
                    "scale_synthetic": True,
                    "terrain": "plain",
                    "trend": {
                        "case_release_pct": released,
                        "peer_release_pct": rng.randint(50, 75),
                        "peer_sd": rng.randint(8, 14),
                    },
                    "payment": {
                        "released_pct": released,
                        "completion_pct": completed,
                        "months_since_sanction": months,
                        "extensions": int(extensions),
                    },
                    "predictive": {"factors": []},
                    "compliance": {"checks": checks},
                },
            }
        )
    return batch


def scale_case_count(db: Session) -> int:
    return db.query(Case).filter(Case.id.like(f"{SCALE_ID_PREFIX}%")).count()


def seed_scale(db: Session, count: int = 750, seed: int = 7, force: bool = False) -> dict:
    """Generate + score a national scale sample. Idempotent unless force."""
    existing = scale_case_count(db)
    if existing and not force:
        return {"seeded": False, "existing": existing}
    if force and existing:
        db.query(Case).filter(Case.id.like(f"{SCALE_ID_PREFIX}%")).delete()
        db.commit()

    batch = build_scale_batch(count, seed)
    result = ingest_and_evaluate_batch(db, batch, source="scale-synth", record_ledger=False)

    per_state: dict[str, int] = {}
    for row in batch:
        per_state[row["state"]] = per_state.get(row["state"], 0) + 1
    for state_name, n in per_state.items():
        stat = db.query(StateStat).filter_by(state=state_name).first()
        utilization = 70 + (abs(hash(state_name)) % 20)
        if stat is None:
            db.add(StateStat(state=state_name, utilization=utilization, cases_count=n))
        else:
            stat.utilization = utilization
            stat.cases_count = n

    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    append_ledger(
        db,
        action="SCALE SAMPLE SEEDED",
        category="ingestion",
        actor="system",
        actor_role="Sentinel Scale Generator",
        body=f"Seeded {result['ingested']} synthetic scale-sample works across {len(per_state)} states.",
        timestamp=timestamp,
        case_id=None,
        commit=True,
    )
    return {
        "seeded": True,
        "count": result["ingested"],
        "quarantined": result["quarantined"],
        "held": result["held"],
        "states": [{"state": s, "cases": per_state[s]} for s in sorted(per_state)],
        "note": "Synthetic [Scale sample] rows (MPL-SC-*); demo reset wipes them.",
    }
