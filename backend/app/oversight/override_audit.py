from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import LedgerEntry, OfficialStat, OverrideRecord

GATE_OVERRIDE_TERMS = ["approve", "approved", "release", "released", "waive"]
THRESHOLD_TERMS = ["inspect", "investigate", "hold", "escalate"]


def official_audit_rows(db: Session) -> list[dict]:
    """Aggregated official stats with peer-relative alert flags."""
    officials = db.query(OfficialStat).order_by(OfficialStat.high_risk_decisions.desc()).all()
    total_high = sum(o.high_risk_decisions for o in officials) or 1
    total_override = sum(o.gate_overrides + o.threshold_overrides for o in officials) or 1
    peer_avg = total_override / total_high

    rows = []
    for o in officials:
        rate = (o.gate_overrides + o.threshold_overrides) / max(1, o.high_risk_decisions)
        gate_flag = o.gate_overrides >= 1
        rate_flag = rate > peer_avg * 1.5
        note = []
        if gate_flag:
            note.append("Waived a gate-level hold")
        if rate_flag:
            note.append("Override rate above peer average")
        rows.append(
            {
                "id": o.id,
                "name": o.name,
                "role": o.role,
                "district": o.district,
                "state": o.state,
                "highRiskDecisions": o.high_risk_decisions,
                "gateOverrides": o.gate_overrides,
                "thresholdOverrides": o.threshold_overrides,
                "flaggedNote": "; ".join(note) if note else None,
                "_rate": round(rate, 2),
            }
        )
    return rows


def override_records(db: Session) -> list[dict]:
    """Chronological override audit trail."""
    from app.db.models import Case

    records = db.query(OverrideRecord).order_by(OverrideRecord.timestamp.desc()).all()
    by_id = {c.id: c for c in db.query(Case).all()}
    return [
        {
            "id": r.id,
            "caseId": r.case_id,
            "caseTitle": by_id[r.case_id].title if r.case_id in by_id else r.case_id,
            "kind": r.kind,
            "officialName": r.official_name,
            "officialDistrict": r.official_district,
            "action": r.action,
            "body": r.body,
            "timestamp": r.timestamp,
            "ledgerIndex": r.ledger_index,
        }
        for r in records
    ]