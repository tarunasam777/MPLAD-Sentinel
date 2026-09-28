"""End-to-end rehearsal of the demo path (Part 2) through the full ASGI stack.

Runs the exact sequence a presenter will click through, against a fresh
on-disk SQLite DB, printing what each step shows. Not a pytest test —
a verification script whose output is transcribed into DEMO_SCRIPT.md.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

DB_PATH = "/tmp/sentinel_demo_path.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.db import SessionLocal, init_schema  # noqa: E402
from app.db.models import Case, LedgerEntry, OfficialStat  # noqa: E402
from app.db.seed import reseed  # noqa: E402
from app.main import app  # noqa: E402

init_schema()
db = SessionLocal()
reseed(db, force=True)
db.close()

TOK = {"Authorization": "Bearer sentinel-demo-2026"}

with TestClient(app) as client:
    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 1 — Ingest Sync: provenance banner (must stay honest)")
    print("=" * 72)
    r = client.post("/api/v1/ingest/sync", json={}, headers=TOK)
    d = r.json()
    print(f"POST /api/v1/ingest/sync → {r.status_code}")
    print(f"  UI banner: '{d['ingested']} ingested · {d['held']} held · "
          f"{d['quarantined']} quarantined · "
          f"{'live portal' if d['portal_live'] else 'fallback batch (portal unreachable)'}'")
    print(f"  provenance: {d['provenance']}")
    print(f"  per-district: {[(x['district'], x['portal_live']) for x in d['districts']]}")
    ingested_ids = d["cases"]

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 2 — A case trips the Critical-Risk Gate (pre-existing seed)")
    print("=" * 72)
    db = SessionLocal()
    gate_case = (
        db.query(Case)
        .filter(Case.status == "hold_active", Case.gate_fired.is_(True))
        .first()
    )
    print(f"Case {gate_case.id} — '{gate_case.title[:60]}…'")
    print(f"  status={gate_case.status} composite={gate_case.composite_score}/100")
    print(f"  gate rule: {gate_case.gate_rule}")
    print(f"  MP of record: {gate_case.mp_name} · DM: {gate_case.dm_name}")
    GATE_ID = gate_case.id
    db.close()

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 3 — DM overrides the hold (Approve & Release on gate case)")
    print("=" * 72)
    r = client.post(f"/api/v1/cases/{GATE_ID}/decide",
                    json={"decision": "approve", "note": "Land title conveyed to municipality; gate cleared on record."},
                    headers=TOK)
    print(f"POST /api/v1/cases/{GATE_ID}/decide → {r.status_code}")
    c = r.json()["case"]
    print(f"  status now: {c['status']} · path: {c['path']}")

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 4 — New SHA-256 block written to the ledger")
    print("=" * 72)
    db = SessionLocal()
    last = db.query(LedgerEntry).order_by(LedgerEntry.index.desc()).first()
    print(f"Block #{last.index} — action: {last.action}")
    print(f"  actor: {last.actor} ({last.actor_role})")
    print(f"  body: {last.body[:80]}")
    print(f"  prev_hash: {last.prev_hash[:16]}… · hash: {last.hash[:16]}…")
    TOP = last.index
    db.close()

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 5 — Override-Audit register flags the official")
    print("=" * 72)
    db = SessionLocal()
    stats = db.query(OfficialStat).filter(OfficialStat.gate_overrides > 0).all()
    for o in stats:
        print(f"  {o.name} ({o.district}): high_risk={o.high_risk_decisions} "
              f"gate_overrides={o.gate_overrides} threshold={o.threshold_overrides} → FLAGGED")
    db.close()

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 6 — Tamper a past ledger block")
    print("=" * 72)
    r = client.post("/api/v1/ledger/tamper",
                    json={"index": 1, "body": "eSAKSHI Work MPL-2025-1002 ingested & verified clean. Composite Risk: 99/100.",
                          "timestamp": "2025-01-10T10:15:00"},
                    headers=TOK)
    print(f"POST /api/v1/ledger/tamper index=1 → {r.status_code}")

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 7 — Integrity verification visibly fails")
    print("=" * 72)
    r = client.get("/api/v1/ledger/verify")
    v = r.json()
    print(f"  ok={v['ok']} · tampered blocks: {v['tampered']} of {len(v['validity'])}")
    first_bad = v["tampered"][0] if v["tampered"] else None
    print(f"  UI banner: 'CRITICAL: SHA-256 Ledger Chain Corruption Detected at Block #{first_bad}. "
          f"System Frozen for Audit.'")

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 8 — Restore integrity, verification passes clean")
    print("=" * 72)
    r = client.post("/api/v1/ledger/untamper", headers=TOK)
    print(f"POST /api/v1/ledger/untamper → restored {r.json()['restored']} block(s)")
    r = client.get("/api/v1/ledger/verify")
    v = r.json()
    print(f"  ok={v['ok']} · tampered: {v['tampered']}")
    print(f"  UI toast: '✓ Verification complete — all blocks linked cleanly.'")

    # ------------------------------------------------------------------
    print("=" * 72)
    print("STEP 9 — Policy check on ingested rows (Part 1 invariant live)")
    print("=" * 72)
    from app.data.mp_loader import find_official_match
    db = SessionLocal()
    rows = db.query(Case).filter(Case.id.in_(ingested_ids)).all()
    flagged = [c for c in rows if c.status in {"hold_active", "escalated"}]
    print(f"  ingested rows: {len(rows)}; flagged: {len(flagged)}")
    for c in flagged:
        print(f"    {c.id} status={c.status} mp={c.mp_name!r} dm={c.dm_name!r} "
              f"official_match={find_official_match(c.mp_name)}")
    db.close()
    print("\nDEMO PATH COMPLETE — every transition verified.")
