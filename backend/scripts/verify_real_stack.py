"""End-to-end smoke of the real-data stack (Part B/C verification).

Boots the full app on a fresh on-disk SQLite DB, then:
  1. confirms the real register seeded and /api/v1/works serves it,
  2. hits /works/summary aggregates,
  3. exercises Ingest Sync against the REAL portal (live REST if reachable,
     honest vendored-export fallback otherwise),
  4. asserts the data-policy guard: a real record refuses demo decisions,
  5. proves ``demo reset`` preserves the real register.

Not a pytest test (boots a real DB + optionally the network); run manually:
    DATABASE_URL=sqlite:////tmp/sentinel_smoke.db .venv/bin/python scripts/verify_real_stack.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

DB_PATH = "/tmp/sentinel_smoke.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{DB_PATH}")

# Keep first-boot seeding fast for the smoke: register rows are the same
# loader path, just a smaller slice.
import app.db.real_seed as real_seed_mod

_orig = real_seed_mod.seed_real_works
real_seed_mod.seed_real_works = lambda db, count=None, force=False: _orig(
    db, count=1500 if count is None else count, force=force
)

from fastapi.testclient import TestClient  # noqa: E402

from app.core.auth import DEMO_AUTH_TOKEN  # noqa: E402
from app.main import app  # noqa: E402

AUTH = {"Authorization": f"Bearer {DEMO_AUTH_TOKEN}"}
client_cm = TestClient(app)
client = client_cm.__enter__()  # runs lifespan: init_schema + first-boot seeding
ok = True


def check(label: str, cond: bool, detail: str = "") -> None:
    global ok
    mark = "✓" if cond else "✗"
    if not cond:
        ok = False
    print(f"{mark} {label}{(' — ' + detail) if detail else ''}")


# 1. Real register seeded + served ------------------------------------------------
r = client.get("/api/v1/works", params={"page_size": 5})
body = r.json()
check("GET /works 200", r.status_code == 200)
check("register populated", body.get("total", 0) > 1000, f"total={body.get('total'):,}")
row = (body.get("works") or [{}])[0]
check("row is a real portal record", str(row.get("id", "")).startswith("WS/"), f"id={row.get('id')}")
check("row carries real MP + money", bool(row.get("mpName")) and float(row.get("sanctionedLakh") or 0) > 0)

# 2. Summary aggregates -----------------------------------------------------------
r = client.get("/api/v1/works/summary")
s = r.json()
check("GET /works/summary 200", r.status_code == 200)
check("summary covers multiple states", len(s.get("states", [])) >= 10, f"states={len(s.get('states', []))}")
print(f"  totalWorks={s.get('totalWorks'):,}  sanctionedCr=₹{s.get('totalSanctionedCr'):,.0f}  noPaymentYet={s.get('noPaymentYet'):,}")

# 3. Ingest sync — live portal first, honest fallback otherwise -------------------
r = client.post(
    "/api/v1/ingest/sync",
    json={"state": "Telangana", "districts": ["Hyderabad"]},
    headers=AUTH,
)
ing = r.json()
check("POST /ingest/sync 200", r.status_code == 200)
check("ingested real rows", ing.get("ingested", 0) > 0, f"ingested={ing.get('ingested')} quarantined={ing.get('quarantined')}")
check("provenance present + honest", bool(ing.get("provenance")), ing.get("provenance", ""))
print(f"  portal_live={ing.get('portal_live')}  provenance={ing.get('provenance')}")

# 4. Policy guard: real records refuse demo workflow decisions --------------------
from app.workflow.state_machine import decide  # noqa: E402

from app.core.db import SessionLocal  # noqa: E402

db = SessionLocal()
from app.db.models import Case  # noqa: E402

real_case = db.query(Case).filter(Case.id.like("WS/%")).first()
refused = False
try:
    # ``escalate`` is a legal transition from ``evaluating`` — the policy
    # guard (not the transition table) is what must refuse it.
    decide(db, real_case.id, "escalate", "smoke probe")
except ValueError as exc:
    refused = "Data policy" in str(exc)
db.close()
check("real record refuses demo decision", refused)

# 5. Demo reset preserves the real register ---------------------------------------
r = client.post("/api/v1/demo/reset", headers=AUTH)
check("POST /demo/reset 200", r.status_code == 200)
r = client.get("/api/v1/works", params={"page_size": 1})
after = r.json().get("total", 0)
check("demo reset kept real register", after == body["total"], f"before={body['total']:,} after={after:,}")

print("\nSMOKE " + ("PASS — real-data stack verified end to end" if ok else "FAIL"))
client_cm.__exit__(None, None, None)
sys.exit(0 if ok else 1)
