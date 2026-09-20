from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session
from thefuzz import fuzz

from app.db.models import Case, MetaKey

logger = logging.getLogger(__name__)

REGISTERED_PFMS_VENDORS = [
    {"name": "Telangana State Medical Services & Infrastructure Corp", "gstin": "36AABCT1234F1Z1"},
    {"name": "Panchayati Raj Engineering Division, Hyderabad", "gstin": "36AAAGP5678K1Z2"},
    {"name": "Roads and Buildings Department, Rangareddy", "gstin": "36AAAGR9012M1Z3"},
    {"name": "Greater Hyderabad Municipal Corporation (GHMC)", "gstin": "36AAAGH3456N1Z4"},
    {"name": "Telangana State Renewable Energy Development Corp (TSREDCO)", "gstin": "36AABCT7890P1Z5"},
    {"name": "Rural Water Supply & Sanitation Department", "gstin": "36AAAGW2345Q1Z6"},
    {"name": "Bharat Rural Infrastructure Construction Ltd", "gstin": "36AABCB6789R1Z7"},
    {"name": "Hyderabad Urban Development Infrastructure Ltd", "gstin": "36AAACH8901S1Z8"},
]


@dataclass
class PfmsMatchResult:
    matched: bool
    proposal_id: str
    stage_number: int
    account_match: bool
    fund_redirection_alert: bool
    vendor_similarity_pct: float
    vendor_matched_name: str | None
    flags: list[str]
    risk_score: int
    detail: str


def match_vendor_disbursement(
    db: Session | None,
    proposal_id: str,
    stage_number: int,
    target_account: str,
    vendor_gstin: str,
    vendor_name: str,
) -> PfmsMatchResult:
    """Matches stage disbursement details against registered PFMS implementing agency accounts

    and registered vendor entity directories.
    """
    flags: list[str] = []
    fund_redirection_alert = False
    account_match = True
    vendor_similarity_pct = 0.0
    best_vendor_name: str | None = None

    # 1. Bank Account Continuity across Stages
    # Check if a dedicated stage 1 account is registered in DB or case facts
    stage1_account = None
    if db is not None:
        case = db.query(Case).filter_by(id=proposal_id).first()
        if case and case.facts:
            pfms_facts = case.facts.get("pfms", {})
            stage1_account = pfms_facts.get("stage1_account") or pfms_facts.get("registered_account")

        # Check MetaKey for re-binding exceptions
        rebinding_meta = db.query(MetaKey).filter_by(key=f"pfms_rebinding_{proposal_id}").first()
        is_rebinding_logged = rebinding_meta is not None
    else:
        is_rebinding_logged = False

    if stage_number > 1 and stage1_account:
        if target_account.strip() != stage1_account.strip() and not is_rebinding_logged:
            fund_redirection_alert = True
            account_match = False
            flags.append("FUND_REDIRECTION_ALERT")

    # 2. String Similarity on Vendor Name vs PFMS Entity Registry
    if vendor_name:
        clean_name = vendor_name.strip().lower()
        best_sim = 0
        for v in REGISTERED_PFMS_VENDORS:
            sim = fuzz.token_sort_ratio(clean_name, v["name"].lower())
            if sim > best_sim:
                best_sim = sim
                best_vendor_name = v["name"]
        vendor_similarity_pct = float(best_sim)
    else:
        vendor_similarity_pct = 0.0

    if vendor_similarity_pct < 85.0:
        flags.append("UNVERIFIED_PFMS_VENDOR")

    # Risk Score calculation
    risk = 0
    if fund_redirection_alert:
        risk += 65
    if vendor_similarity_pct < 85.0:
        risk += int(round((85.0 - vendor_similarity_pct) * 0.5))

    matched = len(flags) == 0

    if fund_redirection_alert:
        detail = (
            f"Stage {stage_number} disbursement account ({target_account[-4:].rjust(len(target_account), '*')}) "
            f"does not match Stage 1 registered agency account ({stage1_account[-4:].rjust(len(stage1_account), '*')}). "
            f"Instant FUND_REDIRECTION_ALERT raised."
        )
    elif vendor_similarity_pct < 85.0:
        detail = (
            f"Vendor name '{vendor_name}' has low similarity ({vendor_similarity_pct:.1f}%) with registered PFMS entities. "
            f"Requires manual vendor verification."
        )
    else:
        detail = (
            f"Disbursement verified clean. Account matched Stage 1 agency account; "
            f"Vendor matched '{best_vendor_name}' with {vendor_similarity_pct:.1f}% similarity."
        )

    return PfmsMatchResult(
        matched=matched,
        proposal_id=proposal_id,
        stage_number=stage_number,
        account_match=account_match,
        fund_redirection_alert=fund_redirection_alert,
        vendor_similarity_pct=vendor_similarity_pct,
        vendor_matched_name=best_vendor_name,
        flags=flags,
        risk_score=min(100, risk),
        detail=detail,
    )
