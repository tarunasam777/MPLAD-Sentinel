"""Tests for the real-ML + runtime-computation + identity fixes.

Covers: trained stall/cost models (artifacts, metrics, live predict paths),
SHAP attributions on the trained tree model, live duplicate similarity and
distance, the title-revision endpoint, per-case DM attribution, the CORS
allow-list, and the geography-consistency sweep.
"""

from pathlib import Path

from fastapi.middleware.cors import CORSMiddleware

from app.api import serializers
from app.core.auth import DEMO_AUTH_TOKEN
from app.db.models import Case, ModuleScore
from app.ml import models as ml_models
from app.modules import duplicate as dup_mod
from app.workflow import state_machine

AUTH_HEADERS = {"Authorization": f"Bearer {DEMO_AUTH_TOKEN}"}


def _mods(db, case_id):
    return {m.module: m for m in db.query(ModuleScore).filter_by(case_id=case_id).all()}


def test_stall_model_is_trained_and_live(test_db):
    metrics = ml_models.get_metrics()["stall"]
    assert metrics["version"] == "stall-lr-v2"
    assert metrics["n_train"] >= 1000
    # Honest, leakage-free metrics on REAL eSAKSHI works (payment-lapse
    # label): AUC ~0.80. Do not tighten to 0.9+ — that would reintroduce
    # the end-anchored leakage the v2 redesign removed.
    assert metrics["accuracy"] >= 0.75
    assert metrics["roc_auc"] >= 0.75
    assert metrics["roc_auc"] < 0.98  # perfect AUC would mean leakage

    # Sanction-time lapse-risk model: a 9-month-old, 3-extension,
    # 10%-complete work must score riskier than a young, on-track one.
    healthy = ml_models.stall_proba(1, 0, 100.0, "Community Assets", 0.15)
    ghost = ml_models.stall_proba(9, 3, 10.0, "Social Infrastructure", 0.30)
    assert 0.0 <= healthy <= 1.0
    assert 0.0 <= ghost <= 1.0
    assert ghost > healthy

    mods = _mods(test_db, "MPL-2025-1009")
    ev = mods["predictive"].evidence
    assert ev["model"] == "stall-lr-v2"
    assert 0 <= ev["stallProbabilityPct"] <= 100
    assert "districtStallRate" in ev


def test_cost_model_is_trained_with_shap(test_db):
    metrics = ml_models.get_metrics()["cost"]
    assert metrics["version"] == "cost-xgb-v1"
    assert metrics["n_train"] >= 3000
    # Real MPLADS cost scale: median work ≈ ₹3 lakh.
    assert metrics["mae_lakh"] <= 6.0

    expected = ml_models.cost_expected_lakh("Rangareddy", "Community Assets", "plain", 2025)
    assert 0.5 <= expected <= 60.0

    contribs = ml_models.cost_shap_contribs("Rangareddy", "Community Assets", "plain", 2025)
    assert len(contribs) == 4
    assert {name for name, _ in contribs} == {"district", "category", "terrain", "year"}

    mods = _mods(test_db, "MPL-2025-1005")
    ev = mods["cost"].evidence
    assert ev["model"] == "cost-xgb-v1"
    assert ev["expectedLakh"] > 0
    assert ev["residualPct"] > 45.0
    assert len(ev["shapTop"]) == 2
    assert mods["cost"].triggered is True


def test_duplicate_similarity_computed_live(test_db):
    mods = _mods(test_db, "MPL-2025-1001")
    ev = mods["duplicate"].evidence
    assert ev["computedLive"] is True
    assert ev["textSimilarityPct"] >= 85.0
    assert ev["distanceMeters"] == 160
    assert mods["duplicate"].triggered is True

    # Editing one description recomputes the score at evaluation time.
    case = test_db.query(Case).filter_by(id="MPL-2025-1001").one()
    before = ev["textSimilarityPct"]
    case.title = "Construction of Drainage Pumping Station, Habsiguda"
    test_db.flush()
    from app.ingestion.pipeline import run_case_pipeline

    run_case_pipeline(test_db, case)
    after = _mods(test_db, "MPL-2025-1001")["duplicate"].evidence["textSimilarityPct"]
    assert after != before
    assert after < 85.0


