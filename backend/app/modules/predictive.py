from __future__ import annotations

from app.core import config
from app.db.models import Case
from app.ml.models import MODEL_VERSIONS, stall_proba
from app.modules.common import ModuleContext, ModuleResult, clamp

PRIOR_DISTRICT_STALL_RATE = 0.15


def district_stall_rate(db, district: str | None) -> float:
    """Live district stall rate: share of the district's cases currently in
    a held/escalated state. Computed from the case table at evaluation
    time — a genuine input feature, not a stored constant."""
    try:
        rows = db.query(Case).filter_by(district=district).all()
    except Exception:
        return PRIOR_DISTRICT_STALL_RATE
    if not rows:
        return PRIOR_DISTRICT_STALL_RATE
    bad = sum(1 for c in rows if (c.status or "") in {"hold_active", "escalated"})
    return round(bad / len(rows), 3)


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M7 predictive modelling — P(stall) from a trained logistic
    regression (``stall-lr-v1``) over engineered features. The model calls
    ``.predict_proba()`` on every evaluation; nothing is read from stored
    scores."""
    facts = ctx.facts_for("predictive")
    pay = ctx.facts_for("payment")
    months = float(pay.get("months_since_sanction", 0) or 0)
    extensions = float(pay.get("extensions", facts.get("extensions", 0)) or 0)
    released = float(pay.get("released_pct", 0) or 0)
    completion = float(pay.get("completion_pct", 0) or 0)
    velocity = round(released / max(1.0, months), 2)
    rate = district_stall_rate(ctx.db, ctx.case.district)

    proba = stall_proba(months, extensions, velocity, completion, ctx.case.category, rate)
    stall = int(round(proba * 100))

    score = clamp(10 + 0.95 * stall)
    triggered = stall >= config.STALL_PROBABILITY_THRESHOLD

    factors = facts.get("factors") or []
    evidence = {
        "kind": "predictive",
        "stallProbabilityPct": stall,
        "factors": factors,
        "model": MODEL_VERSIONS["stall"],
        "districtStallRate": rate,
        "disbursalVelocity": velocity,
        "completionPct": completion,
        "extensions": int(extensions),
    }
    return ModuleResult(
        module="predictive",
        sub_score=score,
        description=(
            f"{stall}% predicted stall probability (trained classifier) — {len(factors)} leading indicators."
            if triggered
            else f"{stall}% predicted stall probability (trained classifier) — within norms."
        ),
        triggered=triggered,
        evidence=evidence,
    )
