"""eSAKSHI live-feed ingestion.

``POST /api/v1/ingest/sync`` pulls works via ``EsakshiScraperClient`` and
feeds the raw records through the standard ``ingest_and_evaluate_batch``
pipeline — rule gates, ML inference, quarantine queue, ledger writes —
exactly like any other intake source. When the live portal is unreachable
the scraper yields its standardized fallback batch; the response reports
per-district provenance honestly instead of claiming liveness.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_actor
from app.core.db import get_db
from app.ingestion.esakshi_scraper import EsakshiScraperClient
from app.ingestion.pipeline import ingest_and_evaluate_batch

router = APIRouter(prefix="/ingest", tags=["ingest"])

DEFAULT_SYNC_DISTRICTS = [
    "Hyderabad",
    "Rangareddy",
    "Medchal-Malkajgiri",
    "Sangareddy",
    "Mahbubnagar",
]


class SyncIn(BaseModel):
    state: str = "Telangana"
    districts: list[str] | None = None
    max_districts: int = Field(default=8, ge=1, le=20)


@router.post("/sync")
async def sync_esakshi_feed(
    payload: SyncIn,
    db: Session = Depends(get_db),
    _actor: dict = Depends(get_current_actor),
):
    districts = (payload.districts or DEFAULT_SYNC_DISTRICTS)[: payload.max_districts]
    scraper = EsakshiScraperClient()
    raw_records: list[dict] = []
    per_district: list[dict] = []
    for district in districts:
        records = await scraper.scrape_district_works(payload.state, district)
        live = bool(getattr(scraper, "last_fetch_live", False))
        raw_records.extend(records)
        per_district.append(
            {"district": district, "records": len(records), "portal_live": live}
        )

    result = ingest_and_evaluate_batch(db, raw_records, source="esakshi-sync")
    portal_live = any(d["portal_live"] for d in per_district)
    return {
        **result,
        "districts": per_district,
        "portal_live": portal_live,
        "provenance": (
            "Parsed from the live eSAKSHI portal HTML."
            if portal_live
            else "Live portal unreachable — ingested the scraper's standardized fallback batch."
        ),
    }
