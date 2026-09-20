from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import bootstrap, cases, dashboards, demo, ledger
from app.api.v1.ingest import router as ingest_router
from app.api.v1.photo_verify import router
from app.core import config
from app.core.db import SessionLocal, init_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()
    db = SessionLocal()
    try:
        from app.db.seed import reseed

        reseed(db)
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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bootstrap.router, prefix="/api/v1")
app.include_router(cases.router, prefix="/api/v1")
app.include_router(ledger.router, prefix="/api/v1")
app.include_router(dashboards.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")
app.include_router(ingest_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "database": config.DATABASE_URL.split("://")[0]}