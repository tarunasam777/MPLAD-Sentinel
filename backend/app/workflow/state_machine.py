from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import Case, OfficialStat, OverrideRecord
from app.fusion import fusion
from app.ledger.chain import append

ALLOWED = {"approve", "inspect", "escalate"}

TRANSITIONS = {
    "hold_active": {"approve", "inspect", "escalate"},
    "evaluating": {"inspect", "escalate"},
    "released": set(),
    "escalated": set(),
}

DECISION_LABELS = {
    "approve": "Approved",
    "inspect": "Inspection ordered",
    "escalate": "Escalated",
}

def _dm_actor_id(dm_name: str) -> str:
    """Stable per-DM actor id derived from the case's own DM name."""
    slug = re.sub(r"[^a-z0-9]+", "_", (dm_name or "").lower()).strip("_")
    return f"dm_{slug}" if slug else "dm_unknown"


def decide(db: Session, case_id: str, decision: str, note: str) -> Case:
    if decision not in ALLOWED:
        raise ValueError(f"Unknown decision '{decision}'")

    # Scoped row lock: acquired only for the final decision write, never the read path.
    case = db.query(Case).filter_by(id=case_id).with_for_update().one_or_none()
    if case is None:
        raise KeyError(f"Case '{case_id}' not found")

    if decision not in TRANSITIONS[case.status]:
        raise ValueError(f"Decision '{decision}' not allowed from status '{case.status}'")

    is_gate = bool(case.gate_fired)
    is_module_alert = fusion.module_level_hold_triggered(case.module_scores)

    if decision == "approve":
        case.status = "released"
        kind = "gate" if is_gate else "threshold"
        action_label = f'{"GATE" if is_gate else "THRESHOLD"} OVERRIDE'
        entry_category = "override"
    elif decision == "inspect":
        case.status = "hold_active"
        kind = "threshold"
        action_label = "HELD FOR INSPECTION"
        entry_category = "hold"
    else:
        case.status = "escalated"
        kind = "threshold"
        action_label = "ESCALATED TO AUDIT"
        entry_category = "escalate"

    path = list(case.path or [])
    if decision == "approve":
        path.append("override_approved")
    elif decision == "inspect":
        path.append("hold")
    else:
        path.append("escalate")
    case.path = path
    case.status_since = datetime.now(timezone.utc).strftime("%d %b %Y")

    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    body = f"{decision}: {note}".strip() if note else decision
    dm_actor = _dm_actor_id(case.dm_name)
    dm_role = f"District Magistrate \u00b7 {case.district}"
    entry = append(
        db,
        action=action_label,
        category=entry_category,
        actor=dm_actor,
        actor_role=dm_role,
        body=body,
        timestamp=timestamp,
        case_id=case.id,
        commit=False,
    )

    record = OverrideRecord(
        case_id=case.id,
        kind=kind,
        official_name=case.dm_name,
        official_district=case.district,
        action=DECISION_LABELS[decision],
        body=body,
        timestamp=timestamp,
        ledger_index=entry.index,
    )
    db.add(record)

    official = (
        db.query(OfficialStat)
        .filter_by(name=case.dm_name, district=case.district)
        .first()
    )
    if official is None:
        official = OfficialStat(
            name=case.dm_name,
            role="District Magistrate",
            district=case.district,
            state=case.state,
            high_risk_decisions=0,
            gate_overrides=0,
            threshold_overrides=0,
        )
        db.add(official)
    official.high_risk_decisions += 1
    if kind == "gate":
        official.gate_overrides += 1
    else:
        official.threshold_overrides += 1

    db.commit()
    return case