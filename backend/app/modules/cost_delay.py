from __future__ import annotations

import math

from app.db.models import CostBaseline, Case
from app.ml.models import MODEL_VERSIONS, cost_expected_lakh, cost_shap_contribs, history_cell_count
from app.modules.common import ModuleContext, ModuleResult, clamp

CATEGORY_LABELS = {
    "rural_roads": "Rural Roads",
    "social_infrastructure": "Social Infrastructure",
    "water": "Water Conservation",
    "community": "Community Assets",
    "health": "Health Infrastructure",
    "urban": "Urban Infrastructure",
    "sports": "Sports & Civic",
}

MIN_HISTORY_ROWS = 30
RESIDUAL_TRIGGER = 0.45


def _sanction_year(case: Case) -> int:
    try:
        return int(str(case.sanctioned_date or "").split()[-1])
    except (ValueError, IndexError, AttributeError):
        return 2025


def baseline_for(db, case: Case) -> tuple[CostBaseline | None, str, str]:
    """Resolve the comparison peer band through a cascading fallback:
    1) district + category + terrain cluster
    2) district + category (any terrain)
    3) state-level (category-wide) cohort
    4) none -> referred for manual cost estimation.

    A tier is only used when the historical training table holds at least
    ``MIN_HISTORY_ROWS`` rows for that cell; thin cells fall back to the
    broader peer group. Returns (row, source_key, note)."""
    terrain = str((case.facts or {}).get("terrain") or "plain")
    q = db.query(CostBaseline)
    tiers = [
        (
            "terrain+district",
            "Peer cohort clustered by district + category + terrain.",
            {"category": case.category, "district": case.district, "terrain": terrain},
            (case.district, case.category, terrain),
        ),
        (
            "district",
            "Terrain-cluster history insufficient — fell back to the district + category cohort.",
            {"category": case.category, "district": case.district},
            (case.district, case.category, None),
        ),
        (
            "state",
            "District-level history insufficient — widened to a state-level (category-wide) cohort.",
            {"category": case.category},
            (None, case.category, None),
        ),
    ]
    for source, note, filters, cell in tiers:
        row = q.filter_by(**filters).order_by(CostBaseline.id.asc()).first()
        if row is None:
            continue
        district_c, category_c, terrain_c = cell
        if history_cell_count(district_c or row.district, category_c or row.category, terrain_c) < MIN_HISTORY_ROWS:
            continue
        return row, source, note
    return None, "manual", "No cost baseline available in the district or state cohort — referred for manual cost estimation."


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M3 cost & time variance — residual of the sanctioned amount against
    a trained gradient-boosting cost regressor (``cost-gbr-v1``), with exact
    SHAP attributions per case. The peer band shown alongside comes from
    the cascading baseline tiers above."""
    case = ctx.case
    observed = case.sanctioned_amount_lakh
    base, source, note = baseline_for(ctx.db, case)

    terrain = str((case.facts or {}).get("terrain") or "plain")
    year = _sanction_year(case)
    expected = cost_expected_lakh(case.district, case.category, terrain, year)
    residual = (observed - expected) / expected if expected > 0 else 0.0
    shap_all = cost_shap_contribs(case.district, case.category, terrain, year)
    shap_top = [
        {"feature": name, "contribution": value}
        for name, value in sorted(shap_all, key=lambda kv: abs(kv[1]), reverse=True)[:2]
    ]

    if base is None or base.mad_log_cost <= 0:
        return ModuleResult(
            module="cost",
            sub_score=6,
            description="No cost baseline available in the district or state cohort — referred for manual cost estimation.",
            evidence={
                "kind": "cost",
                "sanctionedLakh": round(observed, 1),
                "peerLowLakh": 0.0,
                "peerHighLakh": 0.0,
                "peerMeanLakh": 0.0,
                "expectedLakh": round(expected, 1),
                "residualPct": round(residual * 100, 1),
                "categoryLabel": CATEGORY_LABELS.get(case.category, case.category),
                "baselineSource": "manual",
                "baselineNote": note,
                "model": MODEL_VERSIONS["cost"],
                "shapTop": shap_top,
            },
        )

    score = clamp(30 + 90 * residual)
    triggered = residual >= RESIDUAL_TRIGGER

    evidence = {
        "kind": "cost",
        "sanctionedLakh": round(observed, 1),
        "peerLowLakh": round(base.low_lakh, 1),
        "peerHighLakh": round(base.high_lakh, 1),
        "peerMeanLakh": round(base.median_lakh, 1),
        "expectedLakh": round(expected, 1),
        "residualPct": round(residual * 100, 1),
        "categoryLabel": CATEGORY_LABELS.get(case.category, case.category),
        "baselineSource": source,
        "baselineNote": note,
        "model": MODEL_VERSIONS["cost"],
        "shapTop": shap_top,
    }
    return ModuleResult(
        module="cost",
        sub_score=score,
        description=(
            f"Sanctioned ₹{observed:,.1f} lakh vs model-expected ₹{expected:,.1f} lakh "
            f"({residual * 100:+.1f}% residual) — statistically unusual."
            if triggered
            else "Sanctioned amount within model-expected cost range."
        ),
        triggered=triggered,
        evidence=evidence,
    )
