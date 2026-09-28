"""Tests for the official MoSPI MP allocation integration.

Covers: CSV loader correctness (543 MPs, grand-total cross-check),
seeding into the DB, the public /mps/allocations endpoint, and the
/ml/metrics endpoint that feeds the methodology page.
"""

from app.core.auth import DEMO_AUTH_TOKEN
from app.data.mp_loader import find_official_match, load_allocations
from app.db.models import Case, MpAllocation

AUTH_HEADERS = {"Authorization": f"Bearer {DEMO_AUTH_TOKEN}"}


def test_loader_parses_all_543_mps():
    rows, totals = load_allocations()
    assert totals["mpCount"] == 543
    assert totals["rowsSkipped"] == 1  # the “Grand Total” footer row
    assert totals["grandTotalCr"] == 8341.87  # CSV footer, ₹83,41,87,02,273.8


def test_loader_row_values_match_published_table():
    rows, _ = load_allocations()
    by_name = {r["mpName"]: r for r in rows}

    owaisi = by_name["Asaduddin Owaisi"]
    assert owaisi["state"] == "Telangana"
    assert owaisi["constituency"] == "HYDERABAD"
    assert owaisi["allocatedCr"] == 14.70

    blank = by_name["CHAVAN VASANTRAO BALWANTRAO"]
    assert blank["allocatedCr"] is None  # blank published amount → pending revision

    gadkari = by_name["Nitin Jairam Gadkari"]
    assert gadkari["allocatedCr"] == 16.82


def test_loader_total_matches_csv_grand_total_within_rounding():
    rows, totals = load_allocations()
    summed = sum(r["allocatedCr"] or 0.0 for r in rows)
    # Rows without an amount are excluded, so allow their slack (~14.7 Cr for
    # the one blank row) — the published grand total is a superset.
    assert 8300.0 <= summed <= totals["grandTotalCr"] + 1.0
    assert totals["totalCr"] == round(summed, 2)


def test_allocations_seeded_into_db(test_db):
    count = test_db.query(MpAllocation).count()
    assert count == 543
    telangana = (
        test_db.query(MpAllocation).filter_by(state="Telangana").all()
    )
    assert len(telangana) >= 10
    assert all(r.allocated_cr is None or r.allocated_cr > 0 for r in telangana)


def test_mp_allocations_endpoint(client):
    res = client.get("/api/v1/mps/allocations")
    assert res.status_code == 200
    body = res.json()
    assert body["mpCount"] == 543
    assert body["totalCr"] > 8300.0
    assert len(body["mps"]) == 543
    sample = next(m for m in body["mps"] if m["mpName"] == "Asaduddin Owaisi")
    assert sample["allocatedCr"] == 14.70
    assert sample["state"] == "Telangana"
    # Endpoint is public transparency data — no auth required.


def test_ml_metrics_endpoint(client):
    res = client.get("/api/v1/ml/metrics")
    assert res.status_code == 200
    body = res.json()
    assert body["stall"]["version"] == "stall-lr-v2"
    assert 0.0 < body["stall"]["accuracy"] <= 1.0
    assert 0.0 < body["stall"]["roc_auc"] <= 1.0
    assert body["stall"]["dataset"]["n_works"] == 81727  # real eSAKSHI works
    assert body["cost"]["version"] == "cost-xgb-v1"
    assert body["cost"]["mae_lakh"] > 0
    assert abs(sum(body["fusionWeights"].values()) - 1.0) < 1e-6


def test_scale_works_anchor_to_official_constituencies(client, test_db):
    """National scale-sample works anchor to real published constituencies
    and states from the official allocation table (the money/geography is
    real and checkable), while the officials of record are demonstrably
    fictional so no real person's name can be flagged."""
    res = client.post("/api/v1/demo/scale-seed", json={"count": 120, "seed": 7}, headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert res.json()["seeded"] is True

    official_pairs = {(r["state"], r["constituency"]) for r in load_allocations()[0]}
    rows = test_db.query(Case).filter(Case.id.like("MPL-SC-%")).all()
    assert len(rows) == 120
    states_seen = set()
    for c in rows:
        assert (c.state, c.constituency) in official_pairs, (
            f"{c.state}/{c.constituency} not an official constituency"
        )
        assert find_official_match(c.mp_name) is None, (
            f"{c.mp_name} must not resolve to a real MP"
        )
        assert "[Scale sample]" in c.overview  # honesty tag stays
        states_seen.add(c.state)
    assert len(states_seen) >= 20  # genuine nationwide spread


def test_bootstrap_includes_allocations(client):
    res = client.get("/api/v1/bootstrap")
    assert res.status_code == 200
    analytics = res.json()["analytics"]
    alloc = analytics["mpAllocations"]
    assert alloc["mpCount"] == 543
    assert alloc["totalCr"] > 8300.0
    assert len(alloc["mps"]) == 543


def test_entitlement_breakdown_always_array_shape(client, test_db):
    """Regression: MpStat.breakdown is a legacy dict ({category: lakh}) in the
    seed while the API contract is [{category, lakh}, ...] — the dict form
    crashed the MP dashboard with '(intermediate value) ?? []).map is not a
    function'. The serializer must normalize every shape to an array."""
    from app.db.models import MpStat
    from app.api.serializers import _normalize_breakdown

    # Unit: all three storage shapes normalize to the contracted array.
    assert _normalize_breakdown({"Education": 1.45, "Rural Roads": 0.8}) == [
        {"category": "Education", "lakh": 1.45},
        {"category": "Rural Roads", "lakh": 0.8},
    ]
    assert _normalize_breakdown([{"category": "Education", "lakh": 1.0}]) == [
        {"category": "Education", "lakh": 1.0}
    ]
    assert _normalize_breakdown(None) == []
    assert _normalize_breakdown("garbage") == []

    # Integration: whatever the DB stores, bootstrap emits arrays only.
    res = client.get("/api/v1/bootstrap")
    assert res.status_code == 200
    for ent in res.json()["analytics"]["entitlements"]:
        assert isinstance(ent["breakdown"], list), ent
        for b in ent["breakdown"]:
            assert set(b.keys()) == {"category", "lakh"}
