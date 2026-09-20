from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.oversight import override_audit

router = APIRouter(tags=["oversight"])


@router.get("/override-audit")
def get_override_audit(db: Session = Depends(get_db)):
    return {
        "officials": override_audit.official_audit_rows(db),
        "records": override_audit.override_records(db),
    }