def test_retitle_endpoint_recomputes_scores(client, test_db):
    res = client.patch(
        "/api/v1/cases/MPL-2025-1003",
        json={"title": "Brand New Unrelated Anganwadi Shed, Ghatkesar"},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    dup = next(m for m in res.json()["case"]["moduleBreakdown"] if m["module"] == "duplicate")
    assert dup["evidence"]["textSimilarityPct"] < 85.0
    assert dup["triggered"] is False

    bad = client.patch("/api/v1/cases/MPL-2025-1003", json={"title": "x"}, headers=AUTH_HEADERS)
    assert bad.status_code == 422


def test_decision_endpoints_require_demo_token(client):
    payload = {"decision": "inspect", "note": "no token"}
    assert client.post("/api/v1/cases/MPL-2025-1001/decide", json=payload).status_code == 401
    assert (
        client.patch("/api/v1/cases/MPL-2025-1001", json={"title": "Valid Revised Title"}).status_code
        == 401
    )
    assert client.post("/api/v1/demo/reset").status_code == 401

    wrong = {"Authorization": "Bearer wrong-token"}
    assert client.post("/api/v1/cases/MPL-2025-1001/decide", json=payload, headers=wrong).status_code == 401

    ok = client.post("/api/v1/cases/MPL-2025-1001/decide", json=payload, headers=AUTH_HEADERS)
    assert ok.status_code == 200

    header_ok = client.patch(
        "/api/v1/cases/MPL-2025-1001",
        json={"title": "Community Knowledge Centre Revised Title, Amberpet"},
        headers={"X-Demo-Token": DEMO_AUTH_TOKEN},
    )
    assert header_ok.status_code == 200


def test_decide_attributes_correct_dm_per_case(test_db):
    plan = [
        ("MPL-2025-1007", "approve", "DM Verma (Demo)", "Rangareddy", "gate"),
        ("MPL-2025-1003", "inspect", "DM Iyer (Demo)", "Medchal-Malkajgiri", "threshold"),
        ("MPL-2025-1009", "approve", "DM Nair (Demo)", "Sangareddy", "threshold"),
    ]
    for case_id, decision, dm_name, district, kind in plan:
        case = state_machine.decide(test_db, case_id, decision, f"test {decision}")
        assert case.status_since != "now"
        assert len(case.status_since.split()) == 3  # real "%d %b %Y" timestamp

    from app.db.models import LedgerEntry, OfficialStat, OverrideRecord

    for case_id, decision, dm_name, district, kind in plan:
        rec = (
            test_db.query(OverrideRecord)
            .filter_by(case_id=case_id)
            .order_by(OverrideRecord.id.desc())
            .first()
        )
        assert rec.official_name == dm_name
        assert rec.official_district == district
        assert rec.kind == kind
        entry = test_db.query(LedgerEntry).filter_by(index=rec.ledger_index).one()
        assert entry.actor.startswith("dm_")
        surname = [
            t
            for t in dm_name.replace("(", " ").replace(")", " ").split()
            if t.lower() not in {"dm", "demo"}
        ][-1]
        assert surname.lower() in entry.actor
        assert district in entry.actor_role

    shashanka = test_db.query(OfficialStat).filter_by(name="DM Verma (Demo)").one()
    assert shashanka.district == "Rangareddy"
    assert shashanka.gate_overrides >= 1
    gowtham = test_db.query(OfficialStat).filter_by(name="DM Iyer (Demo)").one()
    assert gowtham.threshold_overrides >= 1


def test_cors_has_no_wildcard_with_credentials():
    from app.main import app

    cors = [m for m in app.user_middleware if m.cls is CORSMiddleware]
    assert cors, "CORS middleware must be registered"
    origins = cors[0].kwargs["allow_origins"]
    assert "*" not in origins
    assert "http://localhost:3000" in origins


def test_no_fictional_geography_leftovers():
    root = Path(__file__).resolve().parents[2]
    targets = list((root / "backend" / "app").rglob("*.py")) + list((root / "src").rglob("*.ts")) + list(
        (root / "src").rglob("*.tsx")
    ) + [root / "report.md"]
    hits = []
    for path in targets:
        if any(part in {".venv", ".next", "node_modules", "__pycache__"} for part in path.parts):
            continue
        text = path.read_text()
        lowered = text.lower()
        if "kotura" in lowered or "uttar sailata" in lowered:
            hits.append(str(path))
    assert hits == []


def test_trend_uses_longitudinal_series(test_db):
    mods = _mods(test_db, "MPL-2025-1001")
    ev = mods["trend"].evidence
    assert ev["longitudinal"] is True
    assert "longitudinal series" in ev["basis"]
    assert "trailing average" in mods["trend"].description


def test_cost_baseline_falls_back_on_thin_cells(test_db, monkeypatch):
    from app.modules import cost_delay

    real_count = ml_models.history_cell_count

    def thin_terrain(district, category, terrain=None, db=None):
        if terrain:
            return 5
        return real_count(district, category, terrain, db=db)

    monkeypatch.setattr(cost_delay, "history_cell_count", thin_terrain)
    case = test_db.query(Case).filter_by(id="MPL-2025-1005").one()
    row, source, note = cost_delay.baseline_for(test_db, case)
    # With the real-data model, unseen (district, category) cells are common;
    # the chain thins to district-level, or to the manual default when the
    # district itself has no training rows.
    assert source in {"district", "manual"}
    assert row is not None


def test_serialize_case_detail_smoke(test_db):
    case = test_db.query(Case).filter_by(id="MPL-2025-1021").one()
    detail = serializers.serialize_case_detail(case)
    assert detail["gate"]["fired"] is True
    assert detail["compositeScore"] < 60


def test_ingest_sync_requires_auth(client):
    assert client.post("/api/v1/ingest/sync", json={}).status_code == 401


def test_ingest_sync_runs_pipeline(client, test_db, monkeypatch):
    from app.ingestion import esakshi_scraper as scraper_mod

    async def fake_scrape(self, state_name, district_name, session_id=None):
        self.last_fetch_live = False
        return [
            {
                "id": "MPL-2025-9001",
                "title": "Sync Probe Community Hall, Test District",
                "category": "Community Assets",
                "state": state_name,
                "district": district_name,
                "constituency": district_name,
                "mpName": "Sync Test MP",
                "sanctionedAmountLakh": 12.0,
                "facts": {
                    "trend": {"case_release_pct": 50, "peer_release_pct": 55, "peer_sd": 10},
                    "payment": {"released_pct": 0, "completion_pct": 0, "months_since_sanction": 1},
                    "compliance": {"checks": []},
                },
            },
            {"title": "x"},  # corrupt payload -> quarantine queue
        ]

    monkeypatch.setattr(
        scraper_mod.EsakshiScraperClient, "scrape_district_works", fake_scrape
    )
    res = client.post(
        "/api/v1/ingest/sync",
        json={"state": "Telangana", "districts": ["Hyderabad"]},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ingested"] == 1
    assert body["quarantined"] == 1
    assert body["cases"] == ["MPL-2025-9001"]
    assert body["portal_live"] is False
    assert "fallback" in body["provenance"]

    from app.db.models import Case

    case = test_db.query(Case).filter_by(id="MPL-2025-9001").one()
    assert case.composite_score >= 0
    assert len(case.module_scores) == 7


def test_scale_seed_endpoint(client, test_db):
    assert client.post("/api/v1/demo/scale-seed", json={"count": 60}).status_code == 401
    res = client.post(
        "/api/v1/demo/scale-seed", json={"count": 60, "seed": 7}, headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    body = res.json()
    assert body["seeded"] is True
    assert body["count"] == 60
    # The draw pool is the official 543-MP allocation table, so 60 works
    # (CSV-order round-robin) cover ~19 states/UTs nationwide.
    assert len(body["states"]) >= 15
    assert body["existing_total"] == 60

    again = client.post(
        "/api/v1/demo/scale-seed", json={"count": 60, "seed": 7}, headers=AUTH_HEADERS
    )
    assert again.json()["seeded"] is False  # idempotent without force

    from app.db.models import Case, StateStat

    assert test_db.query(Case).filter(Case.id.like("MPL-SC-%")).count() == 60
    assert test_db.query(StateStat).count() >= 5
    sample = test_db.query(Case).filter(Case.id.like("MPL-SC-%")).first()
    assert "[Scale sample]" in sample.overview
    assert len(sample.module_scores) == 7
