from __future__ import annotations

from app.core import config
from app.modules.common import ModuleContext, ModuleResult, clamp


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M11 photo-integrity — pHash cross-stage matches + EXIF corroboration."""
    facts = ctx.facts_for("photo")
    if not facts.get("photos"):
        return ModuleResult(
            module="photo",
            sub_score=4,
            description="No stage photographs uploaded for this work.",
        )

    matches = facts.get("p_hash_matches") or []
    match_pct = max((m.get("match_pct", 0) for m in matches), default=0)
    exif = [x for x in facts.get("exif_inconsistencies") or [] if x.get("corroborating")]

    score = clamp(6 + 0.55 * match_pct + 10 * len(exif))
    triggered = match_pct >= 85 or (match_pct >= 60 and len(exif) > 0)
    high_confidence = match_pct >= config.PHOTO_GATE_MATCH

    evidence = {
        "kind": "photo",
        "photos": [
            {"label": p.get("label"), "color": p.get("color"), "pHash": p.get("p_hash", p.get("pHash", ""))}
            for p in (facts.get("photos") or [])
        ],
        "pHashMatchPct": match_pct,
        "exif": [
            {
                "field": x.get("field"),
                "photoA": x.get("photo_a", x.get("photoA", "")),
                "photoB": x.get("photo_b", x.get("photoB", "")),
                "corroborating": x.get("corroborating", False),
            }
            for x in (facts.get("exif_inconsistencies") or [])
        ],
    }
    if high_confidence:
        description = (
            f"Photographs are {match_pct:.1f}% identical across distinct works — "
            "suspected staged submissions."
        )
    elif triggered:
        description = "Photo-integrity signals suggest re-used/staged imagery."
    else:
        description = "Photographs verified across stages with no material matches."
    return ModuleResult(
        module="photo",
        sub_score=score,
        description=description,
        triggered=triggered,
        evidence=evidence,
        flags={"high_confidence_photo": high_confidence},
    )