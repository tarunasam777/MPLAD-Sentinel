from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.db.models import (
    CategoryStat,
    Case,
    DistrictQuarterly,
    LedgerEntry,
    MonthlyTrend,
    MpAllocation,
    MpStat,
    OfficialStat,
    StateStat,
)
from app.api.serializers import (
    _normalize_breakdown,
    serialize_case,
    serialize_ledger,
    serialize_official,
)

router = APIRouter(tags=["bootstrap"])


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db), response: Response = None):
    # Performance contract: bootstrap serves the interactive demo desks only.
    # The 80k+ real eSAKSHI register rows (id LIKE 'WS/%') are excluded here —
    # they are served paginated by /works and aggregated by /works/summary.
    # Serializing them made the payload ~100 MB and froze the browser; every
    # frontend action also refetches bootstrap, so the cost hit on every click.
    cases = (
        db.query(Case)
        .filter(~Case.id.like("WS/%"))
        .options(selectinload(Case.module_scores))
        .order_by(Case.id.asc())
        .all()
    )
    ledger = db.query(LedgerEntry).order_by(LedgerEntry.index.asc()).all()
    officials = db.query(OfficialStat).order_by(OfficialStat.high_risk_decisions.desc()).all()

    utilization = db.query(DistrictQuarterly).order_by(DistrictQuarterly.district.asc()).all()
    trend_rows = db.query(MonthlyTrend).order_by(MonthlyTrend.month.asc(), MonthlyTrend.district.asc()).all()
    states = db.query(StateStat).all()
    categories = db.query(CategoryStat).all()
    mp_stats = db.query(MpStat).all()
    mp_allocations = db.query(MpAllocation).order_by(MpAllocation.mp_name.asc()).all()

    # Linear pivot: one pass keyed by month instead of a nested scan over
    # every bucket per row (was O(months x districts) per request).
    buckets: dict[str, dict] = {}
    for row in trend_rows:
        bucket = buckets.get(row.month)
        if bucket is None:
            bucket = {"month": row.month}
            buckets[row.month] = bucket
        bucket[row.district] = row.release_pct
    pivot = list(buckets.values())

    # Bootstrap follows every user interaction, so stale intermediaries must
    # never serve it; the idempotent seed analytics make the payload safe to
    # refetch, but correctness wins over caching for this mutable surface.
    response.headers["Cache-Control"] = "no-store"

    return {
        "cases": [serialize_case(c) for c in cases],
        "ledger": [serialize_ledger(r) for r in ledger],
        "officials": [serialize_official(o, i) for i, o in enumerate(officials)],
        "analytics": {
            "districtUtilization": [
                {"district": d.district, "q1": d.q1, "q2": d.q2, "q3": d.q3, "q4": d.q4, "ytd": d.ytd}
                for d in utilization
            ],
            "districtTrend": pivot,
            "nationalHeatmap": [
                {"state": s.state, "utilization": s.utilization, "cases": s.cases_count}
                for s in states
            ],
            "categoryExpenditure": [
                {"category": c.category, "sanctionsCr": c.sanctions_cr, "releasesCr": c.releases_cr}
                for c in categories
            ],
            "entitlements": [
                {
                    "mpName": m.mp_name,
                    "annualCr": 5,
                    "usedCr": m.used_cr,
                    "breakdown": _normalize_breakdown(m.breakdown),
                }
                for m in mp_stats
            ],
            "mpAllocations": {
                "source": "Official MoSPI allocation table — “Allocated Limit for Hon'ble MPs”",
                "mpCount": len(mp_allocations),
                "totalCr": round(sum(a.allocated_cr or 0.0 for a in mp_allocations), 2),
                "mps": [
                    {
                        "mpName": a.mp_name,
                        "state": a.state,
                        "constituency": a.constituency,
                        "allocatedCr": a.allocated_cr,
                    }
                    for a in mp_allocations
                ],
            },
        },
    }