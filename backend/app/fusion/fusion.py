from __future__ import annotations

from app.core import config

MODULE_LABELS = {
    "duplicate": "Vendor Duplicate",
    "cost": "Cost Variance",
    "compliance": "Compliance Guardrail",
    "payment": "Payment Integrity",
    "predictive": "Early-Stall Prediction",
    "photo": "Photo Integrity",
    "trend": "Disbursal Trend",
}

MODULE_DETAILS = {
    "duplicate": "Geo + fuzzy matching vs all sanctioned works under the same MP/district.",
    "cost": "Robust z-score of sanctioned ₹/lakh vs category–district cost baselines.",
    "compliance": "Automated eligibility + documentation guardrail checks.",
    "payment": "Released vs physical completion, ghost completion and drawdown lapse windows.",
    "predictive": "Historical stall model — prolonged status, repeated extensions, low disbursal.",
    "photo": "pHash cross-stage similarity + EXIF corroboration on uploaded stage photos.",
    "trend": "Disbursal pace vs same-cohort peers (16-week district trend window).",
}

HIGH_SINGLE_MODULE_ALERT = 75


def fuse(module_scores) -> tuple[int, dict[str, float]]:
    """Transparent weighted fusion (formula-driven) → risk composite 0–100."""
    weights = config.FUSION_WEIGHTS
    by_module = {m.module: m.sub_score for m in module_scores}
    total = 0.0
    attribution: dict[str, float] = {}
    for module, weight in weights.items():
        contribution = weight * by_module.get(module, 0)
        attribution[module] = round(contribution, 2)
        total += contribution
    return int(round(min(100, total))), attribution


def module_level_hold_triggered(module_scores) -> bool:
    """Risk-based alerting: any single module at high severity triggers human review
    even when the fused composite stays moderate."""
    return any(m.sub_score >= HIGH_SINGLE_MODULE_ALERT for m in module_scores)


def attribution_percentages(case) -> list[dict]:
    """Each module's share of the composite, with labels/details for UI."""
    weights = config.FUSION_WEIGHTS
    rows = []
    for m in case.module_scores:
        share = weights.get(m.module, 0) * m.sub_score
        rows.append(
            {
                "module": m.module,
                "subScore": m.sub_score,
                "description": m.description,
                "triggered": m.triggered,
                "label": MODULE_LABELS.get(m.module, m.module),
                "detail": MODULE_DETAILS.get(m.module, ""),
                "attribution": round(share, 2),
                "pct": round((share / max(1, case.composite_score)) * 100, 0)
                if case.composite_score
                else 0,
            }
        )
    return rows