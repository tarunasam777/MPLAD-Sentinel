from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.db.models import (
    CategoryStat,
    Case,
    DistrictQuarterly,
    LedgerEntry,
    MonthlyTrend,
    MpStat,
    OfficialStat,
    StateStat,
)
from app.api.serializers import serialize_case, serialize_ledger, serialize_official

router = APIRouter(tags=["bootstrap"])


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.id.asc()).all()
    ledger = db.query(LedgerEntry).order_by(LedgerEntry.index.asc()).all()
    officials = db.query(OfficialStat).order_by(OfficialStat.high_risk_decisions.desc()).all()

    utilization = db.query(DistrictQuarterly).order_by(DistrictQuarterly.district.asc()).all()
    trend_rows = db.query(MonthlyTrend).order_by(MonthlyTrend.month.asc(), MonthlyTrend.district.asc()).all()
    states = db.query(StateStat).all()
    categories = db.query(CategoryStat).all()
    mp_stats = db.query(MpStat).all()

    pivot: list[dict] = []
    for row in trend_rows:
        bucket = next((b for b in pivot if b["month"] == row.month), None)
        if bucket is None:
            bucket = {"month": row.month}
            pivot.append(bucket)
        bucket[row.district] = row.release_pct

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
                    "breakdown": m.breakdown or [],
                }
                for m in mp_stats
            ],
        },
    }