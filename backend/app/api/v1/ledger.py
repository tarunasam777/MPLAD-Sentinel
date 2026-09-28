from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.db.models import LedgerEntry
from app.ledger import chain
from app.ledger.ledger_edits import (
    encode_body,
    edited_indices,
    record_edit,
    restore_edited,
    split_body,
)

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("")
def get_ledger(db: Session = Depends(get_db)):
    from app.api.serializers import serialize_ledger

    rows = db.query(LedgerEntry).order_by(LedgerEntry.index.asc()).all()
    return {"ledger": [serialize_ledger(r) for r in rows]}


@router.get("/verify")
def verify_chain(db: Session = Depends(get_db)):
    """Chain-integrity check - the same function the "Simulate Database
    Tampering" button uses. Manual field edits surface here naturally: the
    recomputed hash of an edited block no longer matches its child's stored
    prevHash, and ``editedBlocks`` names which blocks were hand-edited so
    the UI can badge them with the same DB-TAMPERED treatment."""
    validity = chain.verify(db)
    return {
        "validity": validity,
        "tampered": [i for i, v in enumerate(validity) if not v],
        "editedBlocks": edited_indices(db),
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


class TamperFieldsIn(BaseModel):
    """Manual inline edit of a sealed historical block (amount/status).

    This is the "attacker with DB access" path, identical in detection
    semantics to the simulate button: the stored record is rewritten directly
    and only that block's own hash is re-signed (the attacker re-seals to
    hide the edit). No child prevHash is touched, so the next /verify
    surfaces the break naturally."""

    index: int
    amount: float = Field(ge=0)
    status: str = Field(min_length=2, max_length=48)


@router.post("/tamper-fields")
def tamper_fields(payload: TamperFieldsIn, db: Session = Depends(get_db)):
    from app.api.serializers import serialize_ledger

    row = db.query(LedgerEntry).filter_by(index=payload.index).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Block not found")
    if payload.index == 0:
        raise HTTPException(status_code=400, detail="Genesis block cannot be edited")

    head, _old_amount, _old_status = split_body(row.body)
    # Idempotent first-edit snapshot (same scheme as chain.tamper) so
    # repeated edits never stack corruption, and Restore reverts fully.
    record_edit(db, payload.index, row.body, row.timestamp, row.hash)

    new_body = encode_body(head, payload.amount, payload.status)
    entry = chain.tamper(db, payload.index, new_body, row.timestamp)
    return {"block": serialize_ledger(entry)}


@router.post("/untamper")
def untamper_ledger(db: Session = Depends(get_db)):
    """Restore Integrity / Re-seal - reverts BOTH tamper paths: the simulate
    button's snapshots and the manual field-edit snapshots, then the chain
    verifies clean again."""
    count = chain.untamper(db) + restore_edited(db)
    return {"restored": count}


@router.post("/reset")
def reset_ledger(db: Session = Depends(get_db)):
    chain.reset(db)
    validity = chain.verify(db)
    return {"ok": all(validity), "blocks": len(validity)}
