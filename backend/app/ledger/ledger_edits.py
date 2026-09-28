"""Field-level ledger edit tracking (manual tamper path).

When an officer edits the amount or status of an already-sealed ledger block
inline, the frontend encodes both into the block's body so the SHA-256 hash
formula (`prevHash|index|action|actor|body|time`) stays unchanged across
mock and live modes. The backend then stores the row exactly like the
"Simulate Database Tampering" button does: original snapshot kept in a
``ledger_fields_edit_{index}`` MetaKey, the new body written directly, and
ONLY that block's own ``hash`` re-signed — no other block's ``prevHash``
pointer is touched, so the next ``chain.verify()`` flags the child block
naturally (recomputed hash of the edited block ≠ child's stored prevHash).

Body encoding scheme
--------------------
The encoded tail is ALWAYS the last two `` ₹``-separated tokens:
``{description} ₹{amount} ₹{status}``. Descriptions themselves may contain
``₹`` (e.g. "Released ₹14.20 for stage 2 …"), so parsing scans from the END
of the string — prose is never rewritten, only the two tail tokens change.
A body that doesn't end in exactly two such tokens is a plain/legacy body.

Snapshots are restored by ``restore_edited`` (used by the untamper endpoint
so "Restore Integrity / Re-seal" reverts both tamper paths) and enumerated
by ``edited_indices`` (exposed on /ledger/verify so the UI can badge the
edited block with the same DB-TAMPERED treatment).
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.db.models import LedgerEntry, MetaKey

EDIT_KEY_PREFIX = "ledger_fields_edit_"
_SEP = " ₹"


def format_amount(amount: float) -> str:
    """Compact amount text: 14.20 → "14.2", 45.0 → "45" (no sci notation)."""
    text = f"{float(amount):.2f}".rstrip("0").rstrip(".")
    return text or "0"


def sanitize_status(status: str) -> str:
    """Status text must never contain the field separator or break parsing."""
    return re.sub(r"\s+", " ", re.sub(r"[₹|]+", "", status)).strip()


def split_body(body: str) -> tuple[str, str | None, str | None]:
    """Split into (description, amount_str, status) if the body carries the
    field-encoded tail; legacy/plain bodies → (body, None, None)."""
    status_pos = body.rfind(_SEP)
    if status_pos == -1:
        return body, None, None
    amount_pos = body.rfind(_SEP, 0, status_pos)
    if amount_pos == -1:
        return body, None, None
    amount_str = body[amount_pos + len(_SEP) : status_pos]
    status = body[status_pos + len(_SEP) :]
    if not amount_str or not status or any(ch.isspace() for ch in amount_str):
        # Doesn't look like an encoded tail — treat as plain prose.
        return body, None, None
    try:
        float(amount_str)
    except ValueError:
        return body, None, None
    return body[:amount_pos], amount_str, status


def encode_body(head: str, amount: float, status: str) -> str:
    """Rebuild a body with the given amount/status tail (description kept)."""
    return f"{head}{_SEP}{format_amount(amount)}{_SEP}{sanitize_status(status)}"


def snapshot_key(index: int) -> str:
    return f"{EDIT_KEY_PREFIX}{index}"


def record_edit(
    db: Session, index: int, original_body: str, original_timestamp: str, original_hash: str
) -> None:
    """Idempotent first-tamper snapshot: keep the pre-edit values exactly once,
    so repeated edits can never stack corruption on top of corruption."""
    if db.query(MetaKey).filter_by(key=snapshot_key(index)).first() is None:
        db.add(
            MetaKey(
                key=snapshot_key(index),
                value={
                    "body": original_body,
                    "timestamp": original_timestamp,
                    "hash": original_hash,
                },
            )
        )


def edited_indices(db: Session) -> list[int]:
    metas = db.query(MetaKey).filter(MetaKey.key.like(f"{EDIT_KEY_PREFIX}%")).all()
    out: list[int] = []
    for meta in metas:
        try:
            out.append(int(meta.key[len(EDIT_KEY_PREFIX) :]))
        except ValueError:
            continue
    return sorted(out)


def restore_edited(db: Session) -> int:
    """Restore snapshot bodies/hashes for manually edited blocks (the hash in
    the snapshot is the original pre-edit seal, so no re-hash is needed and
    unrelated blocks are never touched)."""
    metas = db.query(MetaKey).filter(MetaKey.key.like(f"{EDIT_KEY_PREFIX}%")).all()
    restored = 0
    for meta in metas:
        try:
            index = int(meta.key[len(EDIT_KEY_PREFIX) :])
        except ValueError:
            continue
        row = db.query(LedgerEntry).filter_by(index=index).first()
        if row is None:
            db.delete(meta)
            continue
        value = meta.value or {}
        if "body" in value:
            row.body = value["body"]
        if "timestamp" in value:
            row.timestamp = value["timestamp"]
        if "hash" in value:
            row.hash = value["hash"]
        db.delete(meta)
        restored += 1
    db.commit()
    return restored


__all__ = [
    "EDIT_KEY_PREFIX",
    "encode_body",
    "edited_indices",
    "format_amount",
    "record_edit",
    "restore_edited",
    "sanitize_status",
    "snapshot_key",
    "split_body",
]
