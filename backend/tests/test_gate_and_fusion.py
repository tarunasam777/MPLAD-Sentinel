import pytest
from app.db.models import Case, ModuleScore
from app.ingestion.pipeline import run_case_pipeline, ingest_and_evaluate_batch
from app.fusion import fusion, gate
from app.api.serializers import serialize_case_detail

def test_gate_override_proof(test_db):
    """Test Case 1 (Gate Override Proof): Assert that a proposal with low composite risk

    (Score: 22/100) but a land compliance violation is forced directly to HOLD_ACTIVE by Module 9.
    """
    case_payload = {
        "id": "MPL-TEST-GATE-01",
        "title": "Community Meeting Shed on Private Layout",
        "category": "Community Assets",
        "state": "Telangana",
        "district": "Rangareddy",
        "constituency": "Chevella",
        "mp_name": "Test MP",
        "dm_name": "Test DM",
        "sanctioned_amount_lakh": 12.0,
        "facts": {
            "trend": {"case_release_pct": 80, "peer_release_pct": 80, "peer_sd": 5},
            "payment": {"released_pct": 0, "completion_pct": 0, "months_since_sanction": 1},
            "predictive": {"stall_pct": 5, "factors": []},
            "compliance": {
                "checks": [
                    {
                        "field": "Land ownership",
                        "actual": "Private Layout Society",
                        "required": "Public / Municipal Land",
                        "rule_ref": "OP 2025–26 §4.1.3",
                        "clause_text": "Works on public or municipal land only.",
                        "critical": True,
                        "passed": False,
                    }
                ]
            }
        }
    }

    res = ingest_and_evaluate_batch(test_db, [case_payload], record_ledger=True)
    assert res["ingested"] == 1
    assert res["held"] == 1

    case = test_db.query(Case).filter_by(id="MPL-TEST-GATE-01").one()
    assert case.gate_fired is True
    assert case.gate_held_independent is True
    assert case.status == "hold_active"
    assert "mandatory compliance guardrail" in case.gate_rule.lower()

    # Verify that even if composite score is low/moderate, gate forces HOLD
    assert case.composite_score < 60  # Gate hold overrides low composite score


def test_explainability_dual_branch(test_db):
    """Test Case 2 (Explainability Dual Branch): Assert that gate holds generate a gate-path narrative,

    while fusion threshold holds produce a feature attribution breakdown.
    """
    # 1. Gate Hold Case (MPL-2025-1007: Private Land Tenure)
    gate_case = test_db.query(Case).filter_by(id="MPL-2025-1007").one()
    serialized_gate = serialize_case_detail(gate_case)

    assert serialized_gate["gate"]["fired"] is True
    assert serialized_gate["gate"]["heldIndependent"] is True
    assert "compliance" in serialized_gate["gate"]["rule"].lower() or "guardrail" in serialized_gate["gate"]["rule"].lower()
    assert len(serialized_gate["narrative"]) > 0
    assert any("gate" in step.lower() or "hold" in step.lower() for step in serialized_gate["path"])

    # 2. Threshold/Duplicate Hold Case (MPL-2025-1001: Duplicate Overlap)
    threshold_case = test_db.query(Case).filter_by(id="MPL-2025-1001").one()
    serialized_thresh = serialize_case_detail(threshold_case)

    # Attribution Breakdown exists for threshold-driven scoring
    attributions = serialized_thresh.get("attributions", [])
    assert len(attributions) > 0

    # Ensure duplicate module attribution is prominent
    dup_attr = next((a for a in attributions if a["module"] == "duplicate"), None)
    assert dup_attr is not None
    assert dup_attr["attribution"] > 0
    assert dup_attr["pct"] > 0
