from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_actor
from app.core.db import get_db
from app.db.scale_seed import scale_case_count, seed_scale
from app.db.seed import reseed

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
def reset_demo(db: Session = Depends(get_db), _actor: dict = Depends(get_current_actor)):
    reseed(db, force=True)
    return {"ok": True, "message": "Demo state reset to seed."}


class ScaleSeedIn(BaseModel):
    count: int = Field(default=750, ge=50, le=2000)
    seed: int = 7
    force: bool = False


@router.post("/scale-seed")
def post_scale_seed(
    payload: ScaleSeedIn,
    db: Session = Depends(get_db),
    _actor: dict = Depends(get_current_actor),
):
    """Seed a national synthetic scale sample (MPL-SC-*) across 5 states.
    Excluded from the default reseed; a demo reset wipes scale rows."""
    result = seed_scale(db, count=payload.count, seed=payload.seed, force=payload.force)
    result["existing_total"] = scale_case_count(db)
    return result