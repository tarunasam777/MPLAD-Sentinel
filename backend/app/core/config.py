from __future__ import annotations

import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/

STATE_NAME = "Telangana"

# ── Service metadata (echoed by /health and HTTP response headers) ──────
SERVICE_NAME = os.getenv("SERVICE_NAME", "MPLADS Sentinel API")
API_VERSION = os.getenv("API_VERSION", "1.0.0")
# Highest applied Alembic revision; kept in sync with backend/alembic/versions.
SCHEMA_VERSION = os.getenv("SCHEMA_VERSION", "0002")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# ── SQLAlchemy engine tuning (consumed by app.core.db) ───────────────────
SQL_POOL_SIZE = int(os.getenv("SQL_POOL_SIZE", "5"))
SQL_MAX_OVERFLOW = int(os.getenv("SQL_MAX_OVERFLOW", "10"))
SQL_POOL_RECYCLE = int(os.getenv("SQL_POOL_RECYCLE", "1800"))
# SQLite busy_timeout: parallel reads must wait for a write lock instead of
# failing with "database is locked" under the background real-register seed.
SQLITE_BUSY_TIMEOUT_MS = int(os.getenv("SQLITE_BUSY_TIMEOUT_MS", "30000"))

# ── Input ceilings (reliability / resource-exhaustion guards) ────────────
# Photo-verify uploads are read fully into memory — cap the size and the
# decoded pixel count (Pillow's decompression-bomb guard threshold).
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", str(25_000_000)))
MAX_SEARCH_TERM_LENGTH = int(os.getenv("MAX_SEARCH_TERM_LENGTH", "64"))

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