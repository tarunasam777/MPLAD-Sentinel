from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1 import bootstrap, cases, dashboards, demo, ledger, search
from app.api.v1.ingest import router as ingest_router
from app.api.v1.works import router as works_router
from app.api.v1.ml_metrics import router as ml_metrics_router
from app.api.v1.mps import router as mps_router
from app.api.v1.photo_verify import router
from app.core import config
from app.core.db import SessionLocal, init_schema
from app.core.observability import ObservabilityMiddleware

logging.getLogger("sentinel").setLevel(config.LOG_LEVEL)

_started_at: float | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _started_at
    _started_at = time.monotonic()
    init_schema()
    db = SessionLocal()
    try:
        from app.db.real_seed import real_case_count, seed_real_works_async
        from app.db.seed import reseed

        reseed(db)
        if not real_case_count(db):
            # First boot: the API must be usable in seconds. The 77k-row real
            # register is loaded in 100-row batches on a background thread —
            # /works and /works/summary simply return fewer rows until done.
            seed_real_works_async()
    finally:
        db.close()
    yield


app = FastAPI(
    title="MPLADS Sentinel API",
    version="1.0.0",
    description="Detection → fusion → gate → workflow → override-audit pipeline for MPLADS works.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Order matters: GZip must sit outside the observability middleware so the
# compressed body still carries the request-id/timing headers, and CORS
# outside both so preflight responses are also compressed + traced.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(ObservabilityMiddleware)

app.include_router(bootstrap.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(ledger.router, prefix="/api/v1")
app.include_router(dashboards.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")
app.include_router(ingest_router, prefix="/api/v1")
app.include_router(ml_metrics_router, prefix="/api/v1")
app.include_router(mps_router, prefix="/api/v1")
app.include_router(works_router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    """Liveness/readiness probe. ``status`` and ``database`` are the stable
    keys consumed by Composer health checks; everything else is service
    metadata (version, schema revision, uptime) for dashboards.
    """
    uptime = int(time.monotonic() - _started_at) if _started_at else 0
    return {
        "status": "ok",
        "database": config.DATABASE_URL.split("://")[0],
        "service": config.SERVICE_NAME,
        "version": config.API_VERSION,
        "schemaVersion": config.SCHEMA_VERSION,
        "uptimeSeconds": uptime,
    }