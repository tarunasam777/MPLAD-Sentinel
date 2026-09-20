"""Shared encodings, artifact loading, and inference entry points.

Feature order and categorical codes are defined here — once — and imported
by both ``train.py`` and the detection modules, so training and inference
can never disagree about what column 2 means.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

STALL_FEATURES = [
    "months_since_sanction",
    "extensions",
    "disbursal_velocity",
    "completion_pct",
    "category_code",
    "district_stall_rate",
]

COST_FEATURES = ["district_code", "category_code", "terrain_code", "year"]

CATEGORY_CODES = {
    "Community Assets": 0,
    "Rural Roads": 1,
    "Drinking Water": 2,
    "Renewable Energy": 3,
    "Education": 4,
    "Health & Sanitation": 5,
    "Social Infrastructure": 6,
}

DISTRICT_CODES = {
    "Hyderabad": 0,
    "Rangareddy": 1,
    "Medchal-Malkajgiri": 2,
    "Sangareddy": 3,
    "Mahbubnagar": 4,
}

TERRAIN_CODES = {"plain": 0, "semi-hilly": 1, "hilly": 2}

UNKNOWN_CODE = -1

MODEL_VERSIONS = {"stall": "stall-lr-v1", "cost": "cost-gbr-v1"}

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"

_lock = threading.Lock()
_state: dict = {"loaded": False}


def _encode(mapping: dict, value: str | None) -> int:
    if value is None:
        return UNKNOWN_CODE
    return mapping.get(str(value).strip(), UNKNOWN_CODE)


def encode_category(category: str | None) -> int:
    return _encode(CATEGORY_CODES, category)


def encode_district(district: str | None) -> int:
    return _encode(DISTRICT_CODES, district)


def encode_terrain(terrain: str | None) -> int:
    return _encode(TERRAIN_CODES, terrain)


def _train_in_memory() -> dict:
    """Deterministic fallback: fit both models from the synthetic
    generators without touching disk. Used when artifacts are absent."""
    from app.ml import train as train_mod
    from app.ml import synthetic as synth_mod

    stall_df = synth_mod.stall_frame()
    cost_df = synth_mod.cost_history_frame()
    stall_model, stall_metrics = train_mod.train_stall(stall_df)
    cost_model, cost_metrics = train_mod.train_cost(cost_df)
    return {
        "stall_model": stall_model,
        "cost_model": cost_model,
        "metrics": {"stall": stall_metrics, "cost": cost_metrics},
        "cost_frame": cost_df,
        "from_artifacts": False,
    }


def _ensure_loaded() -> dict:
    if _state.get("loaded"):
        return _state
    with _lock:
        if _state.get("loaded"):
            return _state
        stall_path = ARTIFACT_DIR / "stall_model.joblib"
        cost_path = ARTIFACT_DIR / "cost_model.joblib"
        metrics_path = ARTIFACT_DIR / "metrics.json"
        if stall_path.exists() and cost_path.exists() and metrics_path.exists():
            _state["stall_model"] = joblib.load(stall_path)
            _state["cost_model"] = joblib.load(cost_path)
            _state["metrics"] = json.loads(metrics_path.read_text())
            _state["explainer"] = None
            _state["from_artifacts"] = True
        else:
            _state.update(_train_in_memory())
            _state["explainer"] = None
        _state["loaded"] = True
    return _state


def _cost_frame() -> pd.DataFrame:
    st = _ensure_loaded()
    frame = st.get("cost_frame")
    if frame is None:
        from app.ml import synthetic as synth_mod

        frame = synth_mod.cost_history_frame()
        st["cost_frame"] = frame
    return frame


def stall_proba(
    months_since_sanction: float,
    extensions: float,
    disbursal_velocity: float,
    completion_pct: float,
    category: str | None,
    district_stall_rate: float,
) -> float:
    """P(stall) from the trained logistic regression — `.predict_proba` on
    a real fitted model, never a stored number."""
    st = _ensure_loaded()
    row = pd.DataFrame(
        [
            {
                "months_since_sanction": float(months_since_sanction),
                "extensions": float(extensions),
                "disbursal_velocity": float(disbursal_velocity),
                "completion_pct": float(completion_pct),
                "category_code": float(encode_category(category)),
                "district_stall_rate": float(district_stall_rate),
            }
        ]
    )
    return float(st["stall_model"].predict_proba(row[STALL_FEATURES])[0, 1])


def cost_expected_lakh(district: str | None, category: str | None, terrain: str | None, year: int) -> float:
    """Model-expected sanctioned cost (lakh) from the trained gradient
    boosting regressor (fitted on log cost, exponentiated back)."""
    st = _ensure_loaded()
    row = pd.DataFrame(
        [
            {
                "district_code": encode_district(district),
                "category_code": encode_category(category),
                "terrain_code": encode_terrain(terrain),
                "year": int(year),
            }
        ]
    )
    log_pred = float(st["cost_model"].predict(row[COST_FEATURES])[0])
    return float(np.exp(log_pred))


def cost_shap_contribs(
    district: str | None, category: str | None, terrain: str | None, year: int
) -> list[tuple[str, float]]:
    """Exact SHAP attributions for one cost prediction, from a real
    ``shap.TreeExplainer`` fitted on the trained gradient boosting model.

    Returns (feature_name, shap_value) in log-cost space; the values sum to
    prediction − expected_value by construction.
    """
    import shap

    st = _ensure_loaded()
    with _lock:
        explainer = st.get("explainer")
        if explainer is None:
            explainer = shap.TreeExplainer(st["cost_model"])
            st["explainer"] = explainer
        row = pd.DataFrame(
            [
                {
                    "district_code": encode_district(district),
                    "category_code": encode_category(category),
                    "terrain_code": encode_terrain(terrain),
                    "year": int(year),
                }
            ]
        )
        values = np.asarray(explainer.shap_values(row[COST_FEATURES])).reshape(-1)
    names = ["district", "category", "terrain", "year"]
    return [(name, round(float(v), 4)) for name, v in zip(names, values.tolist())]


def history_cell_count(district: str | None, category: str | None, terrain: str | None = None) -> int:
    """Number of historical training rows backing a peer cell. ``None`` is a
    wildcard (broader tier). Drives the cold-start fallback: thin cells fall
    back to the broader peer group."""
    frame = _cost_frame()
    mask = pd.Series(True, index=frame.index)
    if district is not None:
        mask = mask & (frame["district"] == district)
    if category is not None:
        mask = mask & (frame["category"] == category)
    if terrain:
        mask = mask & (frame["terrain"] == terrain)
    return int(mask.sum())


def get_metrics() -> dict:
    return dict(_ensure_loaded()["metrics"])


def trend_history(district: str | None) -> list[dict]:
    """Multi-year district release-pace series, 2015–2025, for genuine
    longitudinal comparison. Loaded from the vendored history table when
    present, else regenerated deterministically from the seeded generator."""
    import pandas as pd

    st = _ensure_loaded()
    frame = st.get("trend_frame")
    if frame is None:
        path = ARTIFACT_DIR / "trend_history.csv"
        if path.exists():
            frame = pd.read_csv(path)
        else:
            from app.ml import synthetic as synth_mod

            frame = synth_mod.trend_history_frame()
        st["trend_frame"] = frame
    rows = frame[frame["district"] == district].sort_values("year")
    return [
        {
            "year": int(r.year),
            "worksSanctioned": int(r.works_sanctioned),
            "avgReleasePct": float(r.avg_release_pct),
        }
        for r in rows.itertuples()
    ]
