from __future__ import annotations

from app.modules.common import ModuleContext, ModuleResult, clamp


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M4 compliance guardrails — rule checks with hard-fail critical flags."""
    facts = ctx.facts_for("compliance")
    checks = facts.get("checks") or []

    critical_failed = [c for c in checks if c.get("critical") and not c.get("passed")]
    noncritical_failed = [
        c for c in checks if not c.get("critical") and not c.get("passed")
    ]
    all_failed = critical_failed + noncritical_failed

    score = clamp(
        10
        + 55 * len(critical_failed)
        + 20 * len(noncritical_failed)
        + max(0, (6 - len(checks)) * 3)
    )
    triggered = bool(all_failed)

    failed = all_failed[0] if all_failed else None
    evidence = None
    if triggered:
        evidence = {
            "kind": "compliance",
            "field": failed["field"],
            "actual": failed["actual"],
            "required": failed["required"],
            "ruleRef": failed["rule_ref"],
            "clauseText": failed["clause_text"],
        }
    description = (
        f"{len(critical_failed)} mandatory guardrail(s) failing — "
        f"{failed['field']}: {failed['actual']}."
        if critical_failed
        else (
            f"{len(noncritical_failed)} advisory check(s) failing — {failed['field']}."
            if triggered
            else "All compliance guardrails passed."
        )
    )
    return ModuleResult(
        module="compliance",
        sub_score=score,
        description=description,
        triggered=triggered,
        evidence=evidence,
        flags={"critical_hard_fail": bool(critical_failed), "detail": description},
    )