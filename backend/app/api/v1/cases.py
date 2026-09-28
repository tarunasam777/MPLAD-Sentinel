from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_actor
from app.core.db import get_db
from app.workflow.state_machine import decide

router = APIRouter(prefix="/cases", tags=["cases"])


class DecideIn(BaseModel):
    decision: str
    note: str = ""


class RetitleIn(BaseModel):
    title: str


@router.get("")
def list_cases(
    district: str | None = None,
    mp: str | None = None,
    status: str | None = None,
    ids: str | None = None,
    db: Session = Depends(get_db),
):
    """List demo cases (real WS/* register rows excluded — they live on /works).

    ``ids`` accepts a comma-separated list to fetch specific cases, e.g. the
    handful the frontend just ingested via sync — the store used to pull all
    52k serialized cases to merge a dozen rows.
    """
    from app.api.serializers import serialize_case
    from app.db.models import Case

    q = db.query(Case).filter(~Case.id.like("WS/%"))
    if ids:
        wanted = [i.strip() for i in ids.split(",") if i.strip()][:200]
        q = q.filter(Case.id.in_(wanted))
    if district:
        q = q.filter(Case.district == district)
    if mp:
        q = q.filter(Case.mp_name == mp)
    if status:
        q = q.filter(Case.status == status)
    return {"cases": [serialize_case(c) for c in q.order_by(Case.id.asc()).all()]}


@router.get("/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    from app.db.models import Case
    from app.api.serializers import serialize_case

    case = db.query(Case).filter_by(id=case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return {"case": serialize_case(case)}


@router.post("/{case_id}/decide")
def post_decide(
    case_id: str,
    payload: DecideIn,
    db: Session = Depends(get_db),
    _actor: dict = Depends(get_current_actor),
):
    try:
        case = decide(db, case_id, payload.decision, payload.note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    from app.api.serializers import serialize_case

    return {"case": serialize_case(case), "message": "Decision recorded."}


@router.patch("/{case_id}")
def patch_case(
    case_id: str,
    payload: RetitleIn,
    db: Session = Depends(get_db),
    _actor: dict = Depends(get_current_actor),
):
    """Revise a work description and re-run the full detection pipeline, so
    live-computed signals (notably duplicate similarity) visibly recompute."""
    from app.db.models import Case
    from app.api.serializers import serialize_case
    from app.ingestion.pipeline import run_case_pipeline

    title = (payload.title or "").strip()
    if len(title) < 3:
        raise HTTPException(status_code=422, detail="Title must be at least 3 characters.")
    case = db.query(Case).filter_by(id=case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    facts = case.facts if isinstance(case.facts, dict) else {}
    if facts.get("record_kind") == "real":
        raise HTTPException(
            status_code=409,
            detail="Data policy: real portal records are read-only in the demo workflow — descriptions cannot be edited.",
        )
    case.title = title
    db.flush()
    run_case_pipeline(db, case)
    db.commit()
    return {"case": serialize_case(case), "message": "Title updated; scores recomputed live."}