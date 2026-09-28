"""ML model metadata & metrics — single source of truth for the methodology page.

``GET /api/v1/ml/metrics`` exposes the committed ``metrics.json`` from
``app/ml/artifacts`` so the frontend never hardcodes hold-out numbers that
can drift after a retrain.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.ml.models import get_metrics, MODEL_VERSIONS

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/metrics")
def ml_metrics():
    metrics = get_metrics()
    return {
        "stall": metrics["stall"],  # version, model, n_train, n_test, accuracy, roc_auc, features
        "cost": metrics["cost"],  # version, model, n_train, n_test, mae_lakh, r2_log, features, target
        "fusionWeights": {
            "trend": 0.08,
            "duplicate": 0.20,
            "cost": 0.20,
            "compliance": 0.28,
            "payment": 0.10,
            "predictive": 0.07,
            "photo": 0.07,
        },
        "modelVersions": MODEL_VERSIONS,
    }
