"""Trained-model layer for MPLADS Sentinel.

Two genuinely trained models live here:

* ``stall`` — LogisticRegression classifier predicting P(work stalls).
* ``cost`` — GradientBoostingRegressor predicting log sanctioned cost.

``models.py`` is the single source of truth for feature order and the
categorical encodings shared by training (``train.py``) and inference
(the detection modules). Artifacts are persisted under ``artifacts/`` by
``train.py``; at runtime the loaders fall back to deterministic in-memory
training if the artifact files are absent, so tests and fresh checkouts
never depend on committed binaries.
"""

from .models import (
    CATEGORY_CODES,
    COST_FEATURES,
    DISTRICT_CODES,
    MODEL_VERSIONS,
    STALL_FEATURES,
    TERRAIN_CODES,
    UNKNOWN_CODE,
    cost_expected_lakh,
    cost_shap_contribs,
    get_metrics,
    history_cell_count,
    stall_proba,
)

__all__ = [
    "CATEGORY_CODES",
    "COST_FEATURES",
    "DISTRICT_CODES",
    "MODEL_VERSIONS",
    "STALL_FEATURES",
    "TERRAIN_CODES",
    "UNKNOWN_CODE",
    "cost_expected_lakh",
    "cost_shap_contribs",
    "get_metrics",
    "history_cell_count",
    "stall_proba",
]
