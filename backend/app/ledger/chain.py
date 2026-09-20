from __future__ import annotations

import hashlib

from sqlalchemy.orm import Session

from app.db.models import LedgerEntry, MetaKey

GENESIS_PREV = "0000000000000000"
ACTOR_LABELS = {
    "officials_delhi": "Officials, MPLADS Division",
    "wez_delhi": "OCMS (PFMS) integration",
    "state_authority": "State Nodal Authority",
    "system": "Sentinel Engine",
    "nodal_auth_delhi": "MPLADS Nodal Authority",
}
ACTOR_ROLES = {
    "officials_delhi": "MPLADS Division Officials",
    "wez_delhi": "OCMS (PFMS) integration",
    "state_authority": "State Nodal Authority",
    "system": "Sentinel Engine",
    "nodal_auth_delhi": "MPLADS Nodal Authority",
}


def block_hash(prev_hash: str, index: int, action: str, actor: str, body: str, timestamp: str) -> str:
    payload = f"{prev_hash}|{index}|{action}|{actor}|{body}|{timestamp}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _last_block(db: Session) -> LedgerEntry | None:
    return db.query(LedgerEntry).order_by(LedgerEntry.index.desc()).first()


def append(
    db: Session,
    action: str,
    category: str,
    actor: str,
    actor_role: str,
    body: str,
    timestamp: str,
    case_id: str | None = None,
    commit: bool = True,
) -> LedgerEntry:
    prev = _last_block(db)
    prev_hash = prev.hash if prev else GENESIS_PREV
    index = (prev.index + 1) if prev else 0
    entry = LedgerEntry(
        index=index,
        action=action,
        category=category,
        actor=actor,
        actor_role=actor_role,
        body=body,
        timestamp=timestamp,
        case_id=case_id,
        prev_hash=prev_hash,
        hash="",
    )
    entry.hash = block_hash(prev_hash, index, action, actor, body, timestamp)
    db.add(entry)
    if commit:
        db.commit()
    return entry


def verify(db: Session) -> list[bool]:
    rows = db.query(LedgerEntry).order_by(LedgerEntry.index.asc()).all()
    validity: list[bool] = []
    expected_prev = GENESIS_PREV
    for row in rows:
        expected = block_hash(
            expected_prev, row.index, row.action, row.actor, row.body, row.timestamp
        )
        valid = row.prev_hash == expected_prev and row.hash == expected
        validity.append(valid)
        expected_prev = row.hash if valid else expected_prev
    return validity


def tamper(db: Session, index: int, body: str, timestamp: str) -> LedgerEntry:
    row = db.query(LedgerEntry).filter_by(index=index).one()
    meta = db.query(MetaKey).filter_by(key=f"tamper_original_{index}").first()
    if meta is None:
        db.add(
            MetaKey(
                key=f"tamper_original_{index}",
                value={
                    "body": row.body,
                    "timestamp": row.timestamp,
                    "hash": row.hash,
                },
            )
        )
    row.body = body
    row.timestamp = timestamp
    row.hash = block_hash(row.prev_hash, row.index, row.action, row.actor, row.body, row.timestamp)
    db.commit()
    return row


def untamper(db: Session) -> int:
    metas = db.query(MetaKey).filter(MetaKey.key.like("tamper_original_%")).all()
    count = 0
    for meta in metas:
        index = int(meta.key.split("_")[-1])
        row = db.query(LedgerEntry).filter_by(index=index).first()
        if row is None:
            continue
        row.body = meta.value["body"]
        row.timestamp = meta.value["timestamp"]
        row.hash = meta.value["hash"]
        db.delete(meta)
        count += 1
    db.commit()
    return count


def reset(db: Session) -> None:
    db.query(LedgerEntry).delete()
    db.query(MetaKey).filter(MetaKey.key.like("tamper_original_%")).delete()
    db.commit()