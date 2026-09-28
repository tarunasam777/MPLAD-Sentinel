"""Real works register — paginated API over the seeded eSAKSHI records.

``GET /api/v1/works`` — paginated, filterable real records (state, district,
MP, category, status). ``GET /api/v1/works/summary`` — real-data aggregates
for the national view (per-state counts/completion/loose-money), computed
from the case table in one pass.

Real records are kept out of ``/bootstrap`` (which serves the interactive
demo desks) so the demo payload stays small; this API is the window into the
full real register.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.core.config import MAX_SEARCH_TERM_LENGTH
from app.core.db import get_db
from app.db.models import Case

router = APIRouter(prefix="/works", tags=["works"])

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100

# /works/summary scans 77k rows (json_extract per row); the register only
# changes on ingest/sync, so a 30 s TTL cache keeps repeat visits instant.
_SUMMARY_TTL_SECONDS = 30.0
_summary_cache: dict = {"at": 0.0, "payload": None}


def invalidate_summary_cache() -> None:
    """Called by the ingest router after a sync adds register rows."""
    _summary_cache["payload"] = None


def _real_query(db: Session):
    return db.query(Case).filter(Case.id.like("WS/%"))


@router.get("")
def list_works(
    state: str | None = None,
    district: str | None = None,
    mp: str | None = None,
    category: str | None = None,
    q: str | None = Query(default=None, max_length=MAX_SEARCH_TERM_LENGTH),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    response: Response = None,
):
    q_base = _real_query(db)
    if state:
        q_base = q_base.filter(Case.state == state)
    if district:
        q_base = q_base.filter(Case.district == district)
    if mp:
        q_base = q_base.filter(Case.mp_name == mp)
    if category:
        q_base = q_base.filter(Case.category == category)
    if q:
        q = q.strip()
        if q:
            like = f"%{q.lower()}%"
            q_base = q_base.filter(or_(func.lower(Case.title).like(like), func.lower(Case.id).like(like)))

    total = q_base.count()
    rows = (
        q_base.order_by(Case.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    works = []
    for c in rows:
        facts = c.facts or {}
        pay = facts.get("payment") or {}
        works.append(
            {
                "id": c.id,
                "title": c.title,
                "state": c.state,
                "district": c.district,
                "constituency": c.constituency,
                "mpName": c.mp_name,
                "category": c.category,
                "sanctionedLakh": c.sanctioned_amount_lakh,
                "sanctionedDate": c.sanctioned_date,
                "releasedPct": pay.get("released_pct", 0),
                "completionPct": pay.get("completion_pct", 0),
                "monthsSinceSanction": pay.get("months_since_sanction", 0),
                "statusLabel": (facts.get("portal_status") or ""),
                "riskScore": c.composite_score,
                "kind": facts.get("record_kind", "real"),
            }
        )
    response.headers["Cache-Control"] = "public, max-age=30"
    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pages": (total + page_size - 1) // page_size,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "works": works,
    }


@router.get("/summary")
def works_summary(db: Session = Depends(get_db), response: Response = None):
    """Real-data aggregates for the national view.

    Computed entirely in SQL (one grouped scan) instead of loading 77k rows
    with their JSON facts blobs into Python — the ORM version took seconds
    and allocated hundreds of MB; this returns in ~1 s cold, ~0 ms cached.
    """
    now = time.monotonic()
    if _summary_cache["payload"] is not None and now - _summary_cache["at"] < _SUMMARY_TTL_SECONDS:
        response.headers["Cache-Control"] = "private, max-age=30"
        return _summary_cache["payload"]

    released = func.json_extract(Case.facts, "$.payment.released_pct").label("released")
    completion = func.json_extract(Case.facts, "$.payment.completion_pct").label("completion")

    grouped = (
        db.query(
            Case.state,
            func.count(Case.id).label("works"),
            func.sum(Case.sanctioned_amount_lakh).label("lakh"),
            func.avg(completion).label("avg_completion"),
            func.sum(case((Case.composite_score >= 60, 1), else_=0)).label("high_risk"),
            func.sum(case((and_(completion == 0, released == 0), 1), else_=0)).label("no_payment"),
        )
        .filter(Case.id.like("WS/%"))
        .group_by(Case.state)
        .all()
    )
    total_works = 0
    total_lakh = 0.0
    no_payment = 0
    states = []
    for state, works, lakh, avg_completion, high_risk, state_no_payment in grouped:
        total_works += int(works or 0)
        total_lakh += float(lakh or 0.0)
        no_payment += int(state_no_payment or 0)
        states.append(
            {
                "state": state,
                "works": int(works or 0),
                "sanctionedCr": round(float(lakh or 0.0) / 100.0, 2),
                "avgCompletionPct": round(float(avg_completion or 0.0), 1),
                "highRisk": int(high_risk or 0),
            }
        )
    states.sort(key=lambda s: -s["works"])
    payload = {
        "totalWorks": total_works,
        "totalSanctionedCr": round(total_lakh / 100.0, 2),
        "noPaymentYet": no_payment,
        "states": states,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "eSAKSHI work-level exports (Lok Sabha), portal snapshot 2026-09-21",
    }
    _summary_cache["at"] = now
    _summary_cache["payload"] = payload
    # Private cache browser-side for the same window the server caches, so a
    # TTL refetch never races an in-progress sync invalidation.
    response.headers["Cache-Control"] = "private, max-age=30"
    return payload
