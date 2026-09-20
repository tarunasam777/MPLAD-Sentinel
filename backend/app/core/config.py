from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/

STATE_NAME = "Telangana"

DATABASE_URL = os.getenv(
    "DATABASE_URL", f"sqlite:///{BASE_DIR / 'sentinel.db'}"
)

# PostGIS is provisioned in the Docker stack; the demo modules operate on stored
# spatial measurements so the same code runs on SQLite (local dev) and Postgres.
ENABLE_POSTGIS_EXT = DATABASE_URL.startswith("postgresql")

CORS_ORIGINS = json.loads(os.getenv("CORS_ORIGINS", '["http://localhost:3000","http://127.0.0.1:3000"]'))

# Module 8 defaults — illustrative starting points, configurable per state/district.
FUSION_WEIGHTS = {
    "trend": 0.08,
    "duplicate": 0.20,
    "cost": 0.20,
    "compliance": 0.28,
    "payment": 0.10,
    "predictive": 0.07,
    "photo": 0.07,
}

# Module 9 — critical conditions that force HOLD independent of the composite score.
GATE_RULES = {
    "compliance": "a mandatory compliance guardrail failed (governs land tenure, entity type, safety certification)",
    "photo": "high-confidence photo-integrity violation (pHash match ≥ 99% across distinct works or stage records)",
}

PHOTO_GATE_MATCH = 99.0

MAD_Z_THRESHOLD = 2.0
DUPLICATE_SIM_THRESHOLD = 85
DUPLICATE_DIST_THRESHOLD_M = 500
PAYMENT_LAPSE_MONTHS = 6
PAYMENT_GHOST_RELEASE_PCT = 90
PAYMENT_GHOST_COMPLETION_PCT = 15
STALL_PROBABILITY_THRESHOLD = 60
TREND_DEVIATION_PCT = 15