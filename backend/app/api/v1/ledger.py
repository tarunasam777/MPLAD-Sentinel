from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.db.models import LedgerEntry
from app.ledger import chain

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("")
def get_ledger(db: Session = Depends(get_db)):
    from app.api.serializers import serialize_ledger

    rows = db.query(LedgerEntry).order_by(LedgerEntry.index.asc()).all()
    return {"ledger": [serialize_ledger(r) for r in rows]}


@router.get("/verify")
def verify_chain(db: Session = Depends(get_db)):
    validity = chain.verify(db)
    return {
        "validity": validity,
        "tampered": [i for i, v in enumerate(validity) if not v],
        "ok": all(validity),
    }


class TamperIn(BaseModel):
    index: int
    body: str
    timestamp: str


@router.post("/tamper")
def tamper_ledger(payload: TamperIn, db: Session = Depends(get_db)):
    from app.api.serializers import serialize_ledger

    row = db.query(LedgerEntry).filter_by(index=payload.index).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Block not found")
    entry = chain.tamper(db, payload.index, payload.body, payload.timestamp)
    return {"block": serialize_ledger(entry)}


@router.post("/untamper")
def untamper_ledger(db: Session = Depends(get_db)):
    count = chain.untamper(db)
    return {"restored": count}


@router.post("/reset")
def reset_ledger(db: Session = Depends(get_db)):
    chain.reset(db)
    validity = chain.verify(db)
    return {"ok": all(validity), "blocks": len(validity)}