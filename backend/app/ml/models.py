"""Shared encodings, artifact loading, and inference entry points.

Feature order and categorical codes are defined here — once — and imported
by both ``train.py`` and the detection modules, so training and inference
can never disagree about what column 2 means.
"""

from __future__ import annotations

import json
import threading
from collections import OrderedDict
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

STALL_FEATURES = [
    "months_since_sanction",
    "extensions",
    "completion_pct",
    "category_code",
    "district_stall_rate",
]

# ``disbursal_velocity`` is deliberately NOT a model feature: the payment-lapse
# label is an operational definition (no payments by the lapse window), so
# velocity (= released/months) would determine the label almost perfectly and
# the AUC would be circular. The deterministic months+velocity rule lives in
# the payment-integrity module; the model learns from progress/context signals
# so it adds signal beyond the rule instead of restating it.

COST_FEATURES = ["district_code", "category_code", "terrain_code", "year"]

CATEGORY_CODES = {
    "Community Assets": 0,
    "Rural Roads": 1,
    "Drinking Water": 2,
    "Renewable Energy": 3,
    "Education": 4,
    "Health & Sanitation": 5,
    "Social Infrastructure": 6,
    # Real eSAKSHI portal categories (works exports, 2026-09-21 snapshot)
    "Normal/Others": 7,
    "Repair and Renovation": 8,
    "Trust and Society": 9,
    "Bar and Associations": 10,
}

DISTRICT_CODES = {
    # Demonstration districts (curated seed desks)
    "Hyderabad": 0,
    "Rangareddy": 1,
    "Medchal-Malkajgiri": 2,
    "Sangareddy": 3,
    "Mahbubnagar": 4,
    # Highest-volume real IDA districts from the eSAKSHI works exports
    "Jaunpur": 5,
    "South 24 Parganas": 6,
    "Pratapgarh": 7,
    "Shrawasti": 8,
    "Bijnor": 9,
    "Puri": 10,
    "Kaushambi": 11,
    "Murshidabad": 12,
    "Anand": 13,
    "Bokaro": 14,
    "Thiruvananthapuram": 15,
    "Mahesana": 16,
    "Kheri": 17,
    "Varanasi": 18,
    "Nayagada": 19,
    "Kangra": 20,
    "Navsari": 21,
    "Kheda": 22,
    "Ballia": 23,
    "Gaya": 24,
    "Uttar Dinajpur": 25,
    "Bhadohi": 26,
    "Panch Mahals": 27,
    "Ludhiana": 28,
    "Howrah": 29,
    "Bulandshahr": 30,
    "Nizamabad": 31,
    "Jagitial": 32,
    "Chittoor": 33,
    "Surat": 34,
    "Sant Kabir Nagar": 35,
}

TERRAIN_CODES = {"plain": 0, "semi-hilly": 1, "hilly": 2}

UNKNOWN_CODE = -1

MODEL_VERSIONS = {"stall": "stall-lr-v2", "cost": "cost-xgb-v1"}

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
        cost_frame_path = ARTIFACT_DIR / "cost_training_samples.csv"
        if stall_path.exists() and cost_path.exists() and metrics_path.exists():
            _state["stall_model"] = joblib.load(stall_path)
            _state["cost_model"] = joblib.load(cost_path)
            _state["metrics"] = json.loads(metrics_path.read_text())
            # Peer-cell counting must reflect the table the cost model was
            # actually fitted on — the training samples stored at train time.
            _state["cost_frame"] = (
                pd.read_csv(cost_frame_path) if cost_frame_path.exists() else None
            )
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
    completion_pct: float,
    category: str | None,
    district_stall_rate: float,
) -> float:
    """P(stall) from the trained logistic regression — `.predict_proba` on
    a real fitted model, never a stored number. Takes progress/context
    signals only (no disbursal velocity — see the leakage note above)."""
    st = _ensure_loaded()
    row = pd.DataFrame(
        [
            {
                "months_since_sanction": float(months_since_sanction),
                "extensions": float(extensions),
                "completion_pct": float(completion_pct),
                "category_code": float(encode_category(category)),
                "district_stall_rate": float(district_stall_rate),
            }
        ]
    )
    return float(st["stall_model"].predict_proba(row[STALL_FEATURES])[0, 1])


def cost_expected_lakh(district: str | None, category: str | None, terrain: str | None, year: int) -> float:
    """Model-expected sanctioned cost (lakh) from the trained XGBoost
    regressor (fitted on log cost, exponentiated back)."""
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
    ``shap.TreeExplainer`` fitted on the trained XGBoost model.

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


# Bounded LRU: the key space is finite (35 districts x 11 categories x 3
# terrains) but a leak-proof cap costs nothing and guarantees O(1) worst-case
# memory even if the codec/namespace drifts in a future data version.
_CELL_COUNT_CACHE_MAX = 2048
_CELL_COUNT_CACHE: OrderedDict[tuple, int] = OrderedDict()


def history_cell_count(
    district: str | None,
    category: str | None,
    terrain: str | None = None,
    db: object = None,
) -> int:
    """Memoized per (district, category, terrain): the full-frame pandas mask
    costs ~1 ms per call and the seeding pipeline evaluates 77k cases — the
    frame inputs are immutable for the process lifetime, so repeated counts
    are cached. The db-based CostBaseline part stays live per call (tests
    stub the db session, so it must not be memoized)."""
    frame = _cost_frame()
    total = 0
    if frame is not None and len(frame):
        key = (district, category, terrain or None)
        if key in _CELL_COUNT_CACHE:
            total = _CELL_COUNT_CACHE.pop(key)
            _CELL_COUNT_CACHE[key] = total  # move to MRU end
        else:
            mask = pd.Series(True, index=frame.index)
            if district is not None:
                mask = mask & (frame["district"] == district)
            if category is not None:
                mask = mask & (frame["category"] == category)
            if terrain:
                mask = mask & (frame["terrain"] == terrain)
            total = int(mask.sum())
            _CELL_COUNT_CACHE[key] = total
            if len(_CELL_COUNT_CACHE) > _CELL_COUNT_CACHE_MAX:
                _CELL_COUNT_CACHE.popitem(last=False)
    if db is not None:
        from app.db.models import CostBaseline

        q = db.query(CostBaseline)
        if district is not None:
            q = q.filter(CostBaseline.district == district)
        if category is not None:
            q = q.filter(CostBaseline.category == category)
        if terrain:
            q = q.filter(CostBaseline.terrain == terrain)
        for row in q.all():
            total += int(row.n_records or 0)
    return total


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
