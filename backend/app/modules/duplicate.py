from __future__ import annotations

import math

from thefuzz import fuzz

from app.core import config
from app.db.models import Case
from app.modules.common import ModuleContext, ModuleResult, clamp

EARTH_RADIUS_M = 6_371_000.0


def live_similarity(title_a: str | None, title_b: str | None) -> float:
    """Token-sort fuzzy similarity computed at evaluation time from the two
    live work descriptions — never read from a stored field."""
    return float(fuzz.token_sort_ratio(title_a or "", title_b or ""))


def haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    phi1, phi2 = math.radians(a_lat), math.radians(b_lat)
    d_phi = math.radians(b_lat - a_lat)
    d_lmb = math.radians(b_lng - a_lng)
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lmb / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, max(0.0, h))))


def duplicate_sub_score(sim: float, dist_m: float) -> int:
    return clamp(min(100, sim * 0.9 + ((config.DUPLICATE_DIST_THRESHOLD_M - dist_m) / 500) * 10 + 4))


def evaluate(ctx: ModuleContext) -> ModuleResult:
    """M1 vendor duplicate detection — fuzzy similarity on title + geo proximity.

    Both numbers are computed live at evaluation time: text similarity with
    thefuzz from the two current titles (the twin's title is re-read from
    the case table by id, so editing either description recomputes the
    score), and distance by haversine when both endpoints carry coordinates.
    """
    facts = ctx.facts_for("duplicate")
    twin_ref = facts.get("twin") or {}
    if not twin_ref:
        return ModuleResult(
            module="duplicate",
            sub_score=6,
            description="No vendor duplicate within similarity/geographic thresholds.",
        )

    twin_id = twin_ref.get("id")
    twin_title = twin_ref.get("title") or ""
    if twin_id and ctx.db is not None:
        try:
            row = ctx.db.query(Case).filter_by(id=twin_id).first()
        except Exception:
            row = None
        if row is not None and row.title:
            twin_title = row.title
    if not twin_title:
        return ModuleResult(
            module="duplicate",
            sub_score=6,
            description="Twin reference has no comparable title.",
        )

    sim = live_similarity(ctx.case.title, twin_title)

    dist_m: float | None = None
    case_geo = (ctx.facts.get("geo") or {}) if isinstance(ctx.facts, dict) else {}
    if (
        isinstance(case_geo, dict)
        and case_geo.get("lat") is not None
        and twin_ref.get("lat") is not None
        and twin_ref.get("lng") is not None
    ):
        try:
            dist_m = haversine_m(
                float(case_geo["lat"]),
                float(case_geo.get("lng", case_geo.get("lon", 0.0))),
                float(twin_ref["lat"]),
                float(twin_ref["lng"]),
            )
        except (TypeError, ValueError):
            dist_m = None
    if dist_m is None:
        dist_m = float(twin_ref.get("distance_m", 500))

    score = duplicate_sub_score(sim, dist_m)
    triggered = sim >= config.DUPLICATE_SIM_THRESHOLD and dist_m <= config.DUPLICATE_DIST_THRESHOLD_M

    evidence = {
        "kind": "duplicate",
        "title": twin_title,
        "caseId": twin_id,
        "distanceMeters": int(round(dist_m)),
        "textSimilarityPct": round(sim, 1),
        "mapX": twin_ref.get("map_x"),
        "mapY": twin_ref.get("map_y"),
        "computedLive": True,
    }
    return ModuleResult(
        module="duplicate",
        sub_score=score,
        description=(
            f"Text similarity {sim:.0f}% to ‘{twin_title}’ "
            f"{dist_m:.0f} m away — suspected duplicate sanction."
            if triggered
            else f"Similar work seen ({sim:.0f}% similarity) but outside watch thresholds."
        ),
        triggered=triggered,
        evidence=evidence,
    )
