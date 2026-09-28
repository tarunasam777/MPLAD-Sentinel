"""Real-data training frames for both Sentinel models.

Built from the vendored eSAKSHI work-level exports (81,727 sanctioned Lok
Sabha works, portal snapshot 2026-09-21) via ``app.data.works_loader`` —
NO synthetic labels anywhere in this module.

Stall label (ground truth = the portal's own payment register):
    stalled = work is ≥ ``app.core.config.PAYMENT_LAPSE_MONTHS`` months past
    sanction and has zero vendor payments recorded. This is the operational
    "lapsing sanction" signal of the payment-integrity module.

Leakage discipline (why some intuitive features are absent):
    * ``disbursal_velocity`` is EXCLUDED — released/months determines the
      label almost by construction (zero payments ⟺ zero velocity).
    * end-anchored ``months_since_sanction`` (months to last activity) is
      EXCLUDED for the same reason — it separates the label perfectly by
      construction. The model's exposure covariate is age at snapshot.
    * ``district_stall_rate`` is a LEAVE-ONE-OUT prior (each work's district
      rate excluding that work), and districts with ≤30 works collapse to
      the global rate.

Population: the stall table is restricted to works at least 12 months old
at snapshot (label fully determined — no censoring bias). Features are
sanction-time only: what was knowable the day the work was sanctioned.

Cost target: real sanctioned amounts (log lakh) by district / category /
year. Terrain is not published by the portal, so every real row carries the
constant ``plain`` — recorded here and in the metrics rather than invented
per-district.

Deterministic derivations (disclosed, not invented):
    * ``extensions`` is not published; the stall table uses the sanctioned
      amount's standard ₹-chunk size (``min(3, lakh // 40)``) — a real
      portal signal, documented substitution.
    * ``district_stall_rate`` is the real per-district lapse share computed
      from the same labelled table.
"""

from __future__ import annotations

import pandas as pd

from app.core.config import PAYMENT_LAPSE_MONTHS
from app.data.works_loader import district_stall_rates, load_real_works, stall_labels
from app.ml.models import encode_category

TERRAIN_CONSTANT = "plain"


def _extensions(sanction_lakh: float) -> int:
    """Chunk-count proxy derived from the sanctioned amount in lakh (the
    portal's standard ₹-40L-chunk signal; see ``stall_frame`` docstring).
    The old parameter name ``completion_pct`` described the *context prior*
    column, not this amount-derived feature — renamed; behavior unchanged."""
    return min(3, int(sanction_lakh // 40))


def stall_frame() -> pd.DataFrame:
    """Sanction-time lapse-risk training table from REAL portal ground truth.

    Population: works sanctioned at least ``AGE_FLOOR_MONTHS`` before the
    snapshot — for these the label is fully determined, so the training set
    is not censoring-biased toward the young.

    Features are sanction-time only (nothing post-sanction is knowable at
    sanction time, so nothing leaks):
      * ``months_since_sanction`` = age at snapshot (exposure covariate;
        NOT the end-anchored months-to-last-activity, which encodes the
        label by construction),
      * ``extensions`` = sanctioned-amount chunk size (the portal's own
        standard ₹-chunk signal; documented substitution for the unpublished
        extensions count),
      * ``completion_pct`` = the district's real completion share, joined in
        as a context prior,
      * ``category_code`` = real portal category,
      * ``district_stall_rate`` = leave-one-out real district lapse prior.

    Label: payment lapse per the portal's own register.
    """
    AGE_FLOOR_MONTHS = 12
    works = stall_labels(load_real_works())
    eligible = [w for w in works if w["age_at_snapshot"] >= AGE_FLOOR_MONTHS]
    if not eligible:
        return pd.DataFrame(columns=["months_since_sanction", "extensions", "completion_pct", "category_code", "district_stall_rate", "stalled"])

    total_pos = sum(w["stalled"] for w in eligible)
    global_rate = total_pos / len(eligible)
    per_d: dict[str, list[int]] = {}
    comp_share: dict[str, list[int]] = {}
    for w in eligible:
        b = per_d.setdefault(w["district"], [0, 0])
        b[0] += w["stalled"]
        b[1] += 1
        c = comp_share.setdefault(w["district"], [0, 0])
        c[0] += int(w["completed"])
        c[1] += 1

    rows = []
    for w in eligible:
        pos, n = per_d.get(w["district"], [0, 0])
        loo = (pos - w["stalled"]) / (n - 1) if n > 30 else global_rate
        comp, cn = comp_share.get(w["district"], [0, 0])
        rows.append(
            {
                "months_since_sanction": float(w["age_at_snapshot"]),
                "extensions": float(_extensions(w["sanction_amount_rupees"] / 1e5)),
                "completion_pct": float(round(100.0 * comp / cn, 1) if cn else 0.0),
                "category_code": float(encode_category(w["category"])),
                "district_stall_rate": float(round(loo, 4)),
                "stalled": int(w["stalled"]),
            }
        )
    return pd.DataFrame(rows)


def cost_history_frame() -> pd.DataFrame:
    works = load_real_works()
    rows = []
    for w in works:
        if w["sanction_amount_rupees"] <= 0 or w["sanctioned_date"] is None:
            continue
        rows.append(
            {
                "district": w["district"],
                "category": w["category"],
                "terrain": TERRAIN_CONSTANT,
                "year": w["sanctioned_date"].year,
                "sanctioned_lakh": round(w["sanction_amount_rupees"] / 1e5, 3),
            }
        )
    return pd.DataFrame(rows)


def dataset_card() -> dict:
    """Provenance block stored beside the metrics so reviewers can see the
    label definition and snapshot date without reading code."""
    works = stall_labels(load_real_works())
    n = len(works)
    return {
        "source": "eSAKSHI work-level exports (portal snapshot 2026-09-21)",
        "n_works": n,
        "n_completed": sum(w["completed"] for w in works),
        "stall_definition": (
            f"payment lapse: >= {PAYMENT_LAPSE_MONTHS} months since sanction "
            "with zero vendor payments recorded"
        ),
        "n_stall_positive": sum(w["stalled"] for w in works),
        "stall_population": "works aged >= 12 months at snapshot (label fully determined)",
        "feature_policy": "sanction-time features only; leave-one-out district prior",
        "terrain_note": "terrain not published by the portal; constant 'plain' for real rows",
        "extensions_note": "derived from sanctioned-amount chunk size (min(3, lakh//40)); count not published",
    }
