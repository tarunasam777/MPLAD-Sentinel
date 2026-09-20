"""Deterministic synthetic training-data generators.

Honesty note (also stated on the methodology page): no labelled historical
stall outcomes and no bulk historical works table were obtainable for this
prototype — the open-data aggregator hosting MoSPI-sourced MPLADS works
tables requires sign-in, and the data.gov.in API requires a registered key.
So both training sets below are *synthetic-label* data:

* stall outcomes are derived from a documented rule applied to engineered
  features (this is standard practice for bootstrapping a classifier when
  only the risk factors, not the labels, are known);
* historical sanctioned amounts are sampled around the demo's published
  peer-baseline medians (imported from ``seed_data.COST_BASELINES`` so the
  two can never drift apart silently).

Every generator is seeded, so the training data — and therefore the fitted
models and their metrics — are exactly reproducible. To train on real
MoSPI-published rows later, drop a CSV in the format described in
``data/SOURCES.md`` and point ``train.py`` at it; no module code changes.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RNG_SEED = 20260920

COST_HISTORY_YEARS = list(range(2015, 2026))
COST_ROWS_PER_CELL = 120
STALL_TRAINING_ROWS = 2000
TREND_HISTORY_YEARS = list(range(2015, 2026))


def cost_history_frame(seed: int = RNG_SEED, rows_per_cell: int = COST_ROWS_PER_CELL) -> pd.DataFrame:
    """Synthetic historical sanctioned-works table.

    Columns: district, category, terrain, year, sanctioned_lakh.
    Amounts are log-normally distributed around each cell's published
    baseline median with a mild upward year drift.
    """
    from app.db.seed_data import COST_BASELINES

    rng = np.random.default_rng(seed)
    records = []
    for cell in COST_BASELINES:
        years = rng.integers(2015, 2026, size=rows_per_cell)
        noise = rng.normal(loc=0.0, scale=0.30, size=rows_per_cell)
        drift = 1.0 + 0.008 * (years - 2020)
        amounts = cell["median_lakh"] * np.exp(noise) * drift
        for year, amount in zip(years.tolist(), amounts.tolist()):
            records.append(
                {
                    "district": cell["district"],
                    "category": cell["category"],
                    "terrain": cell.get("terrain", "plain"),
                    "year": int(year),
                    "sanctioned_lakh": round(max(1.0, amount), 2),
                }
            )
    return pd.DataFrame.from_records(records)


def _stall_label(
    months: np.ndarray, extensions: np.ndarray, velocity: np.ndarray, completion: np.ndarray
) -> np.ndarray:
    """Rule-derived ground-truth label used for training ONLY.

    A work is labelled stalled when significant time has passed with little
    to show for it: slow disbursal *and* low physical completion, repeated
    extensions without progress, or very old sanctions still far from done.
    Completion is the key disambiguator — an old, fully-completed work is
    healthy, not stalled.
    """
    return (
        ((months >= 9) & (velocity < 20) & (completion < 70))
        | ((extensions >= 2) & (velocity < 40) & (completion < 80))
        | ((months >= 12) & (completion < 50))
    ).astype(int)


def stall_frame(seed: int = RNG_SEED, n: int = STALL_TRAINING_ROWS) -> pd.DataFrame:
    """Synthetic stall-training table with rule-derived labels.

    Columns: months_since_sanction, extensions, disbursal_velocity,
    completion_pct, category_code, district_stall_rate, stalled (0/1).
    Completion is correlated with age for the healthy majority; a stuck
    minority pairs high age with low completion.
    """
    from app.ml.models import CATEGORY_CODES

    rng = np.random.default_rng(seed)
    months = rng.integers(0, 19, size=n).astype(float)
    extensions = np.minimum(rng.poisson(0.7, size=n), 4).astype(float)
    stuck = rng.random(n) < 0.20
    completion = np.clip(months * rng.uniform(5, 10, size=n) + rng.normal(0, 8, size=n), 0, 100)
    completion = np.where(stuck, rng.uniform(0, 40, size=n), completion)
    released = np.clip(completion + rng.uniform(-5, 15, size=n), 0, 100)
    velocity = released / np.maximum(1.0, months)
    category_code = rng.integers(0, len(CATEGORY_CODES), size=n).astype(float)
    district_rate = rng.uniform(0.05, 0.40, size=n).round(3)
    stalled = _stall_label(months, extensions, velocity, completion)
    flip = rng.random(n) < 0.04
    stalled = np.where(flip, 1 - stalled, stalled)
    return pd.DataFrame(
        {
            "months_since_sanction": months,
            "extensions": extensions,
            "disbursal_velocity": np.round(velocity, 2),
            "completion_pct": np.round(completion, 1),
            "category_code": category_code,
            "district_stall_rate": district_rate,
            "stalled": stalled,
        }
    )


def trend_history_frame(seed: int = RNG_SEED) -> pd.DataFrame:
    """Synthetic multi-year district trend history.

    Columns: district, year, works_sanctioned, avg_release_pct.
    Gives the Trend module a genuine longitudinal series (2015–2025) to
    compare a case's release pace against, instead of a single-year peer
    snapshot. Same provenance caveat as above: synthetic, seeded,
    replaceable with MoSPI-published yearly aggregates.
    """
    from app.ml.models import DISTRICT_CODES

    rng = np.random.default_rng(seed + 11)
    records = []
    for district in DISTRICT_CODES:
        base_works = float(rng.integers(38, 70))
        base_release = float(rng.uniform(48, 62))
        for year in TREND_HISTORY_YEARS:
            drift = (year - 2015) * rng.uniform(0.4, 1.1)
            records.append(
                {
                    "district": district,
                    "year": year,
                    "works_sanctioned": int(max(5, base_works + drift + rng.normal(0, 4))),
                    "avg_release_pct": round(
                        float(np.clip(base_release + drift * 0.6 + rng.normal(0, 3), 5, 98)), 1
                    ),
                }
            )
    return pd.DataFrame.from_records(records)
