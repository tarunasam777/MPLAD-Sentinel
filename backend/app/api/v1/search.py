"""Universal search — one endpoint that reaches every part of the program.

``GET /api/v1/search?q=<term>&limit=<per-group>`` returns grouped results so
the header search can deep-link into any surface:

  * works      — the 77k-row real eSAKSHI register (id, title, MP, district,
                 constituency, state, category)
  * cases      — interactive demo cases (id, title, MP, district, status)
  * mps        — MP names carrying official MoSPI allocations
  * officials  — district/nodal officials in the override-audit register
  * ledger     — sealed SHA-256 blocks (actor, role, action, body, case id)
  * states     — state rollups

Everything is matched case-insensitively (SQL LIKE). Results are capped per
group (default 6, max 25) and every hit carries a ``href`` that routes the
user straight to the right page with the right query string, so search never
dead-ends. The ledger group is limited to the newest blocks (the chain is
append-only and the interesting ones are recent).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import MAX_SEARCH_TERM_LENGTH
from app.core.db import get_db
from app.db.models import Case, LedgerEntry, MpStat, OfficialStat, StateStat

router = APIRouter(tags=["search"])

DEFAULT_LIMIT = 6
MAX_LIMIT = 25

# The ledger table grows forever; only the newest tail is worth searching.
_LEDGER_SCAN = 400


def _like(term: str) -> str:
    return f"%{term.lower()}%"


@router.get("/search")
def universal_search(
    q: str = Query(min_length=1, max_length=MAX_SEARCH_TERM_LENGTH),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
):
    term = q.strip()

    # ── Works (real eSAKSHI register) ────────────────────────────────
    # Exact/substring work-id hit is the overwhelmingly common query (the
    # header search deep-links every result into /works?id…) — resolve it as a
    # bounded indexed lookup instead of a leading-wildcard scan of 77k rows.
    exact = (
        db.query(Case)
        .filter(Case.id == term)
        .first()
    )
    if exact is not None:
        works = [
            {
                "id": exact.id,
                "title": exact.title,
                "mpName": exact.mp_name,
                "district": exact.district,
                "state": exact.state,
                "category": exact.category,
                "sanctionedLakh": exact.sanctioned_amount_lakh,
                "riskScore": exact.composite_score,
                "href": f"/works?q={exact.id}",
            }
        ]
        works_total = 1
    else:
        like = _like(term)
        works_q = db.query(Case).filter(
            Case.id.like("WS/%"),
            or_(
                func.lower(Case.id).like(like),
                func.lower(Case.title).like(like),
                func.lower(Case.mp_name).like(like),
                func.lower(Case.district).like(like),
                func.lower(Case.constituency).like(like),
                func.lower(Case.state).like(like),
                func.lower(Case.category).like(like),
            ),
        )
        works_total = works_q.count()
        works = [
            {
                "id": c.id,
                "title": c.title,
                "mpName": c.mp_name,
                "district": c.district,
                "state": c.state,
                "category": c.category,
                "sanctionedLakh": c.sanctioned_amount_lakh,
                "riskScore": c.composite_score,
                "href": f"/works?q={c.id}",
            }
            for c in works_q.order_by(Case.sanctioned_amount_lakh.desc()).limit(limit).all()
        ]

    # ── Demo cases (interactive desks) ───────────────────────────────
    like = _like(term)
    cases_q = db.query(Case).filter(
        Case.id.like("MPL-%"),
        or_(
            func.lower(Case.id).like(like),
            func.lower(Case.title).like(like),
            func.lower(Case.mp_name).like(like),
            func.lower(Case.district).like(like),
            func.lower(Case.status).like(like),
        ),
    )
    cases_total = cases_q.count()
    cases = [
        {
            "id": c.id,
            "title": c.title,
            "mpName": c.mp_name,
            "district": c.district,
            "status": c.status,
            "riskScore": c.composite_score,
            "href": f"/cases/{c.id}",
        }
        for c in cases_q.order_by(Case.composite_score.desc()).limit(limit).all()
    ]

    # ── MPs (official MoSPI allocation table) ────────────────────────
    mp_rows = (
        db.query(MpStat)
        .filter(func.lower(MpStat.mp_name).like(like))
        .order_by(MpStat.mp_name.asc())
        .limit(limit)
        .all()
    )
    mps = [
        {
            "name": m.mp_name,
            "usedCr": round(m.used_cr, 2),
            "href": f"/dashboard/mp?mp={m.mp_name}",
        }
        for m in mp_rows
    ]

    # ── Officials (override-audit register) ──────────────────────────
    off_rows = (
        db.query(OfficialStat)
        .filter(
            or_(
                func.lower(OfficialStat.name).like(like),
                func.lower(OfficialStat.role).like(like),
                func.lower(OfficialStat.district).like(like),
            )
        )
        .limit(limit)
        .all()
    )
    officials = [
        {
            "name": o.name,
            "role": o.role,
            "district": o.district,
            "href": "/override-audit",
        }
        for o in off_rows
    ]

    # ── Ledger blocks (newest tail only; Python filter over ≤400 rows —
    #    simpler and dialect-portable vs SQL over a self-join subquery) ──
    tail = (
        db.query(LedgerEntry)
        .order_by(LedgerEntry.index.desc())
        .limit(_LEDGER_SCAN)
        .all()
    )
    ledger = [
        {
            "index": lb.index,
            "action": lb.action,
            "actor": lb.actor,
            "body": lb.body,
            "href": f"/ledger?q={lb.index}",
        }
        for lb in tail
        if like.strip("%")
        in " ".join(
            [lb.actor, lb.actor_role, lb.action, lb.body, lb.case_id or ""]
        ).lower()
    ][:limit]

    # ── States (rollups) ─────────────────────────────────────────────
    state_rows = (
        db.query(StateStat)
        .filter(func.lower(StateStat.state).like(like))
        .limit(limit)
        .all()
    )
    states = [
        {
            "name": s.state,
            "href": f"/works?state={s.state}",
        }
        for s in state_rows
    ]

    groups = [
        {"key": "works", "label": "Works", "total": works_total, "results": works},
        {"key": "cases", "label": "Demo cases", "total": cases_total, "results": cases},
        {"key": "mps", "label": "MPs", "total": len(mps), "results": mps},
        {"key": "officials", "label": "Officials", "total": len(officials), "results": officials},
        {"key": "ledger", "label": "Ledger blocks", "total": len(ledger), "results": ledger},
        {"key": "states", "label": "States", "total": len(states), "results": states},
    ]
    return {
        "query": q.strip(),
        "groups": [g for g in groups if g["total"] > 0],
    }
