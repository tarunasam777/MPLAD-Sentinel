"""National scale-sample generator — anchored to the official allocation table.

Produces 500–2,000 synthetic works spread across the real Lok Sabha
constituencies published in the vendored MoSPI “Allocated Limit for
Hon'ble MPs” table (all 543 MPs). Each work is attributed to a real MP's
constituency, and its sanctioned amount is drawn as a plausible fraction
of that constituency's **official allocation limit** — so the national
coverage demo is anchored to real money, not invented amounts.

Data policy (enforced by ``tests/test_policy_mp_flags.py``): the *money and
geography* are the published, checkable ones — real constituency, real
state, real allocation limit — but the *people* are demonstrably fictional.
Scale rows carry ``DEMO_OFFICIAL_NAME`` as the MP/DM of record (a name that
matches no row of the official allocation table), the overview tag
"[Scale sample]" states the work is not an actual scheme record, and ids
use the ``MPL-SC-`` prefix. This keeps the real-MP anchor for allocation
transparency while guaranteeing no real person's name can ever sit on a
flagged, held or escalated row produced by this generator.

Deliberately excluded from the default ``reseed()`` (which stays fast and
curated for tests); a demo reset wipes scale rows.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.data.mp_loader import load_allocations
from app.db.models import Case, StateStat
from app.ingestion.pipeline import ingest_and_evaluate_batch
from app.ledger.chain import append as append_ledger

SCALE_ID_PREFIX = "MPL-SC-"

# Demo officials-of-record for scale-sample rows. Deliberately fictional:
# ``mp_loader.find_official_match(DEMO_OFFICIAL_NAME)`` is None (regression-
# tested), so no real MP's name can be attached to a scale-sample row — the
# constituency/state/allocation anchors stay real and checkable instead.
DEMO_OFFICIAL_NAME = "Demo MP (Scale Sample)"
DEMO_DM_NAME = "Demo DM (Scale Sample)"

# State-level cost multipliers applied to the allocation-derived amounts
# (mild regional variation on top of the real allocation anchor).
STATE_COST_FACTOR: dict[str, float] = {
    "Telangana": 1.0,
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


def _constituency_works() -> list[dict]:
    """Official allocation rows with a published amount (the draw pool)."""
    rows, _totals = load_allocations()
    return [r for r in rows if r["allocatedCr"] is not None]


def build_scale_batch(count: int, seed: int = 7) -> list[dict]:
    rng = random.Random(seed)
    pool = _constituency_works()
    batch: list[dict] = []
    for i in range(count):
        # Round-robin over the real constituency pool: every seeded batch
        # spans all funded constituencies across 30+ states/UTs.
        row = pool[i % len(pool)]
        state = row["state"]
        constituency = row["constituency"]
        alloc_cr = row["allocatedCr"]
        district = constituency.title()  # constituency is the geo key in the official table
        category = rng.choice(CATEGORIES)
        loc = rng.choice(LOCALITIES)
        title = rng.choice(TITLE_TEMPLATES).format(loc=f"{loc}, {constituency.title()}")
        year = rng.choice([2021, 2022, 2023, 2024, 2025])
        month = rng.randint(1, 12)

        # Works are drawn as a plausible fraction of the constituency's
        # real allocated limit — real money anchor, not an invented amount.
        roll = rng.random()
        if roll < 0.03:
            # Cost outlier → likely cost hold.
            share = rng.uniform(0.22, 0.30)
        elif roll < 0.08:
            share = rng.uniform(0.02, 0.05)
        else:
            share = rng.uniform(0.05, 0.18)
        amount = max(1.0, round(alloc_cr * 100.0 * share, 1))

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
                "constituency": constituency,
                "mpName": DEMO_OFFICIAL_NAME,
                "dmName": DEMO_DM_NAME,
                "sanctionedAmountLakh": max(1.0, amount),
                "sanctionedDate": f"{month:02d} {year}",
                "status": "evaluating",
                "statusSince": f"{month:02d} {year}",
                "overview": f"[Scale sample] {title} in {constituency.title()} ({state}). Synthetic coverage work anchored to the constituency's official allocation of ₹{alloc_cr:.2f} Cr — the work and its officials of record are fictional, not an actual scheme record.",
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

    # Aggregate real evaluation output per state: work count + mean release
    # pace (from the evaluated facts, not a hash-derived fake).
    per_state: dict[str, dict] = {}
    for row in batch:
        agg = per_state.setdefault(row["state"], {"cases": 0, "release_sum": 0.0})
        agg["cases"] += 1
        agg["release_sum"] += float(row["facts"]["payment"]["released_pct"])
    for state_name, agg in per_state.items():
        utilization = int(round(agg["release_sum"] / agg["cases"]))
        stat = db.query(StateStat).filter_by(state=state_name).first()
        if stat is None:
            db.add(StateStat(state=state_name, utilization=utilization, cases_count=agg["cases"]))
        else:
            stat.utilization = utilization
            stat.cases_count = agg["cases"]

    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    append_ledger(
        db,
        action="SCALE SAMPLE SEEDED",
        category="ingestion",
        actor="system",
        actor_role="Sentinel Scale Generator",
        body=f"Seeded {result['ingested']} synthetic scale-sample works across {len(per_state)} states (fictional officials of record; real constituency/allocation anchors).",
        timestamp=timestamp,
        case_id=None,
        commit=True,
    )
    return {
        "seeded": True,
        "count": result["ingested"],
        "quarantined": result["quarantined"],
        "held": result["held"],
        "states": [{"state": s, "cases": per_state[s]["cases"]} for s in sorted(per_state)],
        "note": "Synthetic [Scale sample] rows (MPL-SC-*); demo reset wipes them.",
    }
