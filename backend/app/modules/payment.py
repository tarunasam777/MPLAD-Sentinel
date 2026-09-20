from __future__ import annotations

from app.modules.common import ModuleContext, ModuleResult, clamp
from app.modules.pfms_matcher import match_vendor_disbursement


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M6 payment integrity — ghost/fast completion, lapsing and slow drawdown, and PFMS vendor matching."""
    facts = ctx.facts_for("payment")
    released = facts.get("released_pct", 0)
    completed = facts.get("completion_pct", 0)
    months = facts.get("months_since_sanction", 0)

    ghost = released >= 90 and completed <= 15
    base_score = (
        8
        + 0.4 * (released - completed)
        + 1.5 * months
        + (30 if ghost else 0)
        + clamp(0.8 * (60 - released), 0, 24)
    )

    # Check for PFMS reconciliation facts
    pfms_facts = ctx.facts.get("pfms")
    pfms_result = None
    flags: dict = {"ghost_completion": ghost}
    evidence = None

    if pfms_facts and isinstance(pfms_facts, dict):
        pfms_result = match_vendor_disbursement(
            db=ctx.db if hasattr(ctx, "db") else None,
            proposal_id=ctx.case.id if hasattr(ctx, "case") and ctx.case else "DEMO",
            stage_number=pfms_facts.get("stage_number", 2),
            target_account=pfms_facts.get("target_account", ""),
            vendor_gstin=pfms_facts.get("vendor_gstin", ""),
            vendor_name=pfms_facts.get("vendor_name", ""),
        )
        if pfms_result.fund_redirection_alert:
            base_score += 45
            flags["fund_redirection"] = True
        elif pfms_result.vendor_similarity_pct < 85.0:
            base_score += 25
            flags["vendor_unverified"] = True

        evidence = {
            "kind": "pfms",
            "stageNumber": pfms_result.stage_number,
            "accountMatch": pfms_result.account_match,
            "fundRedirectionAlert": pfms_result.fund_redirection_alert,
            "vendorSimilarityPct": pfms_result.vendor_similarity_pct,
            "vendorMatchedName": pfms_result.vendor_matched_name,
            "flags": pfms_result.flags,
            "detail": pfms_result.detail,
        }

    score = clamp(base_score)
    triggered = ghost or score >= 60 or (pfms_result is not None and not pfms_result.matched)

    if pfms_result and pfms_result.fund_redirection_alert:
        description = pfms_result.detail
    elif ghost:
        description = (
            f"100% of funds released with only {completed}% physical completion "
            f"({months} months) — suspected ghost completion."
        )
    elif score >= 60:
        description = f"Slow drawdown ({released}% in {months} months) — lapsing sanction."
    else:
        description = "Releases track physical progress within norms."

    return ModuleResult(
        module="payment",
        sub_score=score,
        description=description,
        triggered=triggered,
        evidence=evidence,
        flags=flags,
    )