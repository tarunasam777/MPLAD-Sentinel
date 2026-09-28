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
    # Terminal/entry states outside the decision loop: no transitions, but
    # a decision must answer 409 cleanly, not crash with KeyError (bug:
    # 'submitted'/'auto_cleared'/'rejected' rows 500'd the decide endpoint).
    "submitted": set(),
    "auto_cleared": set(),
    "rejected": set(),
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

    if decision not in TRANSITIONS.get(case.status, set()):
        raise ValueError(f"Decision '{decision}' not allowed from status '{case.status}'")

    is_gate = bool(case.gate_fired)
    is_module_alert = fusion.module_level_hold_triggered(case.module_scores)

    # Data policy enforcement: a held/escalated case must never carry a real,
    # named MP or DM. Demonstration records are tagged ``facts["demo"]`` at
    # ingestion/seed time, and held rows get a fictional official of record.
    # Real portal records (``record_kind: "real"``, untagged) sit outside the
    # demo workflow entirely — no hold, override, or escalation may be
    # recorded against them; decisions on real rows belong to the real
    # oversight process.
    facts = case.facts if isinstance(case.facts, dict) else {}
    if facts.get("record_kind") == "real":
        raise ValueError(
            "Data policy: real portal records are read-only in the demo "
            "workflow — holds, overrides, and escalations apply to "
            "demonstration records only."
        )
    # Single policy rule (was: only hold_active releases were guarded, so an
    # untagged legacy row could be escalated/approved from 'evaluating'):
    # every decision is a demo-workflow action and requires a demo-tagged
    # record. Real rows are already rejected above.
    if not facts.get("demo"):
        raise ValueError(
            "Data policy: workflow decisions are only permitted for "
            "demonstration records with fictional officials of record."
        )

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

    # Path values must be CaseState labels ('hold_active', not 'hold' — the
    # old string violated the frontend's CaseState[] contract) and must not
    # duplicate on repeated inspect calls.
    path = list(case.path or [])
    next_state = {
        "approve": "override_approved",
        "inspect": "hold_active",
        "escalate": "escalated",
    }[decision]
    if next_state not in path:
        path.append(next_state)
    case.path = path
    case.status_since = datetime.now(timezone.utc).strftime("%d %b %Y")

    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    body = f"{decision}: {note}".strip() if note else decision
    if is_module_alert:
        # Persistent, human-readable metadata: a decision recorded against a
        # case with a single module at >= 75 severity is signed into the
        # ledger body so the override audit can see the alert context that
        # triggered the human review (previously computed and dropped).
        body = f"{body} · module-level alert: single-module severity ≥ 75"
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