"""Regression tests for the universal search endpoint (GET /api/v1/search).

The search must reach every part of the program — works register, demo
cases, MPs, officials, ledger blocks, states — and every hit must carry a
deep-link ``href`` so no result is a dead end.
"""

from __future__ import annotations


def _search(client, q: str, limit: int | None = None):
    params = {"q": q}
    if limit is not None:
        params["limit"] = limit
    res = client.get("/api/v1/search", params=params)
    assert res.status_code == 200, res.text
    return res.json()


def test_search_requires_query(client):
    res = client.get("/api/v1/search")
    assert res.status_code == 422  # FastAPI validation: q is required


def test_search_finds_demo_case_and_links_detail(client):
    data = _search(client, "MPL-2025-1001")
    groups = {g["key"]: g for g in data["groups"]}
    assert "cases" in groups
    hit = groups["cases"]["results"][0]
    assert hit["id"].startswith("MPL-")
    assert hit["href"] == f"/cases/{hit['id']}"


def test_search_finds_works(client, test_db):
    """The demo-seed fixture has no real WS/ rows — insert one, then the
    works group must surface it with the right deep link."""
    from app.db.models import Case

    test_db.add(
        Case(
            id="WS/MP138/2025-2026/205446",
            title="Providing supply pipelines for drinking water in Hyderabad",
            category="Normal/Others",
            state="Telangana",
            district="Hyderabad",
            constituency="Hyderabad",
            mp_name="Asaduddin Owaisi",
            dm_name="DM Sharma (Demo)",
            sanctioned_amount_lakh=56.57,
            sanctioned_date="2025-06-01",
            status="submitted",
            status_since="2025-06-01",
        )
    )
    test_db.commit()

    data = _search(client, "205446")
    groups = {g["key"]: g for g in data["groups"]}
    assert "works" in groups
    hit = groups["works"]["results"][0]
    assert hit["id"] == "WS/MP138/2025-2026/205446"
    assert hit["href"].startswith("/works?q=")


def test_search_finds_mp_and_links_dashboard(client):
    data = _search(client, "Owaisi")
    groups = {g["key"]: g for g in data["groups"]}
    assert "mps" in groups
    hit = groups["mps"]["results"][0]
    assert "Owaisi" in hit["name"]
    assert hit["href"] == f"/dashboard/mp?mp={hit['name']}"


def test_search_finds_official_by_role(client):
    data = _search(client, "Magistrate")
    groups = {g["key"]: g for g in data["groups"]}
    assert "officials" in groups
    assert all(h["href"] == "/override-audit" for h in groups["officials"]["results"])


def test_search_finds_ledger_blocks(client):
    data = _search(client, "genesis")
    groups = {g["key"]: g for g in data["groups"]}
    assert "ledger" in groups
    hit = groups["ledger"]["results"][0]
    assert hit["href"] == f"/ledger?q={hit['index']}"


def test_search_finds_state_rollup(client):
    data = _search(client, "Telangana")
    groups = {g["key"]: g for g in data["groups"]}
    assert "states" in groups
    assert groups["states"]["results"][0]["href"] == "/works?state=Telangana"


def test_search_groups_are_nonempty(client):
    data = _search(client, "MPL")
    assert data["groups"], "expected at least one group for a broad term"
    for g in data["groups"]:
        assert g["total"] > 0
        assert len(g["results"]) <= 6  # default per-group cap


def test_search_garbage_has_no_groups(client):
    data = _search(client, "zzqqxx_never_matches_9931")
    assert data["groups"] == []


def test_search_limit_is_respected(client):
    data = _search(client, "a", limit=2)
    for g in data["groups"]:
        assert len(g["results"]) <= 2
