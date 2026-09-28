"""Official MP allocations — served from the vendored MoSPI allocation table.

``GET /api/v1/mps/allocations`` returns all Lok Sabha MPs with their
official allocated limit (₹ Cr). Read-only, no auth (public transparency
data), ordered by allocation descending so the top of the list is the
largest constituency allocation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.db.models import MpAllocation

router = APIRouter(prefix="/mps", tags=["mps"])


@router.get("/allocations")
def mp_allocations(db: Session = Depends(get_db)):
    rows = (
        db.query(MpAllocation)
        .order_by(MpAllocation.mp_name.asc())
        .all()
    )
    from sqlalchemy import func

    total_cr = db.query(func.coalesce(func.sum(MpAllocation.allocated_cr), 0.0)).scalar() or 0.0
    return {
        "source": "Official MoSPI allocation table — “Allocated Limit for Hon'ble MPs”",
        "mpCount": len(rows),
        "totalCr": round(float(total_cr), 2),
        "mps": [
            {
                "mpName": r.mp_name,
                "state": r.state,
                "constituency": r.constituency,
                "allocatedCr": r.allocated_cr,
            }
            for r in rows
        ],
    }
