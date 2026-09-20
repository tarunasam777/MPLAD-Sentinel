"""Offline training entry point for both Sentinel models.

Usage::

    cd backend
    .venv/bin/python -m app.ml.train

Fits the stall classifier and the cost regressor on the (seeded,
reproducible) synthetic training tables, evaluates each on a held-out
split, and writes versioned artifacts plus the exact training rows to
``app/ml/artifacts/`` so any reviewer can reproduce the metrics.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split

from app.ml.models import ARTIFACT_DIR, COST_FEATURES, STALL_FEATURES
from app.ml.synthetic import cost_history_frame, stall_frame, trend_history_frame

STALL_TEST_SIZE = 0.2
STALL_SPLIT_SEED = 7
COST_TEST_SIZE = 0.2
COST_SPLIT_SEED = 7


def train_stall(df: pd.DataFrame) -> tuple[LogisticRegression, dict]:
    X = df[STALL_FEATURES]
    y = df["stalled"].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=STALL_TEST_SIZE, random_state=STALL_SPLIT_SEED, stratify=y
    )
    model = LogisticRegression(max_iter=2000)
    model.fit(X_train, y_train)
    proba = model.predict_proba(X_test)[:, 1]
    metrics = {
        "model": "LogisticRegression",
        "version": "stall-lr-v1",
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, model.predict(X_test))), 4),
        "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
        "features": list(STALL_FEATURES),
    }
    return model, metrics


def train_cost(df: pd.DataFrame) -> tuple[GradientBoostingRegressor, dict]:
    from app.ml.models import encode_category, encode_district, encode_terrain

    work = df.copy()
    work["district_code"] = work["district"].map(encode_district)
    work["category_code"] = work["category"].map(encode_category)
    work["terrain_code"] = work["terrain"].map(encode_terrain)
    work["log_lakh"] = np.log(work["sanctioned_lakh"].clip(lower=0.01))
    X = work[COST_FEATURES]
    y = work["log_lakh"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=COST_TEST_SIZE, random_state=COST_SPLIT_SEED
    )
    model = GradientBoostingRegressor(random_state=7)
    model.fit(X_train, y_train)
    pred_log = model.predict(X_test)
    metrics = {
        "model": "GradientBoostingRegressor",
        "version": "cost-gbr-v1",
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae_lakh": round(float(mean_absolute_error(np.exp(y_test), np.exp(pred_log))), 3),
        "r2_log": round(float(r2_score(y_test, pred_log)), 4),
        "features": list(COST_FEATURES),
        "target": "log(sanctioned_lakh)",
    }
    return model, metrics


def train_all(out_dir: Path = ARTIFACT_DIR) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    stall_df = stall_frame()
    cost_df = cost_history_frame()

    stall_model, stall_metrics = train_stall(stall_df)
    cost_model, cost_metrics = train_cost(cost_df)

    joblib.dump(stall_model, out_dir / "stall_model.joblib")
    joblib.dump(cost_model, out_dir / "cost_model.joblib")
    metrics = {"stall": stall_metrics, "cost": cost_metrics}
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (out_dir / "encodings.json").write_text(
        json.dumps(
            {
                "stall_features": list(STALL_FEATURES),
                "cost_features": list(COST_FEATURES),
                "versions": {"stall": "stall-lr-v1", "cost": "cost-gbr-v1"},
            },
            indent=2,
        )
    )
    stall_df.to_csv(out_dir / "stall_training_samples.csv", index=False)
    cost_df.to_csv(out_dir / "cost_training_samples.csv", index=False)
    trend_history_frame().to_csv(out_dir / "trend_history.csv", index=False)
    return metrics


if __name__ == "__main__":
    result = train_all()
    print(json.dumps(result, indent=2))
