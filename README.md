# MPLADS Sentinel

An AI-powered monitoring and analytics platform for the MPLADS scheme (SIH problem statement **26102**, MoSPI): seven detection modules over every sanctioned work, a deterministic Critical-Risk Gate that can hold a work regardless of its score, per-case SHAP/rule evidence on every flag, and a SHA-256 hash-chained audit ledger with an override-audit register.

- **Backend:** FastAPI + SQLAlchemy (SQLite locally, Postgres+PostGIS in Docker), two trained scikit-learn models with committed artifacts, per-case SHAP explainability.
- **Frontend:** Next.js (App Router), six role desks (MP, District, State, Ministry, Implementing Agency, Citizen) with a demo/live mode switch.
- **Tests:** 37 backend (pytest) + 41 frontend (vitest); `tsc --noEmit` clean; production build clean.

See **[DEMO_SCRIPT.md](./DEMO_SCRIPT.md)** for the 4-minute-45-second judge walkthrough.

---

## Run locally (no Docker)

```bash
# 1. Backend — http://127.0.0.1:8000  (interactive API docs at /docs)
# if first time
cd backend
python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
# Or 
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
#defaulting port to 8000

# 2. Frontend — http://localhost:3000  (second terminal, repo root)
npm install
npm run dev
```

No environment file is required for local development: the backend defaults to `backend/sentinel.db` (SQLite, auto-seeded on first boot) and the frontend defaults to `http://127.0.0.1:8000`.

## Deploy: clean checkout → live URL in under 10 minutes

Prereqs: Docker with Compose v2+ (`docker compose version`). No other steps, no secrets to create.

```bash
git clone <your-repo-url> mplads-sentinel && cd mplads-sentinel
docker compose up --build -d          # builds db + backend + web
docker compose ps                     # wait until db is "healthy", backend/web "running"
curl http://localhost:8000/health     # {"status":"ok","database":"postgresql"}
open http://localhost:3000            # the app
```

That's the whole deployment. `docker compose up` is the only command: the database schema, seed data and trained-model artifacts ship inside the images.

**Verify the pipeline end to end (optional, 1 minute):**

```bash
# Gate hold → override → ledger block:
curl -s http://localhost:8000/api/v1/bootstrap | head -c 400; echo
curl -s -X POST http://localhost:8000/api/v1/cases/MPL-2025-1021/decide \
  -H "Authorization: Bearer sentinel-demo-2026" -H "Content-Type: application/json" \
  -d '{"decision":"approve","note":"gate override on record"}'; echo
curl -s http://localhost:8000/api/v1/ledger/verify    # {"ok":true,...}

# National scale sample (750 works across 30+ states, real allocation anchors):
curl -s -X POST http://localhost:8000/api/v1/demo/scale-seed \
  -H "Authorization: Bearer sentinel-demo-2026" -H "Content-Type: application/json" \
  -d '{"count":750,"seed":7}'
```

**Configuration (all optional — see [.env.example](./.env.example)):** copy `.env.example` to `.env` to change ports, the Postgres password, the demo token, or `NEXT_PUBLIC_API_URL` (the URL browsers use to reach the backend). `NEXT_PUBLIC_*` values are baked into the frontend bundle **at build time** — if you change them, re-run `docker compose up --build web`.

**Hosting on a public URL** (any VM with Docker — EC2/DO/Fly/your lab server):

1. Open ports 80/443 (or your chosen ports) in the firewall/security group.
2. `cp .env.example .env`, then set in `.env`:
   - `NEXT_PUBLIC_API_URL=https://api.your-domain` (or `http://<vm-ip>:8000`)
   - `CORS_ORIGINS='["https://your-domain"]'` (add the URL judges will open)
   - fresh `POSTGRES_PASSWORD` and `DEMO_AUTH_TOKEN`.
3. Put a reverse proxy (Caddy is simplest: two lines for automatic HTTPS) in front of `web:3000` and `backend:8000`, or publish the ports directly.
4. `docker compose up --build -d` from the clean checkout. **Total time: under 10 minutes**, most of it image build.

**Operational notes**

- Data persists in the `sentinel_pgdata` volume; `docker compose down -v` wipes it (the demo reseeds on boot).
- `POST /api/v1/demo/reset` restores the curated demo dataset at any time.
- The demo token is an acknowledged demo-grade gate, not real identity verification — a production deployment replaces `backend/app/core/auth.py` with NIC SSO/OAuth2 (stated in-app and in code).

## Tests

```bash
cd backend && .venv/bin/python -m pytest -q      # 37 tests (includes the data-policy regression suite)
npx tsc --noEmit                                 # frontend types
npx vitest run                                   # 41 tests
npm run build                                    # production build
```

## Data policy (short version)

Fully real datasets — the official MoSPI "Allocated Limit for Hon'ble MPs" table (543 Lok Sabha MPs, ₹8,341.87 Cr) **plus the portal's own work-level exports** (109,625 recommended / 81,727 sanctioned / 35,648 completed works and 86,468 vendor payments across both houses, in `backend/app/data/{lok_shaba,rajya_sabha}/`) — are vendored and **verified against the live eSAKSHI portal itself**: `backend/scripts/validate_worklevel_exports.py` reconciles every money total against the portal's live national tiles to the paisa (`backend/app/data/worklevel/VALIDATION.md`). Every flagged/held/escalated work carries fictional officials of record; automated regression tests (`backend/tests/test_policy_mp_flags.py`) enforce that no real person's name can appear under a risk flag. Full details: in-app **Methodology & Limitations** page and `backend/app/ml/data/SOURCES.md`.
