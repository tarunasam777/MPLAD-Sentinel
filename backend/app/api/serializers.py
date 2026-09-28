from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import Case, LedgerEntry, OfficialStat


def _normalize_breakdown(value: object) -> list[dict]:
    """MpStat.breakdown arrives in two shapes across seed data: a legacy dict
    of {category: lakh} or the contracted [{category, lakh}, ...] array.
    Always emit the array shape the frontend expects — the dict form made
    ``breakdown.map`` throw a runtime TypeError on the MP dashboard."""
    if isinstance(value, dict):
        return [
            {"category": str(cat), "lakh": float(lakh)}
            for cat, lakh in value.items()
        ]
    if isinstance(value, list):
        return [b for b in value if isinstance(b, dict) and "category" in b and "lakh" in b]
    return []


def serialize_case(case: Case) -> dict:
    modules = sorted(
        case.module_scores,
        key=lambda m: [
            "trend", "duplicate", "cost", "compliance", "payment", "predictive", "photo",
        ].index(m.module) if m.module in [
            "trend", "duplicate", "cost", "compliance", "payment", "predictive", "photo",
        ] else 99,
    )
    return {
        "id": case.id,
        "title": case.title,
        "hindiTitle": case.hindi_title,
        "category": case.category,
        "state": case.state,
        "district": case.district,
        "constituency": case.constituency,
        "mpName": case.mp_name,
        "dmName": case.dm_name,
        "sanctionedAmountLakh": case.sanctioned_amount_lakh,
        "sanctionedDate": case.sanctioned_date,
        "status": case.status,
        "statusSince": case.status_since,
        "overview": case.overview,
        "mpPlainStatus": case.mp_plain_status,
        "compositeScore": case.composite_score,
        "gate": {
            "fired": case.gate_fired,
            "rule": case.gate_rule,
            "detail": case.gate_detail,
            "heldIndependent": case.gate_held_independent,
        },
        "moduleBreakdown": [
            {
                "module": m.module,
                "subScore": m.sub_score,
                "description": m.description,
                "triggered": m.triggered,
                "evidence": m.evidence,
            }
            for m in modules
        ],
        "path": case.path or [],
    }


def serialize_case_detail(case: Case) -> dict:
    from app.fusion.fusion import attribution_percentages

    base = serialize_case(case)
    attributions = attribution_percentages(case)
    base["attributions"] = attributions
    narrative = []
    if case.gate_fired:
        narrative.append(f"Gate circuit breaker fired: {case.gate_rule or 'Compliance violation'}.")
    elif case.composite_score >= 60:
        top_contrib = sorted(attributions, key=lambda x: x["attribution"], reverse=True)
        if top_contrib:
            narrative.append(
                f"Composite score {case.composite_score}/100 primarily driven by "
                f"{top_contrib[0]['label']} ({top_contrib[0]['attribution']} pts)."
            )
    else:
        narrative.append("Proposal scored within normal operational risk parameters.")
    base["narrative"] = narrative
    return base


def serialize_ledger(row: LedgerEntry) -> dict:
    return {
        "index": row.index,
        "action": row.action,
        "category": row.category,
        "actor": row.actor,
        "actorRole": row.actor_role,
        "body": row.body,
        "timestamp": row.timestamp,
        "caseId": row.case_id,
        "hash": row.hash,
        "prevHash": row.prev_hash,
    }


def serialize_official(o: OfficialStat, index: int) -> dict:
    return {
        "id": f"off-{index + 1}",
        "name": o.name,
        "role": o.role,
        "district": o.district,
        "state": o.state,
        "highRiskDecisions": o.high_risk_decisions,
        "gateOverrides": o.gate_overrides,
        "thresholdOverrides": o.threshold_overrides,
        "flaggedNote": o.flagged_note,
    }


def serialized_case_list(db: Session, district: str | None = None, mp: str | None = None, status: str | None = None) -> list[dict]:
    q = db.query(Case)
    if district:
        q = q.filter(Case.district == district)
    if mp:
        q = q.filter(Case.mp_name == mp)
    if status:
        q = q.filter(Case.status == status)
    return [serialize_case(c) for c in q.order_by(Case.id.asc()).all()]