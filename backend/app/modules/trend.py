from __future__ import annotations

import statistics

from app.core import config
from app.ml.models import trend_history
from app.modules.common import ModuleContext, ModuleResult, clamp

TRAILING_YEARS = 3


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M12 district trend deviation — release pace vs the district's own
    multi-year longitudinal series (2015–2025) where available, otherwise
    the same-cohort peer snapshot from intake facts."""
    facts = ctx.facts_for("trend")
    case_pct = facts.get("case_release_pct", 0)

    series = trend_history(ctx.case.district)
    if series:
        window = series[-TRAILING_YEARS:]
        peer_pct = round(sum(p["avgReleasePct"] for p in window) / len(window), 1)
        spreads = [p["avgReleasePct"] for p in series]
        sd = round(statistics.pstdev(spreads), 1) if len(spreads) > 1 else 10.0
        sd = max(1.0, sd)
        basis = (
            f"district {TRAILING_YEARS}-year trailing average "
            f"({series[0]['year']}–{series[-1]['year']} longitudinal series)"
        )
        longitudinal = True
    else:
        peer_pct = facts.get("peer_release_pct", 0)
        sd = max(1, facts.get("peer_sd", 10))
        basis = "same-cohort peers"
        longitudinal = False

    diff = peer_pct - case_pct
    z = diff / sd
    score = clamp(10 + 28 * max(z, 0))
    triggered = diff >= config.TREND_DEVIATION_PCT

    return ModuleResult(
        module="trend",
        sub_score=score,
        description=(
            f"Releasing {case_pct}% vs {peer_pct}% {basis} — significant deviation."
            if triggered
            else f"Release pace within range of {basis} ({peer_pct}%)."
        ),
        triggered=triggered,
        evidence={
            "kind": "trend",
            "caseReleasePct": case_pct,
            "peerReleasePct": peer_pct,
            "peerSd": sd,
            "basis": basis,
            "longitudinal": longitudinal,
        },
    )
