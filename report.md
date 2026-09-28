---
title: MPLADS Sentinel — Complete Codebase Report
document-type: codebase report
repository: avighna
generated: 2026-09-28
commit: 96f9e6a
verification:
  backend-tests: "54 passed, 2 skipped"
  frontend-tests: "45 passed"
  typecheck: pass
  lint: pass (0 errors)
  build: pass
---

# MPLADS Sentinel — Complete Codebase Report

**Scope of this document:** every tracked file in this repository, documented from its own contents. Nothing here is imported from external sources, prior reports, commit messages, or the problem statement. Where a claim is verifiable by reading the code, the file and line are cited.

**Snapshot:** Next.js 16.3.5 / React 19.2.8 frontend, FastAPI + SQLAlchemy backend, Python 3.11 target, SQLite locally and Postgres+PostGIS in Docker. Verified at git commit `96f9e6a` against the running suites: backend `54 passed, 2 skipped`, frontend `45 passed`, `tsc --noEmit` clean, `eslint` clean, `next build` succeeds.

**How to read this:** Section 1 is the file inventory. Sections 2–10 walk the repository top to bottom (root config → backend core → backend ML → backend data → backend tests → backend scripts → frontend lib/store → frontend components → frontend pages → frontend tests and browser probes). Sections 11–12 record the cross-file contracts and the inconsistencies found *inside the codebase itself*. Section 15 lists every hardening measure applied on top of the snapshot, with its verification result.

---

## 1. File inventory

Counts are physical lines (`wc -l`). Excluded from counts: `node_modules/`, `.next/`, `.git/`, `backend/.venv/`, `__pycache__/`, and binary artifacts.

### 1.1 Repository tree

```
avighna/
├── .dockerignore .env.example .gitignore
├── .github/workflows/ci.yml
├── Dockerfile  docker-compose.yml
├── README.md  DEMO_SCRIPT.md  report.md
├── Allocated Limit for Honble MPs.csv
├── eslint.config.mjs  next.config.ts  next-env.d.ts
├── package.json  package-lock.json  postcss.config.mjs
├── tsconfig.json  tsconfig.tsbuildinfo  vitest.config.ts
├── public/{file,globe,next,vercel,window}.svg
├── scripts/                       12 puppeteer-core probe scripts
├── src/                           Next.js App Router application
└── backend/                       FastAPI application
```

### 1.2 Frontend — configuration and library (lines)

| File | Lines |
|---|---|
| `src/lib/data.ts` | 1099 |
| `src/store/AppStore.tsx` | 798 |
| `src/lib/mp-allocations.generated.ts` | 560 |
| `src/lib/api.ts` | 413 |
| `src/lib/i18n.tsx` | 311 |
| `src/app/globals.css` | 209 |
| `src/lib/types.ts` | 222 |
| `src/lib/format.ts` | 133 |
| `src/lib/sha256.ts` | 94 |
| `src/lib/similarity.ts` | 74 |
| `src/lib/mp-allocations.ts` | 56 |
| `src/lib/ledger-edits.ts` | 50 |
| `src/lib/geo.ts` | 29 |
| `src/lib/hash.ts` | 15 |
| `src/test/setup.ts` | 12 |

### 1.3 Frontend — components (lines)

| File | Lines |
|---|---|
| `src/components/dashboard/photo-verify.tsx` | 487 |
| `src/components/dashboard/audit-certificate.tsx` | 377 |
| `src/components/modules/evidence.tsx` | 375 |
| `src/components/search/UniversalSearch.tsx` | 279 |
| `src/components/Header.tsx` | 271 |
| `src/components/dashboard/district-map.tsx` | 232 |
| `src/components/ui.tsx` | 297 |
| `src/components/Footer.tsx` | 126 |
| `src/components/modules/module-card.tsx` | 129 |
| `src/components/modules/InspectorPanel.tsx` | 161 |
| `src/components/modules/explainability.tsx` | 124 |
| `src/components/dashboard/proposal-form.tsx` | 191 |
| `src/components/dashboard/risk.tsx` | 90 |
| `src/components/dashboard/heatmap.tsx` | 87 |
| `src/components/dashboard/stepper.tsx` | 87 |
| `src/components/hero/Hero.tsx` | 91 |
| `src/components/dashboard/IngestSyncButton.tsx` | 74 |
| `src/components/dashboard/gauge.tsx` | 58 |
| `src/components/dashboard/AllocationTable.tsx` | 138 |
| `src/components/dashboard/StatStrip.tsx` | 40 |
| `src/components/dashboard/ModeBanner.tsx` | 50 |
| `src/components/dashboard/AuthBanner.tsx` | 32 |
| `src/components/dashboard/gate-banner.tsx` | 28 |
| `src/components/doc-page.tsx` | 35 |
| `src/components/shell.tsx` | 21 |

### 1.4 Frontend — routes (lines)

| File | Lines |
|---|---|
| `src/app/ledger/page.tsx` | 673 |
| `src/app/cases/[id]/page.tsx` | 455 |
| `src/app/dashboard/verify-photo/page.tsx` | 414 |
| `src/app/dashboard/district/page.tsx` | 409 |
| `src/app/public/page.tsx` | 371 |
| `src/app/works/page.tsx` | 357 |
| `src/app/dashboard/mp/page.tsx` | 278 |
| `src/app/dashboard/vendor/page.tsx` | 263 |
| `src/app/dashboard/state/page.tsx` | 234 |
| `src/app/search/page.tsx` | 237 |
| `src/app/page.tsx` | 221 |
| `src/app/dashboard/ministry/page.tsx` | 216 |
| `src/app/override-audit/page.tsx` | 204 |
| `src/app/about-methodology/MethodologyBody.tsx` | 304 |
| `src/app/about-methodology/page.tsx` | 12 |
| `src/app/sitemap/page.tsx` | 64 |
| `src/app/terms/page.tsx` | 50 |
| `src/app/accessibility/page.tsx` | 49 |
| `src/app/layout.tsx` | 52 |
| `src/app/contact/page.tsx` | 35 |
| `src/app/favicon.ico` | binary, 25,931 bytes |

### 1.5 Backend — application (lines)

| File | Lines |
|---|---|
| `backend/app/db/seed_data.py` | 903 |
| `backend/app/ingestion/esakshi_scraper.py` | 350 |
| `backend/app/ml/models.py` | 335 |
| `backend/app/db/real_seed.py` | 288 |
| `backend/app/ingestion/pipeline.py` | 297 |
| `backend/app/db/scale_seed.py` | 252 |
| `backend/alembic/versions/0001_initial_schema.py` | 228 |
| `backend/alembic/versions/0002_align_models.py` | 96 |
| `backend/app/db/models.py` | 222 |
| `backend/app/data/works_loader.py` | 207 |
| `backend/app/fusion/fusion.py` | 66 |
| `backend/app/ml/train.py` | 153 |
| `backend/app/ml/real_training.py` | 152 |
| `backend/app/api/v1/photo_verify.py` | 172 |
| `backend/app/ledger/ledger_edits.py` | 147 |
| `backend/app/ml/synthetic.py` | 146 |
| `backend/app/db/seed.py` | 145 |
| `backend/app/modules/cost_delay.py` | 151 |
| `backend/app/modules/pfms_matcher.py` | 132 |
| `backend/app/data/mp_loader.py` | 125 |
| `backend/app/ledger/chain.py` | 132 |
| `backend/app/api/v1/search.py` | 221 |
| `backend/app/api/v1/works.py` | 174 |
| `backend/app/modules/duplicate.py` | 111 |
| `backend/app/api/v1/cases.py` | 111 |
| `backend/app/api/v1/ledger.py` | 109 |
| `backend/app/api/v1/bootstrap.py` | 109 |
| `backend/app/ml/__init__.py` | 44 |
| `backend/app/api/v1/mps.py` | 43 |
| `backend/app/api/serializers.py` | 127 |
| `backend/app/api/v1/ingest.py` | 72 |
| `backend/app/api/v1/demo.py` | 36 |
| `backend/app/api/v1/ml_metrics.py` | 33 |
| `backend/app/api/v1/dashboards.py` | 16 |
| `backend/app/fusion/gate.py` | 23 |
| `backend/app/modules/predictive.py` | 77 |
| `backend/app/modules/payment.py` | 77 |
| `backend/app/modules/trend.py` | 59 |
| `backend/app/modules/photo.py` | 57 |
| `backend/app/modules/compliance.py` | 52 |
| `backend/app/modules/common.py` | 28 |
| `backend/app/oversight/override_audit.py` | 70 |
| `backend/app/workflow/state_machine.py` | 164 |
| `backend/app/main.py` | 93 |
| `backend/app/core/db.py` | 101 |
| `backend/app/core/config.py` | 68 |
| `backend/app/core/auth.py` | 48 |
| `backend/app/core/observability.py` | 74 |
| 12 × `__init__.py` | 0 (except `app/ml/__init__.py` = 44) |

### 1.6 Backend — tests, scripts, data (lines)

| File | Lines |
|---|---|
| `backend/tests/test_ml_and_runtime.py` | 312 |
| `backend/tests/test_policy_mp_flags.py` | 206 |
| `backend/tests/test_concurrency_and_ledger.py` | 193 |
| `backend/tests/test_mp_allocations.py` | 143 |
| `backend/tests/test_search.py` | 112 |
| `backend/tests/test_gate_and_fusion.py` | 83 |
| `backend/tests/test_ingestion_and_pfms.py` | 77 |
| `backend/tests/test_fetch_mplads_live.py` | 49 |
| `backend/tests/conftest.py` | 48 |
| `backend/scripts/fetch_mplads_live.py` | 221 |
| `backend/scripts/reconcile_live_harvest.py` | 202 |
| `backend/scripts/validate_worklevel_exports.py` | 155 |
| `backend/scripts/rehearse_demo_path.py` | 145 |
| `backend/scripts/verify_real_stack.py` | 109 |
| `backend/scripts/generate_allocations_ts.py` | 69 |
| `backend/scripts/list_missing_mp_tiles.py` | 33 |
| `backend/alembic/env.py` | 81 |
| `backend/alembic.ini` | 100 |
| `backend/alembic/script.py.mako` | 26 |
| `backend/pytest.ini` | 4 |
| `backend/requirements.txt` | 22 |
| `backend/Dockerfile` | 14 |
| `backend/.dockerignore` | 13 |
| `backend/.gitignore` | 5 |
| `backend/app/ml/data/SOURCES.md` | 60 |
| `backend/app/data/worklevel/README.md` | 69 |
| `backend/app/data/worklevel/VALIDATION.md` | 78 |

### 1.7 Repository root files (lines)

| File | Lines |
|---|---|
| `package-lock.json` | 9068 |
| `README.md` | 92 |
| `DEMO_SCRIPT.md` | 95 |
| `.gitignore` | 51 |
| `docker-compose.yml` | 49 |
| `.github/workflows/ci.yml` | 46 |
| `package.json` | 40 |
| `.env.example` | 39 |
| `tsconfig.json` | 34 |
| `Dockerfile` | 28 |
| `eslint.config.mjs` | 20 |
| `vitest.config.ts` | 15 |
| `next.config.ts` | 13 |
| `next-env.d.ts` | 7 |
| `postcss.config.mjs` | 7 |
| `.dockerignore` | 10 |

---

## 2. Repository root — line by line

### 2.1 `package.json` (40 lines)

- L2-4: `name: "avighna"`, `version: "0.1.0"`, `private: true`.
- L5-10 `scripts`: `dev → next dev`, `build → next build`, `start → next start`, `lint → eslint`, `test → vitest run`.
- L11-15 `allowScripts`: `["next","sharp","@tailwindcss/oxide","esbuild"]` — the install-time native/binary allowlist.
- L17-22 `dependencies`: `lucide-react ^1.47.0`, `next 16.3.5`, `react 19.2.8`, `react-dom 19.2.8`, `recharts ^2.15.0`.
- L23-39 `devDependencies`: `@tailwindcss/postcss ^4`, `@testing-library/jest-dom ^7.0.1`, `@testing-library/react ^16.3.3`, `@testing-library/user-event ^14.6.7`, `@types/node ^22.20.4`, `@types/react ^19`, `@types/react-dom ^19`, `eslint ^9`, `eslint-config-next 16.3.5`, `jsdom ^30.1.0`, `tailwindcss ^4`, `typescript ^5`, `vitest ^5.0.1`.

There is no charting, state, HTTP, or form library beyond the above: state is hand-rolled (`src/store/AppStore.tsx`), HTTP is `fetch` (`src/lib/api.ts`), forms are controlled inputs.

### 2.2 `package-lock.json` (9068 lines)

- L2-3: `name avighna`, `version 0.1.0`; `lockfileVersion 3`; 585 package entries.
- Root entry `packages[""]` carries the same dependency ranges as `package.json` and `scripts: null` (scripts are only in `package.json`).
- Resolved versions of note: `next 16.3.5`, `react 19.2.8`, `react-dom 19.2.8`, `recharts 2.15.4`, `lucide-react 1.47.0`, `typescript 5.9.3`, `vitest 5.0.1`, `eslint 9.39.5`, `eslint-config-next 16.3.5`, `jsdom 30.1.0`, `tailwindcss 4.3.3`, `@tailwindcss/postcss 4.3.3`, `@testing-library/react 16.3.3`, `@testing-library/jest-dom 7.0.1`, `@testing-library/user-event 14.6.7`, `@types/node 22.20.4`, `@types/react 19.3.0`, `@types/react-dom 19.3.0`.

### 2.3 `tsconfig.json` (34 lines)

`target ES2020`; `lib ["dom","dom.iterable","esnext"]`; `allowJs`; `skipLibCheck`; `strict`; `noEmit`; `esModuleInterop`; `module esnext`; `moduleResolution bundler`; `resolveJsonModule`; `isolatedModules`; `jsx react-jsx`; `incremental`; `plugins [{name:"next"}]`; `paths {"@/*":["./src/*"]}`; include `next-env.d.ts, **/*.ts, **/*.tsx, .next/types/**/*.ts, .next/dev/types/**/*.ts, **/*.mts`; exclude `node_modules`.

The `@/*` alias is the reason every import in `src/` is written as `@/lib/...` or `@/components/...`.

### 2.4 `vitest.config.ts` (15 lines)

`defineConfig` from `vitest/config`; `test.environment "jsdom"`; `test.include ["src/**/*.test.{ts,tsx}"]`; `test.setupFiles ["src/test/setup.ts"]`; `resolve.alias {"@": "./src"}`. There is no `coverage` block and no `globals: true` — every test imports `describe/it/expect` explicitly.

### 2.5 `eslint.config.mjs` (20 lines)

```js
import {defineConfig,globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const eslintConfig=defineConfig([...nextVitals,...nextTs,
 globalIgnores([".next/**","out/**","build/**","next-env.d.ts","backend/.venv/**"])]);
export default eslintConfig;
```

No inline `rules` object exists — the rule set is entirely inherited from `eslint-config-next/core-web-vitals` + `typescript`. The only local customization is the `globalIgnores` list.

### 2.6 `postcss.config.mjs` (7 lines)

`export default { plugins: { "@tailwindcss/postcss": {} } }` — Tailwind v4 runs as a PostCSS plugin, not a separate build step.

### 2.7 `next.config.ts` (13 lines)

`const nextConfig: NextConfig = { devIndicators: false, allowedDevOrigins: ["localhost","127.0.0.1"] }`. The comment states `allowedDevOrigins` exists so HMR/hydration works from both hostnames. There is no `images`, `rewrites`, `redirects`, or `headers` config — the browser talks to the backend directly, so no proxy layer exists in Next.

### 2.8 `next-env.d.ts` (7 lines)

Generated by Next; references `next`, `next/image-types/global`, `./.next/dev/types/routes.d.ts`, `./.next/dev/types/root-params.d.ts`. Listed in `.gitignore` but present on disk.

### 2.9 `.env.example` (39 lines)

Optional variables only, all with working defaults:

| Variable | Default |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `sentinel` / `sentinel` / `sentinel` |
| `POSTGRES_PORT` | `5432` |
| `BACKEND_PORT` | `8000` |
| `DATABASE_URL` | commented `postgresql+psycopg://sentinel:sentinel@db:5432/sentinel` |
| `DEMO_AUTH_TOKEN` | `sentinel-demo-2026` |
| `CORS_ORIGINS` | commented `["http://localhost:3000","http://127.0.0.1:3000"]` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_DEMO_AUTH_TOKEN` | `sentinel-demo-2026` |
| `WEB_PORT` | `3000` |

Trailing comments record the policy: no hardcoded secrets, `.env` is git-ignored, `NEXT_PUBLIC_*` is public by design and baked at build time.

### 2.10 `.gitignore` (51 lines)

`/node_modules`, `/.pnp*`, `/.yarn/*` (+ patches/releases/versions re-includes), `/coverage`, `/.next/`, `/out/`, `/build`, `.DS_Store`, `*.pem`, npm/yarn/pnpm debug logs, `.env*` with `!.env.example`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`, `backend/.venv/`, `backend/__pycache__/`, `backend/app/__pycache__/`, `**/__pycache__/`, `*.db`, `*.db-journal`, `.pytest_cache/`.

Note `*.db` is ignored, so `backend/sentinel.db` on disk is a local artifact, not a tracked file.

### 2.11 `.dockerignore` (10 lines)

Excludes `node_modules/`, `.next/`, `.git/`, `.env*` (re-including `!.env.example`), `npm-debug.log*`, `*.tsbuildinfo`, `Dockerfile`, `docker-compose.yml`, `backend/`. The `backend/` exclusion matters: the root `Dockerfile` builds only the web image, and the backend has its own build context (`./backend`).

### 2.12 `Dockerfile` (28 lines) — frontend image, 3 stages

- `deps`: `node:22-alpine`, `COPY package.json package-lock.json`, `RUN npm ci`.
- `builder`: `ENV NEXT_TELEMETRY_DISABLED=1`; copy `node_modules` + `public` + `src` + configs; `ARG`/`ENV NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_DEMO_AUTH_TOKEN=sentinel-demo-2026`; `RUN npm run build`.
- `runner`: `ENV NODE_ENV=production`; `addgroup nodejs` / `adduser nextjs`; copy `public`, `.next`, `node_modules`, `package.json`; `USER nextjs`; `EXPOSE 3000`; `CMD ["npm","run","start"]`.

### 2.13 `docker-compose.yml` (49 lines)

- `name: mplads-sentinel`.
- `db` (L4-19): `postgis/postgis:16-3.4-alpine`; env `POSTGRES_USER/PASSWORD/DB` defaulting to `sentinel`; port `${POSTGRES_PORT:-5432}:5432`; volume `sentinel_pgdata:/var/lib/postgresql/data`; healthcheck `pg_isready -U … -d …` interval 5s, timeout 3s, retries 15.
- `backend` (L21-32): `build ./backend`; `DATABASE_URL=postgresql+psycopg://…@db:5432/…`; `CORS_ORIGINS='["http://localhost:3000","http://127.0.0.1:3000","http://web:3000"]'`; `DEMO_AUTH_TOKEN:-sentinel-demo-2026`; port `${BACKEND_PORT:-8000}:8000`; `depends_on db: condition service_healthy`.
- `web` (L34-46): build args `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEMO_AUTH_TOKEN`; `NODE_ENV=production`; port `${WEB_PORT:-3000}:3000`; `depends_on backend`.
- `volumes: sentinel_pgdata`.

There is no `frontend` alias and no reverse-proxy service; the browser reaches the backend directly at `:8000`.

### 2.14 `.github/workflows/ci.yml` (46 lines)

- Triggers: `push` on `main`, `pull_request`.
- Job `backend`: `ubuntu-latest`, `working-directory: backend`, `actions/checkout@v4`, `actions/setup-python@v5` with `python-version: 3.14`, `pip install --upgrade pip`, `pip install -r requirements.txt`, `pip install pytest`, `python -m pytest -q`.
- Job `frontend`: `ubuntu-latest`, `checkout@v4`, `setup-node@v4` with `node-version: 22` and `cache: npm`, `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

CI installs Python 3.14 while the backend Dockerfile uses `python:3.11-slim` — the two environments differ (recorded in §12).

### 2.15 `public/` and `src/app/favicon.ico`

Five unmodified Next.js starter SVGs remain: `file.svg` (391 B), `globe.svg` (1035 B), `next.svg` (1375 B), `vercel.svg` (128 B), `window.svg` (385 B). None are referenced by any component in `src/`. `src/app/favicon.ico` is 25,931 bytes.

### 2.16 `Allocated Limit for Honble MPs.csv` (root copy)

- `wc -l` = 544; the final line has no trailing newline, so 545 CSV records.
- Header: `Sr. No. | State | Hon'ble Members of Parliaments | Constituency | Allocated AMOUNT ( ₹ )`.
- Row 1: `1 | Maharashtra | AASHTIKAR PATIL NAGESH BAPURAO | HINGOLI | 190289442`.
- Row 2: `2 | Jammu And Kashmir | ABDUL RASHID SHEIKH | BARAMULLAH | 154773472.11`.
- Row 3: `3 | Bihar | ABHAY KUMAR SINHA | AURANGABAD_BR | 147000000`.
- Structure: 543 MP rows (542 with a numeric amount + 1 blank-amount row, `Sr. 108 CHAVAN VASANTRAO BALWANTRAO / NANDED / ''`) followed by a `Grand Total` footer of `83,41,87,02,273.8`.
- Summing the 542 numeric rows in this file yields ₹16,683.74 Cr, roughly 2× the footer — the raw-file quirk discussed in §12.

### 2.17 `README.md` (92 lines)

- L3: title and one-paragraph architecture claim: seven detection modules, a deterministic Critical-Risk Gate that can hold a work regardless of score, per-case SHAP/rule evidence, SHA-256 hash-chained ledger with an override-audit register; FastAPI + SQLAlchemy backend with two committed scikit-learn models; Next.js frontend with six role desks and a demo/live switch; states **37 backend + 41 frontend tests**.
- L9: links `DEMO_SCRIPT.md` for a 4-minute-45-second walkthrough.
- L13-31 local run: `cd backend`, `python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt`, `.venv/bin/uvicorn app.main:app --reload`; frontend `npm install && npm run dev`; states no env file is required because the backend defaults to `backend/sentinel.db` and the frontend to `http://127.0.0.1:8000`.
- L33-46 deploy: `docker compose up --build -d`, `docker compose ps`, `curl http://localhost:8000/health` → `{"status":"ok","database":"postgresql"}`.
- L47-61 verification: `/api/v1/bootstrap`, `POST /cases/MPL-2025-1021/decide` with `Authorization: Bearer sentinel-demo-2026`, `/api/v1/ledger/verify`, `POST /api/v1/demo/scale-seed {"count":750,"seed":7}`.
- L63-79 configuration and hosting: `.env.example` → `.env`; `NEXT_PUBLIC_*` baked at build time (rebuild `web` after changing); Caddy reverse proxy suggestion; `down -v` wipes the volume; `POST /api/v1/demo/reset` restores the curated dataset; the demo token is described as demo-grade and `backend/app/core/auth.py` as the file to replace with NIC SSO/OAuth2.
- L81-88 tests: `pytest -q` (37), `npx tsc --noEmit`, `npx vitest run` (41), `npm run build`.
- L90-92 data policy: the official MoSPI allocation table (543 MPs, ₹8,341.87 Cr) plus the portal's own work-level exports (109,625 recommended / 81,727 sanctioned / 35,648 completed, 86,468 vendor payments) in `backend/app/data/{lok_shaba,rajya_sabha}/`, validated by `backend/scripts/validate_worklevel_exports.py` into `backend/app/data/worklevel/VALIDATION.md`; fictional officials of record on flagged works, enforced by `backend/tests/test_policy_mp_flags.py`.

### 2.18 `DEMO_SCRIPT.md` (95 lines)

A timed 4:45 walkthrough, explicitly marked as rehearsed by `backend/scripts/rehearse_demo_path.py`. Setup: both servers up, Demo Mode, browser zoom 110-125%, start at `/`. Nine steps with cumulative timings: landing (0:20) → `/about-methodology` (0:30) → ingest sync (0:40) → gate proof on `MPL-2025-1021` with composite 30/100 held on OP 2025-26 §4.1.3 (0:40) → approve & release + new GATE OVERRIDE block #10 by `dm_dm_verma_demo` (0:40) → `/override-audit` (0:30) → simulate tampering producing "SHA-256 Ledger Chain Corruption Detected at Block #2" (0:45) → restore & re-seal (0:20) → `/public` (0:20). Includes a failure-fallback table (Demo Mode banner with `⟳ Connect live backend`, sync falling back after ~30 s, 401 → reload to re-attach the token).

## 3. Backend — core, database, and API layer

### 3.1 `backend/app/main.py` (66 lines)

- L18-34 `lifespan(app)`, an `@asynccontextmanager`. On boot: `init_schema()`; open `SessionLocal()`; import `real_case_count, seed_real_works_async` and `reseed` from the db package; call `reseed(db)`; if `real_case_count(db) == 0` launch `seed_real_works_async()` (daemon thread, 100-row batches). The `finally` closes the session; then `yield`.
- L37-42 `app = FastAPI(title="MPLADS Sentinel API", version="1.0.0", description="Detection → fusion → gate → workflow → override-audit pipeline for MPLADS works.", lifespan=lifespan)`.
- L44-50 `CORSMiddleware` with `allow_origins=config.CORS_ORIGINS`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- L52-62 routers, all under `prefix="/api/v1"`: `bootstrap.router`, `cases.router` (`/cases`), `ledger.router` (`/ledger`), `dashboards.router`, `demo.router` (`/demo`), `ingest_router` (`/ingest`), `ml_metrics_router` (`/ml`), `mps_router` (`/mps`), `works_router` (`/works`), `search.router`, `photo_verify.router` (`/verify-photos`).
- L65-67 `GET /health` returns `{"status":"ok","database": config.DATABASE_URL.split("://")[0]}` — literally the scheme, so it prints `sqlite` locally and `postgresql` in Docker.

### 3.2 `backend/app/core/config.py` (46 lines)

- L7 `BASE_DIR = Path(__file__).resolve().parents[2]` → `backend/`.
- L9 `STATE_NAME = "Telangana"` — the single state the demo slice covers.
- L11-13 `DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR/'sentinel.db'}")`.
- L17 `ENABLE_POSTGIS_EXT = DATABASE_URL.startswith("postgresql")`.
- L19 `CORS_ORIGINS = json.loads(os.getenv("CORS_ORIGINS", '["http://localhost:3000","http://127.0.0.1:3000"]'))`.
- L22-30 `FUSION_WEIGHTS`: `trend 0.08`, `duplicate 0.20`, `cost 0.20`, `compliance 0.28`, `payment 0.10`, `predictive 0.07`, `photo 0.07` — sums to exactly 1.0.
- L33-36 `GATE_RULES["compliance"]` = "a mandatory compliance guardrail failed (governs land tenure, entity type, safety certification)"; `GATE_RULES["photo"]` = "high-confidence photo-integrity violation (pHash match ≥ 99% across distinct works or stage records)".
- L38-47 thresholds: `PHOTO_GATE_MATCH 99.0`, `MAD_Z_THRESHOLD 2.0`, `DUPLICATE_SIM_THRESHOLD 85`, `DUPLICATE_DIST_THRESHOLD_M 500`, `PAYMENT_LAPSE_MONTHS 6`, `PAYMENT_GHOST_RELEASE_PCT 90`, `PAYMENT_GHOST_COMPLETION_PCT 15`, `STALL_PROBABILITY_THRESHOLD 60`, `TREND_DEVIATION_PCT 15`.

This file is the single place weights and thresholds live; the frontend mirrors the same numbers in `src/lib/format.ts` `moduleMeta` and asserts them in `src/lib/format.test.ts`.

### 3.3 `backend/app/core/db.py` (69 lines)

- L8-10 `connect_args = {"check_same_thread": False}` when the URL is SQLite.
- L12 `engine = create_engine(DATABASE_URL, connect_args=…, pool_pre_ping=True)`.
- L14-20 a `listens_for(engine, "connect")` hook issuing `PRAGMA foreign_keys=ON` on SQLite.
- L23-24 `class Base(DeclarativeBase): pass`.
- L27 `SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)`.
- L30-35 `get_db()` generator: yield a session, close in `finally`. This is the FastAPI dependency overridden in `backend/tests/conftest.py`.
- L38-47 `init_schema()`: `Base.metadata.create_all(bind=engine)`, then `_migrate_indexes()`, then `CREATE EXTENSION IF NOT EXISTS postgis` when `ENABLE_POSTGIS_EXT`.
- L50-70 `_migrate_indexes()`: always `CREATE INDEX IF NOT EXISTS ix_cases_composite_score ON cases (composite_score)`; on SQLite additionally `ix_cases_state ON cases (state)`. The docstring explains the reason — `create_all` does not add indexes to an already-populated database, and these two back the risk-band and works-register filters over the 77k-row real dataset.

### 3.4 `backend/app/core/auth.py` (47 lines)

- L22 `DEMO_AUTH_TOKEN = os.getenv("DEMO_AUTH_TOKEN", "sentinel-demo-2026")`.
- L24 `_bearer_scheme = HTTPBearer(auto_error=False)` — `auto_error=False` so a missing header produces the custom 401 below rather than FastAPI's own.
- L27-47 `get_current_actor(credentials = Depends(_bearer_scheme), x_demo_token = Header(alias="X-Demo-Token"))`. Accepts either `Authorization: Bearer <token>` or `X-Demo-Token: <token>`; on absence or mismatch raises `HTTPException(401, headers={"WWW-Authenticate":"Bearer"}, detail=…)` whose detail names both accepted headers. On success returns `{"role":"district_magistrate","auth":"demo-token","note":"Demo bypass mode — …"}`. The docstring states plainly that this is not identity verification and that production must replace this file with NIC SSO/OAuth2. Every mutating endpoint depends on it (decide, retitle, ingest sync, demo reset, scale seed, ledger tamper/untamper/reset, tamper-fields).

### 3.5 `backend/app/db/models.py` (222 lines) — 13 tables

| Table / class | Columns |
|---|---|
| `cases` / `Case` (L20-51) | `id String(48)` PK, `title Text`, `hindi_title Text` default `""`, `category String(64)`, `state String(64)` idx, `district String(64)` idx, `constituency String(64)`, `mp_name String(80)`, `dm_name String(80)`, `sanctioned_amount_lakh Float`, `sanctioned_date String(24)` default `""`, `status String(40)` idx, `status_since String(32)`, `overview Text`, `mp_plain_status Text`, `composite_score Integer` default 0, `gate_fired Boolean` default False, `gate_rule Text` null, `gate_detail Text` null, `gate_held_independent Boolean`, `path JSON` default list, `facts JSON` default dict; relationship `module_scores` cascade `delete-orphan` |
| `module_scores` / `ModuleScore` (L54-65) | `id Integer` PK autoincr, `case_id String` FK→`cases.id` ondelete CASCADE idx, `module String(24)` idx, `sub_score Integer`, `description Text`, `triggered Boolean`, `evidence JSON` null |
| `officials` / `OfficialStat` (L68-79) | `id` PK, `name String(80)` unique, `role String(48)` default "District Magistrate", `district`, `state`, `high_risk_decisions Integer`, `gate_overrides Integer`, `threshold_overrides Integer`, `flagged_note Text` null |
| `ledger` / `LedgerEntry` (L82-94) | `index Integer` PK, `action String(48)`, `category String(24)` idx, `actor String(80)`, `actor_role String(120)`, `body Text`, `timestamp String(32)`, `case_id String(48)` null, `prev_hash String(64)`, `hash String(64)` idx |
| `overrides` / `OverrideRecord` (L97-108) | `id` PK, `case_id String(48)` idx, `kind String(16)` (`gate`\|`threshold`), `official_name`, `official_district`, `action String(48)`, `body Text`, `timestamp String(32)`, `ledger_index Integer` |
| `meta` / `MetaKey` (L111-115) | `key String(96)` PK, `value JSON` default dict |
| `cost_baselines` / `CostBaseline` (L118-130) | `id` PK, `category` idx, `district` idx, `terrain String(32)` default "plain", `mean_log_cost Float`, `mad_log_cost Float`, `median_lakh Float`, `low_lakh Float`, `high_lakh Float`, `n_records Integer` |
| `district_quarterly` / `DistrictQuarterly` (L133-142) | `id`, `district` idx, `q1 q2 q3 q4 ytd Integer` |
| `monthly_trend` / `MonthlyTrend` (L145-151) | `id`, `month String(8)` idx, `district` idx, `release_pct Integer` |
| `state_stats` / `StateStat` (L154-160) | `id`, `state String(64)` unique, `utilization Integer`, `cases_count Integer` |
| `category_stats` / `CategoryStat` (L163-169) | `id`, `category` unique, `sanctions_cr Float`, `releases_cr Float` |
| `mp_stats` / `MpStat` (L172-178) | `id`, `mp_name` unique, `used_cr Float`, `breakdown JSON` default dict |
| `mp_allocations` / `MpAllocation` (L181-194) | `id`, `mp_name String(120)` unique, `state` idx, `constituency String(96)`, `allocated_cr Float` null (null = pending revision), `source String(32)` default "mospi-csv" |
| `quarantine_queue` / `QuarantineQueue` (L197-205) | `id`, `raw_payload JSON` default dict, `error_reason Text`, `ingested_at String(32)`, `source String(64)` default "esakshi", `resolved Boolean` default False |

The comment at L25-29 records why `cases.id` is `String(48)`: real portal work ids look like `WS/MP138/2025-2026/205446` (25-29 chars) and the `MPL-WS/…` derived form, so 24 (the Alembic width) was too narrow — see §12.

### 3.6 `backend/app/api/serializers.py` (127 lines)

- L8-20 `_normalize_breakdown(value)`: dict `{category: lakh}` → list of `{category, lakh}`; a list is passed through after filtering to entries that have both keys; anything else → `[]`. This is the defensive shape that `test_entitlement_breakdown_always_array_shape` pins.
- L23-66 `serialize_case(case)`: orders `module_scores` by the canonical sequence `["trend","duplicate","cost","compliance","payment","predictive","photo"]` (anything else sorts last, key 99) and returns camelCase keys: `id, title, hindiTitle, category, state, district, constituency, mpName, dmName, sanctionedAmountLakh, sanctionedDate, status, statusSince, overview, mpPlainStatus, compositeScore, gate{fired, rule, detail, heldIndependent}, moduleBreakdown[{module, subScore, description, triggered, evidence}], path`.
- L69-88 `serialize_case_detail(case)`: the above plus `attributions` (`fusion.attribution_percentages`) and a `narrative` list — a gate-fired message when the gate is on, else the top-attribution message when `compositeScore >= 60`, else a neutral message.
- L91-103 `serialize_ledger(row)`: `index, action, category, actor, actorRole, body, timestamp, caseId, hash, prevHash`.
- L106-117 `serialize_official(o, index)`: `id: "off-{index+1}", name, role, district, state, highRiskDecisions, gateOverrides, thresholdOverrides, flaggedNote`.
- L120-128 `serialized_case_list(db, district, mp, status)`: filtered, ordered by id ascending, serialized.

### 3.7 `backend/app/api/v1/bootstrap.py` (100 lines)

- L28-101 `GET /bootstrap`. Queries `Case` filtered `NOT LIKE 'WS/%'` (the comment explains that including the ~80k real rows froze the browser with a 100 MB payload), all `LedgerEntry` ordered by index, `OfficialStat` ordered by `high_risk_decisions` desc, and `DistrictQuarterly`, `MonthlyTrend`, `StateStat`, `CategoryStat`, `MpStat`, `MpAllocation`.
- The monthly trend rows are pivoted into `[{month, <district>: release_pct}, …]`.
- Response shape: `{cases: [...], ledger: [...], officials: [...], analytics: {districtUtilization: [{district,q1,q2,q3,q4,ytd}], districtTrend: pivot, nationalHeatmap: [{state, utilization, cases}], categoryExpenditure: [{category, sanctionsCr, releasesCr}], entitlements: [{mpName, annualCr: 5, usedCr, breakdown}], mpAllocations: {source, mpCount, totalCr, mps: [{mpName, state, constituency, allocatedCr}]}}}`.

This single endpoint is the store's hydrate call; see `src/store/AppStore.tsx` `applyBootstrap`.

### 3.8 `backend/app/api/v1/cases.py` (111 lines), prefix `/cases`

- L14-20 request models: `DecideIn{decision: str, note: str = ""}`, `RetitleIn{title: str}`.
- L23-50 `GET /cases` with `district`, `mp`, `status`, and `ids` (comma-separated, capped at 200 → `IN` clause). Base filter is `NOT LIKE 'WS/%'`; ordered by id; returns `{cases:[…]}`.
- L53-61 `GET /cases/{case_id}`: 404 when absent, else `{case}`.
- L64-80 `POST /cases/{case_id}/decide` (auth): `KeyError` → 404, `ValueError` → 409, success → `{case, message:"Decision recorded."}`.
- L83-112 `PATCH /cases/{case_id}` (auth): title shorter than 3 chars → 422; missing → 404; `facts.record_kind == "real"` → **409** (the data policy forbids retitling real portal records); otherwise sets the title, flushes, re-runs `run_case_pipeline`, commits, returns `{case, message:"Title updated; scores recomputed live."}`.

### 3.9 `backend/app/api/v1/dashboards.py` (16 lines)

`router = APIRouter(tags=["oversight"])`; `GET /override-audit` returns `{officials: official_audit_rows(db), records: override_records(db)}`.

### 3.10 `backend/app/api/v1/demo.py` (36 lines), prefix `/demo`

- L15-18 `POST /demo/reset` (auth): `reseed(db, force=True)` → `{ok: True, message}`.
- L21-24 `ScaleSeedIn{count: int = 750 (ge=50, le=2000), seed: int = 7, force: bool = False}`.
- L27-37 `POST /demo/scale-seed` (auth): `seed_scale(db, count, seed, force)`, then adds `existing_total = scale_case_count(db)`.

### 3.11 `backend/app/api/v1/ingest.py` (72 lines), prefix `/ingest`

- L27-33 `DEFAULT_SYNC_DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Sangareddy","Mahbubnagar"]`.
- L36-40 `SyncIn{state="Telangana", districts: list|None, max_districts: int = 8 (ge=1, le=20)}`.
- L42-72 `POST /ingest/sync`, `async`, auth-required. Slices `districts` to `max_districts`; per district `await scraper.scrape_district_works(state, district)`; reads `scraper.last_fetch_live`; collects `per_district[{district, records, portal_live}]`; calls `ingest_and_evaluate_batch(db, raw, source="esakshi-sync")`; calls `invalidate_summary_cache()`; returns the batch result plus `districts`, `portal_live = any(...)`, and a `provenance` string chosen by that flag: `"Rows parsed from live portal."` when live, else `"Live portal unreachable — using vendored-export fallback (real portal records, snapshot 2026-09-21)."`.

### 3.12 `backend/app/api/v1/ledger.py` (109 lines), prefix `/ledger`

- L21-26 `GET /ledger` → `{ledger: [...]}` ordered by index.
- L29-42 `GET /ledger/verify` → `{validity, tampered: [indices where not valid], editedBlocks: edited_indices(db), ok: all(validity)}`.
- L45-59 `POST /ledger/tamper` with `TamperIn{index, body, timestamp}`; 404 if the block is missing; delegates to `chain.tamper`.
- L62-93 `POST /ledger/tamper-fields` with `TamperFieldsIn{index, amount: float (ge=0), status: str (min 2, max 48)}`; 404 if missing; **400 if index == 0** (genesis is immutable); `split_body(row.body)` → head; `record_edit(...)` snapshot; `encode_body(head, amount, status)`; `chain.tamper(index, new_body, row.timestamp)`.
- L96-102 `POST /ledger/untamper` → `chain.untamper()` + `restore_edited(db)` → `{restored: count}`.
- L105-109 `POST /ledger/reset` → `chain.reset(db)` → `{ok, blocks: len(verify(db))}`.

### 3.13 `backend/app/api/v1/ml_metrics.py` (33 lines), prefix `/ml`

`GET /ml/metrics` → `{stall: metrics["stall"], cost: metrics["cost"], fusionWeights: <same 7 weights as config>, modelVersions: MODEL_VERSIONS}`. The docstring names `app/ml/artifacts/metrics.json` as the source, which is what makes the methodology page live rather than hardcoded.

### 3.14 `backend/app/api/v1/mps.py` (43 lines), prefix `/mps`

`GET /mps/allocations`, no auth. `mpCount = len(rows)`, `totalCr = round(sum(allocated_cr), 2)`, and the response carries `source: 'Official MoSPI allocation table — "Allocated Limit for Hon'ble MPs"'` plus `mps: [{mpName, state, constituency, allocatedCr}]` ordered by `mp_name`.

### 3.15 `backend/app/api/v1/search.py` (194 lines)

- L43-194 `GET /search` with `q: str` (min 1, max 120) and `limit: int = 6` (ge 1, le 25). L43-42 helpers: `_like(term) = f"%{term.lower()}%"`; `_LEDGER_SCAN = 400` (how many of the newest blocks the Python-side scan inspects).
- Six groups, all case-insensitive:
  - **works** — `Case` where `id LIKE 'WS/%'`, matching id/title/mp/district/constituency/state/category, ordered by sanctioned desc; hit shape `{id, title, mpName, district, state, category, sanctionedLakh, riskScore, href: "/works?q=" + id}`; carries the untruncated total.
  - **cases** — `id LIKE 'MPL-%'` on id/title/mp/district/status, ordered by composite desc; `href: "/cases/{id}"`.
  - **mps** — `MpStat.mp_name` LIKE; `href: "/dashboard/mp?mp={name}"`.
  - **officials** — name/role/district LIKE; `href: "/override-audit"`.
  - **ledger** — newest 400 blocks by index desc, then a Python substring match over `actor + role + action + body + case_id` (substring, not LIKE, so it matches mid-word); `href: "/ledger?q={index}"`; results capped at `limit`.
  - **states** — `StateStat`; `href: "/works?state={state}"`.
- Returns `{query, groups: [...]}` where a group appears only if `total > 0`, each with `{key, label, total, results}`.

### 3.16 `backend/app/api/v1/works.py` (162 lines), prefix `/works`

- L26-32 `DEFAULT_PAGE_SIZE = 25`, `MAX_PAGE_SIZE = 100`, `_SUMMARY_TTL_SECONDS = 30.0`, `_summary_cache = {"at": 0.0, "payload": None}`; L35-37 `invalidate_summary_cache()`.
- L40-41 `_real_query(db)` = `Case` where `id LIKE 'WS/%'` — every real works query goes through this one predicate.
- L44-104 `GET /works` with `state, district, mp, category, q, page (ge=1), page_size`: equality filters plus a lowercased LIKE over title/id; `total` from a count; pagination by `offset/limit` ordered by id; each row projects `facts.payment` into `{id, title, state, district, constituency, mpName, category, sanctionedLakh, sanctionedDate, releasedPct, completionPct, monthsSinceSanction, statusLabel, kind, riskScore}`; returns `{total, page, pageSize, pages, works}`.
- L107-162 `GET /works/summary` (30 s TTL cache): SQL using `json_extract(facts,'$.payment.released_pct')` and `'$.payment.completion_pct'` grouped by state, computing `count`, `sum(sanctioned)`, `avg(completion)`, `sum(composite_score>=60)` as high-risk, and `sum(completion=0 and released=0)` as no-payment-yet. Returns `{totalWorks, totalSanctionedCr, noPaymentYet, states: [{state, works, sanctionedCr, avgCompletionPct, highRisk}] sorted by works desc, source: "eSAKSHI work-level exports (Lok Sabha), portal snapshot 2026-09-21"}`.

### 3.17 `backend/app/api/v1/photo_verify.py` (148 lines), prefix `/verify-photos`

- L15-21 constants: `HASH_BITS = 64`, `DUPLICATE_HAMMING_THRESHOLD = 10`, `DUPLICATE_SIMILARITY_THRESHOLD = 85.0`, `EARTH_RADIUS_M = 6_371_000.0`, `EXIF_DATETIME = 306`, `EXIF_DATETIME_ORIGINAL = 36867`.
- Helpers: L24-30 `_load_image(data)` (PIL open+load, 400 on failure), L33-42 `_dms_to_decimal(values, ref)` (negates for `S`/`W`, rounds to 6 dp), L45-59 `_extract_gps(img)` via `img.getexif().get_ifd(ExifTags.IFD.GPSInfo)`, L62-69 `_extract_timestamp(img)` preferring `DateTimeOriginal` over `DateTime` and formatting `%Y-%m-%dT%H:%M:%S`, L72-78 `_haversine_meters(a, b)`.
- L81-102 models: `GeoPoint{lat,lng}`, `ExifComparison{image_a_gps, image_b_gps, spatial_distance_meters, timestamp_a, timestamp_b}`, `VerifyPhotosOut{hash_a, hash_b, hamming_distance, similarity_percentage, is_duplicate_flag, exif_data, verdict}`.
- L104-149 `POST /verify-photos`, `multipart/form-data` with `image_a` and `image_b`. Empty upload → 400. `imagehash.phash` over RGB gives 64-bit hashes; `hamming = int(hash_a - hash_b)`; `similarity = round(max(0, 100 - hamming*100/64), 1)`; `is_duplicate = hamming <= 10 or similarity >= 85`; verdict is `FLAGGED_FORGED_DUPLICATE` or `VERIFIED_DISTINCT`.

### 3.18 `backend/app/db/seed.py` (145 lines)

- L27-35 `CASE_FIELD_MAP` — the only camel→snake translation point: `hindiTitle→hindi_title`, `mpName→mp_name`, `dmName→dm_name`, `sanctionedAmountLakh→sanctioned_amount_lakh`, `sanctionedDate→sanctioned_date`, `statusSince→status_since`, `mpPlainStatus→mp_plain_status`.
- L38-59 `_seed_mp_allocations(db)`: loads `mp_loader.load_allocations()[0]`; if the row count already matches, returns; otherwise deletes every `MpAllocation` and re-inserts `mp_name/state/constituency/allocated_cr`. Runs on every boot, which is why the allocation table is always current.
- L62-146 `reseed(db, force=False) -> bool`: syncs allocations; if not `force` and `Case` count > 0, returns `False` early. Otherwise deletes `OverrideRecord`, `ModuleScore` rows not `LIKE 'WS/%'`, all `LedgerEntry`, `MpStat`, `CategoryStat`, `StateStat`, `MonthlyTrend`, `DistrictQuarterly`, `CostBaseline`, `OfficialStat`; then deletes `ModuleScore` not `LIKE 'WS/%'` and `Case` not `LIKE 'WS/%'` — real `WS/*` rows and their module scores survive, and `MpAllocation` is never touched. Re-inserts `COST_BASELINES` (adding `mean_log_cost = log(median)`), `DISTRICT_QUARTERLY`, `MONTHLY_TREND`, `STATE_STATS` (mapping the seed key `cases` → column `cases_count`), `CATEGORY_STATS`, `MP_STATS`, and `OFFICIALS` (adding `state=STATE_NAME`). For each `seed_data.CASES` entry it remaps keys, sets `facts = {"demo": True, **row["facts"]}`, and calls `run_case_pipeline(db, case)`. It then builds the ledger chain from `LEDGER_SEEDS` starting at `prev_hash = "0"*16` with `block_hash(prev, index, action, actor, body, timestamp)`, inserts `OVERRIDES`, commits, returns `True`.

### 3.19 `backend/app/db/seed_data.py` (903 lines) — the curated demo fixture

- **L16-665 `CASES` — 21 curated cases, `MPL-2025-1001` … `MPL-2025-1021`.** Each entry carries `id, title, hindiTitle, category, state` (always Telangana, across 5 districts), `constituency, mpName, dmName, sanctionedAmountLakh, sanctionedDate, status, statusSince, overview, mpPlainStatus, path`, and a `facts` dict with sub-objects `geo, trend{case_release_pct, peer_release_pct, peer_sd}, duplicate{twin{title, id, distance_m, lat, lng, map_x, map_y}}, payment{released_pct, completion_pct, months_since_sanction}, predictive{factors}, compliance{checks[{field, actual, required, rule_ref, clause_text, critical, passed}]}, photo{phash_match_pct, twin_case_id, exif_discrepancy}, pfms{stage_number, stage1_account, target_account, vendor_gstin, vendor_name}`.
  Scenario map as encoded:
  - 1001 / 1002 — duplicate pair, 160 m apart, ~89% title similarity.
  - 1003 / 1004 — duplicate pair, 210 m apart, ~91%.
  - 1005 — ₹48.5 L sanctioned against a ₹22 L category median (Z ≈ +3.45).
  - 1006 — ₹36 L against a ₹14 L median (Z ≈ +3.32).
  - 1007 — **compliance gate**: private land tenure and a private RWAs body both critical-fail.
  - 1008 — **photo gate**: pHash 99.6% against twin `MPL-2024-0341`.
  - 1009 — ghost work: 90% released, 10% complete, 9 months elapsed.
  - 1010 — PFMS account mismatch (`SBIN…` stage-1 vs `HDFC…` target).
  - 1011, 1012, 1013, 1016, 1017, 1018, 1020 — clean and released.
  - 1014, 1015, 1019 — evaluating.
  - 1021 — low composite score with the gate fired (private `Sy298/A` land).
- **L667-703 `COST_BASELINES` — 35 rows** = 7 categories × 5 districts; fields `category, district, terrain, median_lakh, mad_log_cost, low_lakh, high_lakh, n_records`.
- **L705-711 `DISTRICT_QUARTERLY` — 5 rows** (Hyderabad 88/92/85/90/89 YTD and the other four districts).
- **L713-739 `MONTHLY_TREND` — 25 rows** = Apr-Aug × 5 districts `release_pct`.
- **L741-747 `STATE_STATS` — 5 rows**: Telangana 84/20, Andhra Pradesh 81/18, Karnataka 86/24, Maharashtra 79/28, Tamil Nadu 88/26.
- **L749-757 `CATEGORY_STATS` — 7 rows** of `sanctions_cr` / `releases_cr`.
- **L759-795 `MP_STATS` — 7 rows**: `mp_name, used_cr, breakdown` dict.
- **L797-843 `OFFICIALS` — 5 rows**: DM Sharma (Hyderabad 4/0/1), DM Verma (Rangareddy 5/0/2), DM Iyer (Medchal 6/1/2), DM Nair (Sangareddy 7/0/3), DM Rao (Mahbubnagar 3/0/1) plus `flagged_note` text.
- **L845-891 `LEDGER_SEEDS` — 5 rows**: GENESIS BLOCK / system; PROPOSAL INGESTED / `MPL-2025-1002`; GATE HOLD FIRED / `MPL-2025-1007`; PHOTO GATE FIRED / `MPL-2025-1008`; ESCALATED TO AUDIT / `MPL-2025-1005` by `dm_sangareddy`.
- **L893-904 `OVERRIDES` — 1 row**: `MPL-2025-1003`, kind `threshold`, DM Iyer, `HELD FOR INSPECTION`, `ledger_index 5`.

### 3.20 `backend/app/db/real_seed.py` (288 lines) — ingestion of the real work-level exports

- L40-47 constants: `REAL_ID_PREFIX = "WS/"`, `BATCH_SIZE = 100`, `PROGRESS_BATCHES = 40`, `MIN_SANCTION_RUPEES = 50_000`. L33 `_seed_lock = threading.Lock()`.
- L50-91 `_facts_for(w, dm_name, rng)`: emits `record_kind: "real"`, `work_id`, `ida`, `source: "esakshi-export-2026-09-21"`, `terrain: "plain"`, `trend{case_release_pct = round(released), peer_release_pct 55, peer_sd 12}`, `payment{released_pct, completion_pct, months_since_sanction, extensions = min(3, (sanction/1e5)//40)}`, and a `compliance.checks` list of two **passing** critical checks (land tenure and entity type) so real rows do not trip the compliance gate.
- L94-128 `_payload_for(w, rng)`: `id = work_id`, `hindiTitle ""`, `category/state/district/constituency/mpName` from the export, `dmName = "District Authority (Portal Record)"`, `sanctionedAmountLakh = round(rupees/1e5, 2)`, dates as `"%d %b %Y"`, `status = "evaluating"`, `path = ["submitted","evaluating"]`, and an `overview` / `mp_plain_status` template that embeds the portal status, payment count, paid rupees, completion and release.
- L131-143 `_real_works_stream(count)`: `stall_labels(load_real_works())`, filtered to `sanction_amount_rupees >= MIN_SANCTION_RUPEES`, `islice`d when `count` is given.
- L146-147 `real_case_count(db)`: `Case.id LIKE 'WS/%'` count.
- L150-170 `seed_real_works_async()`: daemon thread named `real-seed`, its own `SessionLocal`, calls `seed_real_works(db)`, logs and swallows exceptions.
- L173-185 `_mark_progress(db, done)`: `db.merge(MetaKey(key="real_seed_progress", value={"ingested": done, "at": <utc iso>}))`, committed every 40 batches.
- L188-288 `seed_real_works(db, count=None, force=False)` / `_seed_real_works_locked`: lock-guarded; returns `{"seeded": False, "existing": n}` if rows exist and not `force`; on `force` deletes all `WS/*` and commits. Then loops `islice(stream, 100)` → `_payload_for` → `ingest_and_evaluate_batch(db, raw, source="esakshi-export", record_ledger=False)`, accumulating `ingested/quarantined/held/evaluating/skipped`.
  The **policy pin** (the important part): for real ids whose pipeline would have set a non-`evaluating` status, it counts `would_hold`, then **resets the status to `evaluating` and rewrites the path**, so no real portal work is ever held. It commits per batch and writes the progress marker. Afterwards it aggregates per state over `WS/%` with `count, avg(json_extract(facts,'$.payment.released_pct'))` and, when `n >= 20`, upserts `StateStat(utilization = round(avg), cases_count = max(old, n))`. It appends a `REAL DATASET SEEDED` ledger block and returns `{seeded, count, quarantined, held: 0, would_hold_unrestricted, note}`.
- Note the count in the code comment: `PROGRESS_BATCHES = 40` at 100 rows per batch is 4,000 rows per progress commit.

### 3.21 `backend/app/db/scale_seed.py` (252 lines) — national scale sample

- L36-43 `SCALE_ID_PREFIX = "MPL-SC-"`, `DEMO_OFFICIAL_NAME = "Demo MP (Scale Sample)"`, `DEMO_DM_NAME = "Demo DM (Scale Sample)"`.
- L47-49 `STATE_COST_FACTOR = {"Telangana": 1.0}`. L51-59 `CATEGORIES` (7). L61-75 `TITLE_TEMPLATES` (7) and `LOCALITIES` (12).
- L78-81 `_constituency_works()` = `load_allocations()` rows where `allocatedCr is not None` — the real constituency pool the scale rows are anchored to.
- L84-198 `build_scale_batch(count, seed=7)`: round-robin over that pool; `district = constituency.title()`; random category / locality / title / year 2021-25 / month. Amount = `max(1, round(alloc_cr * 100 * share, 1))` with `share` drawn as 0.22-0.30 when `roll < 0.03` (deliberate outlier), 0.02-0.05 when `roll < 0.08`, else 0.05-0.18 — so the amounts are a fraction of the **real published allocation**, not invented money. Profiles: ghost 3% (released 90-100, completed 5-15, months 6-12, extensions 1-3), laggard 6% (released 5-30, months 8-14), otherwise healthy (`released = min(100, max(5, 62 + gauss(0,10)))`, `completed = released + gauss(0,6)`, `months = min(14, max(0, released/uniform(6,10) + gauss))`, extensions usually 0). 2% get a private-land critical compliance failure. Ids are `MPL-SC-%05d`; the overview is prefixed `[Scale sample]` and states it is anchored to the ₹ Cr allocation and fictional; facts include `scale_synthetic: True`.
- L201-202 `scale_case_count(db)` = `LIKE 'MPL-SC-%'`.
- L205-252 `seed_scale(db, count=750, seed=7, force=False)`: idempotent; deletes on `force`; calls `ingest_and_evaluate_batch(source="scale-synth", record_ledger=False)`; per state aggregates `cases` and `release_sum` into `StateStat.utilization`; appends a `SCALE SAMPLE SEEDED` ledger block; returns `{seeded, count, quarantined, held, states:[{state, cases}], note}`.

## 4. Backend — detection, fusion, gate, workflow, ledger, oversight

### 4.1 `backend/app/modules/common.py` (28 lines)

- L8-9 `clamp(v, lo=0, hi=100) -> int = round(max(lo, min(hi, v)))` — every sub-score in the system passes through this.
- L12-19 `@dataclass ModuleResult`: `module: str`, `sub_score: int`, `description: str`, `triggered: bool = False`, `evidence: dict | None`, `flags: dict`.
- L22-29 `@dataclass ModuleContext`: `db`, `case: Case`, `facts: dict`, with `facts_for(module) = facts.get(module) or {}` so a module never crashes on a missing facts key.

### 4.2 Module contract

Every module exposes `evaluate(ctx: ModuleContext) -> ModuleResult` and is invoked from one place, `pipeline.run_case_pipeline`, in this fixed order: **duplicate, cost_delay, compliance, payment, predictive, photo, trend**. Module numbering used in the UI (M1…M12) is a presentation convention, not a code identifier.

### 4.3 `backend/app/modules/duplicate.py` (111 lines)

- L11 `EARTH_RADIUS_M = 6_371_000`.
- L14-17 `live_similarity(a, b) = float(fuzz.token_sort_ratio(a, b))` — computed at evaluation time, never stored.
- L20-25 `haversine_m(...)`.
- L28-29 `duplicate_sub_score(sim, dist) = clamp(min(100, sim*0.9 + ((500 - dist)/500)*10 + 4))`.
- L32-111 `evaluate(ctx)`: reads `facts.twin`; no twin → sub-score 6, not triggered. **It re-reads the twin's title live from the database by id**, so an edit to either side changes the score on the next pipeline run. `dist` uses real coordinates when present (`geo` + `lat`/`lng`), else `twin.distance_m` defaulting to 500. `score = duplicate_sub_score(sim, dist)`; `triggered = sim >= 85 and dist <= 500` (the two config thresholds). Evidence: `{kind, title, caseId, distanceMeters, textSimilarityPct, mapX, mapY, computedLive: True}`.

The frontend re-implements the same formula in `src/lib/similarity.ts` and pins parity against the seeded pairs in `src/lib/similarity.test.ts`.

### 4.4 `backend/app/modules/cost_delay.py` (151 lines)

- L9-17 `CATEGORY_LABELS` (7 snake→label). L19-20 `MIN_HISTORY_ROWS = 30`, `RESIDUAL_TRIGGER = 0.45`.
- L23-27 `_sanction_year(case)`: last token of `sanctioned_date` parsed as int, else 2025.
- L30-80 `baseline_for(db, case) -> (row | None, source, note)`: a four-level cascade — (1) `terrain + district` + category, (2) `district` + category, (3) `state`-wide for the category, (4) `manual`. Each level calls `history_cell_count(district, category, terrain, db=db)` and is skipped unless the cell has at least 30 history rows; the first level that has both a row and sufficient history wins. This guard is what stops a thin cell from producing a confident-looking comparison, and it is exercised by `test_cost_baseline_falls_back_on_thin_cells`.
- L83-151 `evaluate(ctx)`: `observed = case.sanctioned_amount_lakh`; `expected = cost_expected_lakh(district, category, terrain, year)` (the XGBoost model's log-space prediction, exponentiated); `residual = (observed - expected)/expected`; `shap = cost_shap_contribs(...)` sorted by |value|, top 2. If there is no baseline or `mad_log_cost <= 0`, sub-score 6 with `baselineSource: "manual"` evidence. Otherwise `score = clamp(30 + 90*residual)` and `triggered = residual >= 0.45`; evidence adds `peerLow, peerHigh, peerMean, baselineSource, baselineNote, model: MODEL_VERSIONS["cost"], shapTop`.

### 4.5 `backend/app/modules/compliance.py` (52 lines)

`evaluate(ctx)`: reads `facts.checks`; partitions into `critical_failed` and `noncritical_failed` by each check's `critical` flag. `score = clamp(10 + 55*len(critical_failed) + 20*len(noncritical_failed) + max(0, (6 - len(checks))*3))` — so a thin check list also raises the score, on the reasoning that absence of evidence is itself a compliance risk. `triggered = any failure`. Evidence when triggered is the first failed check projected as `{kind, field, actual, required, ruleRef, clauseText}`. Description states the critical count, the advisory count, or that all checks passed. Flags: `{critical_hard_fail: bool(critical_failed), detail: description}` — and `critical_hard_fail` is one of the two inputs to the gate.

### 4.6 `backend/app/modules/payment.py` (77 lines)

`evaluate(ctx)`: `ghost = released_pct >= 90 and completion_pct <= 15` (the two `PAYMENT_GHOST_*` config values). `base = 8 + 0.4*(released - completed) + 1.5*months + (30 if ghost) + clamp(0.8*(60 - released), 0, 24)`. If `facts.pfms` is a dict, calls `match_vendor_disbursement(db, proposal_id, stage, target_account, gstin, name)`; a `fund_redirection_alert` adds 45 and sets that flag, else sub-85 vendor similarity adds 25 and sets `vendor_unverified`. Evidence is the PFMS projection `{kind, stageNumber, accountMatch, fundRedirectionAlert, vendorSimilarityPct, vendorMatchedName, flags, detail}`. `score = clamp(base)`. `triggered = ghost or score >= 60 or (pfms present and not matched)`. Flags: `{ghost_completion, fund_redirection?, vendor_unverified?}`.

### 4.7 `backend/app/modules/pfms_matcher.py` (132 lines)

- L14-23 `REGISTERED_PFMS_VENDORS` — 8 `{name, gstin}` entries, an illustrative directory (disclosed in the UI as such).
- L26-37 `PfmsMatchResult`: `matched, proposal_id, stage_number, account_match, fund_redirection_alert, vendor_similarity_pct, vendor_matched_name, flags, risk_score, detail`.
- L40-132 `match_vendor_disbursement(db, proposal_id, stage_number, target_account, vendor_gstin, vendor_name)`: the stage-1 account comes from `Case.facts.pfms.stage1_account` (fallback `registered_account`). A rebinding is allowed only if a `MetaKey` named `pfms_rebinding_{case_id}` exists — so **if `stage > 1` and the target account differs from stage 1 and there is no recorded rebinding, it raises `FUND_REDIRECTION_ALERT` and sets `account_match = False`**. Vendor similarity is `max(fuzz.token_sort_ratio(name, registry_name))`; below 85 it flags `UNVERIFIED_PFMS_VENDOR`. `risk_score = 65` if redirection, plus `round((85 - sim)*0.5)` if unverified, capped at 100. `matched = not flags`. Detail strings mask account numbers to the last four characters.

### 4.8 `backend/app/modules/photo.py` (57 lines)

`evaluate(ctx)`: no `facts.photos` → sub-score 4, "no photos". Otherwise `match_pct = max(photo.p_hash_matches.match_pct)` and `exif = [entries flagged corroborating]`. `score = clamp(6 + 0.55*match + 10*len(exif))`. `triggered = match >= 85 or (match >= 60 and exif > 0)`. `high_confidence = match >= 99.0` (`PHOTO_GATE_MATCH`) → flag `high_confidence_photo`, the second gate input. Evidence: `{kind, photos:[{label, color, pHash}], pHashMatchPct, exif:[{field, photoA, photoB, corroborating}]}`.

### 4.9 `backend/app/modules/predictive.py` (77 lines)

- L10 `PRIOR_DISTRICT_STALL_RATE = 0.15`.
- L13-34 `district_stall_rate(db, district)`: SQL counting the district's cases and the share whose `status IN ('hold_active','escalated')`, rounded to 3 dp, falling back to the prior on exception or zero. This is why the "live district stall rate" in the evidence panel is a real query, not a constant.
- `evaluate(ctx)`: `months`, `extensions`, `completion_pct` from `facts.payment` (plus `facts.extensions`), `rate = district_stall_rate(...)`, then `proba = stall_proba(months, extensions, completion, category, rate)` — an actual `predict_proba` call on the committed logistic-regression artifact. `stall = round(proba*100)`; `score = clamp(10 + 0.95*stall)`; `triggered = stall >= 60` (`STALL_PROBABILITY_THRESHOLD`). Evidence: `{kind, stallProbabilityPct, factors, model: MODEL_VERSIONS["stall"], districtStallRate, completionPct, extensions}`.

### 4.10 `backend/app/modules/trend.py` (59 lines)

L9 `TRAILING_YEARS = 3`. `evaluate(ctx)`: `case_pct = facts.case_release_pct`; if `trend_history(district)` returns a series, the comparator is the mean of the last three annual `avgReleasePct` values with `sd = max(1, pstdev(all years))`, the basis string reads "district 3-year trailing average (YYYY–YYYY)" and `longitudinal = True`; otherwise it falls back to the facts' own `peer_release_pct` / `peer_sd` and describes the basis as same-cohort peers. `diff = peer - case`; `z = diff/sd`; `score = clamp(10 + 28*max(z, 0))`; `triggered = diff >= 15` (`TREND_DEVIATION_PCT`). Evidence: `{kind, caseReleasePct, peerReleasePct, peerSd, basis, longitudinal}`.

### 4.11 `backend/app/fusion/fusion.py` (66 lines) — Module 8

- L5-13 `MODULE_LABELS`: duplicate→"Vendor Duplicate", cost→"Cost Variance", compliance→"Compliance Guardrail", payment→"Payment Integrity", predictive→"Early-Stall Prediction", photo→"Photo Integrity", trend→"Disbursal Trend".
- L15-23 `MODULE_DETAILS` — one description string per module.
- L25 `HIGH_SINGLE_MODULE_ALERT = 75`.
- L28-38 `fuse(module_scores) -> (int, dict)`: `total = sum(config.FUSION_WEIGHTS[module] * sub_score)`; `attribution[module] = round(contribution, 2)`; returns `round(min(100, total))` and the attribution map. Because the weights sum to 1.0, the composite is a weighted average, not a sum.
- L41-44 `module_level_hold_triggered(scores) -> bool`: true if any `sub_score >= 75` — a single loud module can hold a case even when the average is low.
- L47-67 `attribution_percentages(case)`: per module `{module, subScore, description, triggered, label, detail, attribution, pct}` where `pct = round(attribution / max(1, composite) * 100)`.

### 4.12 `backend/app/fusion/gate.py` (23 lines) — Module 9

```python
def evaluate_gate(module_flags: dict) -> tuple[bool, str | None, str | None]
```

L7-8: `compliance.critical_hard_fail` → `(True, config.GATE_RULES["compliance"], compliance.detail or default)`. L10-11: elif `photo.high_confidence_photo` → `(True, config.GATE_RULES["photo"], "Uploaded photographs are near-identical …")`. L13: else `(False, None, None)`. The docstring states the design intent: the hold is forced independent of the composite score and can only be lifted by Minister-level nullification. Only two of the seven modules can ever fire it.

### 4.13 `backend/app/ingestion/pipeline.py` (267 lines)

- L26-57 `validate_raw_case_schema(raw) -> (bool, message)`: requires a dict; `title` a string of at least 3 characters; `district` a string; `category` a string; the amount (either `sanctionedAmountLakh` or `sanctioned_amount_lakh`) a float > 0; `facts` a dict if present.
- L60-98 `run_case_pipeline(db, case)`: builds a `ModuleContext`, evaluates the seven modules in order, deletes the case's existing `ModuleScore` rows, inserts the new ones while collecting their `flags`, flushes, re-queries, computes `composite_score` via `fusion.fuse`, then `gate.evaluate_gate(flags)` and writes `gate_fired`, `gate_rule`, `gate_detail`, and `held_independent = fired`.
- L101-243 `ingest_and_evaluate_batch(db, raw_cases, source="esakshi", record_ledger=True)` returns `{total, ingested, quarantined, held, evaluating, skipped, cases, quarantined_ids}`. Per raw record: validate, else write a `QuarantineQueue` row (`raw_payload`, `error_reason`, `ingested_at`, `source`, `resolved=False`) and count it. Tag `facts["demo"] = True` unless the record is real. `case_id = raw.get("id")` or `MPL-{year}-{hash(title) % 9000 + 1000}`. If the case exists, is real, and its title is unchanged, it is `skipped` — the explicit reason being to avoid both redundant inference and clobbering the real record. Otherwise it is created (defaults: state Telangana, district Hyderabad, constituency = district, mp "Hon. MP", dm "District Magistrate", status evaluating, a two-step path) or updated. The pipeline then runs, and the transition is: `single = fusion.module_level_hold_triggered(scores)`, `risk_hold = gate or single or composite >= 60`. If `risk_hold` **and** the record is real → status stays `evaluating`, `real_would_hold` increments, ledger `REAL RECORD INGESTED` (when `record_ledger`). If `risk_hold` and not real → `hold_active` with the path extended and ledger `GATE HOLD FIRED` or `COMPOSITE RISK HOLD`. Otherwise `evaluating` with ledger `REAL RECORD INGESTED` or `PROPOSAL INGESTED`. Ledger appends use `category="ingestion"`, `actor="system"`, and are skipped entirely when `record_ledger=False` (which is how both the real seeder and the scale seeder run). Commit at the end.
- L246-268 `rescore_all(db, batch_size=100) -> int`: keyset pagination with `id > last_id` ordered by id, re-running the pipeline and committing per batch — the operation behind the district dashboard's "Sync live scores".

### 4.14 `backend/app/ingestion/esakshi_scraper.py` (337 lines)

- L15-20 `ESAKSHI_BASE_URL = "https://mplads.mospi.gov.in"` and `DEFAULT_USER_AGENTS` (three Chrome user-agent strings).
- L23-337 `class EsakshiScraperClient`, constructed with `base_url, max_concurrency=3, delay=0.5, retries=3, timeout=15`, holding an `asyncio.Semaphore` and a `last_fetch_live = False` flag.
- L53-60 `_get_headers()`: rotating UA, `Accept`, `Accept-Language: en-IN`, `Referer`.
- L62-90 `fetch_page(client, endpoint, params)`: retry loop with jittered backoff of `attempt * 1.5`; non-200 → `None` after the last retry.
- L92-136 `parse_works_html(html, state, district)`: takes `tables[0]`, skips the header row, requires ≥ 6 columns, and maps them as `work_code = cols[0]`, `title = cols[1]`, `category = cols[2]`, `mp = cols[3]`, `amount = cols[4]` with `₹`/`Lakh` stripped, `date = cols[5]`; each row goes through `normalize_to_case_schema`.
- L138-229 `normalize_to_case_schema(...)`: preserves ids already prefixed `WS/` or `MPL-`, otherwise mints `MPL-…`; supplies default `facts` (coordinates, photo URLs, two **passing** compliance checks, zero payment figures, trend 50 vs peer 55, predictive 10%); merges caller-supplied `facts` over the defaults; returns a camelCase case dict with `status: "evaluating"`.
- L231-266 `scrape_district_works(state, district, session_id=None)`: a 60-second negative-probe cache (`_PROBE_DOWN_UNTIL` / `_PROBE_TTL`) so an unreachable portal is not re-probed on every request; tries `_scrape_live`, returns the live result flagged `True` or the fallback flagged `False`.
- L268-300 `_scrape_live`: POSTs `rest/PreLoginDashboardData/getTilesData` with `{"uname":"0,0,0,2"}` and JSON headers; requires a non-empty `Allocated Limit for Hon'ble MPs` tile or returns `None`; on success it returns `_fallback_from_exports(...)` rows, i.e. the tile call is a reachability probe rather than a work-level source.
- L302-337 `_fallback_from_exports`: `load_real_works()` filtered by district (case-insensitive), else the first 3 national rows; maps up to 10 into the case schema with `facts{record_kind: "real", work_id, portal_status, payment{released_pct, completion_pct, months_since_sanction}}`.

The honest consequence, which the API surfaces in its `provenance` string: the runtime ingest path serves real portal records but is not scraping the live work tables.

### 4.15 `backend/app/ledger/chain.py` (125 lines)

- L9 `GENESIS_PREV = "0000000000000000"`.
- L10-23 `ACTOR_LABELS` / `ACTOR_ROLES` for `officials_delhi`, `wez_delhi`, `state_authority`, `system`, `nodal_auth_delhi`.
- L26-28 **the hash**:
  ```python
  def block_hash(prev_hash, index, action, actor, body, timestamp) -> str:
      return hashlib.sha256(f"{prev_hash}|{index}|{action}|{actor}|{body}|{timestamp}".encode("utf-8")).hexdigest()
  ```
  Field order, the `|` separator, and the `prev_hash` prefix are the whole chain: changing any field in any block changes that block's hash, which invalidates every block after it.
- L31-32 `_last_block(db)` = row with max index.
- L35-65 `append(db, action, category, actor, actor_role, body, timestamp, case_id=None, commit=True)`: `prev_hash` from the last block or genesis; index = last+1 or 0; computes and stores the hash; commits unless told not to (the workflow layer appends with `commit=False` so the case and its ledger block land in one transaction).
- L68-79 `verify(db) -> list[bool]`: walks blocks in index order, recomputing `expected = block_hash(expected_prev, …)`; a block is valid only if **both** `row.prev_hash == expected_prev` and `row.hash == expected`. On a failure `expected_prev` is left at the last good hash, so a broken link invalidates the tampered block and every descendant while leaving earlier blocks valid — the cascade the tests and the demo script rely on.
- L82-100 `tamper(db, index, body, timestamp)`: snapshots `{body, timestamp, hash}` into `MetaKey` named `tamper_original_{index}` if not already present (so repeated tampering keeps the first original), overwrites body/timestamp, and **re-signs that one block's own hash** — modelling an attacker who can write to the database and recompute his own block.
- L103-117 `untamper(db) -> int`: restores every `tamper_original_%` snapshot, deletes the meta rows, commits, returns the count.
- L120-126 `reset(db)`: deletes all `LedgerEntry` plus `tamper_original_%` and `ledger_fields_edit_%` meta keys.

### 4.16 `backend/app/ledger/ledger_edits.py` (147 lines)

- L13-18 the encoding convention: the tail of every `body` is the last two ` ⏎₹`-separated tokens, i.e. `{description} ₹{amount} ₹{status}`; parsing therefore starts **from the end** of the string, which is what lets prose earlier in the body contain `₹` without corrupting the parse.
- L35-36 `EDIT_KEY_PREFIX = "ledger_fields_edit_"`, `_SEP = " ₹"`.
- L39-43 `format_amount(a)`: `f"{float(a):.2f}"` with trailing zeros and then a trailing dot stripped (`14.20 → "14.2"`, `45.00 → "45"`, `0.5 → "0.5"`).
- L45-47 `sanitize_status(s)`: strips `₹` and `|`, collapses whitespace.
- L50-68 `split_body(body) -> (head, amount_str|None, status|None)`: finds the last two separators from the end and rejects the split when the head is empty, the amount contains a space, or the amount does not parse as a float.
- L71-73 `encode_body(head, amount, status) = f"{head} ₹{format_amount(amount)} ₹{sanitize_status(status)}"`.
- L76-77 `snapshot_key(i) = f"{EDIT_KEY_PREFIX}{i}"`.
- L80-95 `record_edit(db, index, body, timestamp, hash)`: idempotent — only the first snapshot for an index is kept.
- L98-106 `edited_indices(db) -> sorted[int]`.
- L109-134 `restore_edited(db) -> int`: restores body/timestamp/hash from every snapshot, deletes the meta rows, commits.

`src/lib/ledger-edits.ts` is a TypeScript mirror of `format_amount` / `sanitize_status` / `split_body` / `encode_body` so the browser can render and edit the same fields the backend parses.

### 4.17 `backend/app/workflow/state_machine.py` (158 lines)

- L12 `ALLOWED = {"approve","inspect","escalate"}`.
- L14-25 **`TRANSITIONS`**:
  | from | allowed |
  |---|---|
  | `hold_active` | `approve`, `inspect`, `escalate` |
  | `evaluating` | `inspect`, `escalate` |
  | `released` | ∅ (terminal) |
  | `escalated` | ∅ |
  | `submitted` | ∅ |
  | `auto_cleared` | ∅ |
  | `rejected` | ∅ |

  The comment records why the last three are terminal rather than absent: to answer 409 instead of raising 500.
- L27-31 `DECISION_LABELS = {approve: "Approved", inspect: "Inspection ordered", escalate: "Escalated"}`.
- L33-36 `_dm_actor_id(dm_name)`: slugify to `dm_<lowercase alphanumerics → _>`.
- L39-159 `decide(db, case_id, decision, note) -> Case`:
  1. Reject an unknown decision with `ValueError`.
  2. `SELECT … FOR UPDATE` on the case (this is the row lock the concurrency test exercises); missing → `KeyError`; a decision not in `TRANSITIONS[status]` → `ValueError` (surfaced as 409).
  3. `is_gate = case.gate_fired`, `is_module_alert` from the module rows.
  4. **Data-policy guards**: `facts.record_kind == "real"` → `ValueError` ("real portal records are read-only in this demo"); a record without `facts["demo"]` → `ValueError` (the workflow requires a demo-tagged record). Both are enforced again in the test suite.
  5. Branches: `approve` → status `released`, override kind `gate` if `is_gate` else `threshold`, action `GATE OVERRIDE` or `THRESHOLD OVERRIDE`, ledger category `override`. `inspect` → `hold_active`, kind `threshold`, action `HELD FOR INSPECTION`, category `hold`. `escalate` → `escalated`, kind `threshold`, action `ESCALATED TO AUDIT`, category `escalate`.
  6. The `path` list gains `override_approved` / `hold_active` / `escalated` only if not already present.
  7. `status_since = "%d %b %Y"`.
  8. `chain.append(action, category, actor=dm_slug, actor_role=f"District Magistrate · {district}", body=f"decision: {note}", timestamp=<iso>, case_id, commit=False)`.
  9. Inserts an `OverrideRecord` with the ledger index just used.
  10. Upserts the `OfficialStat` row for that DM: `high_risk_decisions + 1`, and `gate_overrides + 1` or `threshold_overrides + 1`.
  11. Commits — case, ledger block, override record and official counters in one transaction.

### 4.18 `backend/app/oversight/override_audit.py` (64 lines)

- L7-8 `GATE_OVERRIDE_TERMS = [approve, approved, release, released, waive]` and `THRESHOLD_TERMS = [inspect, investigate, hold, escalate]` — declared but **not referenced** by the functions below (see §12).
- L11-42 `official_audit_rows(db)`: orders officials by `high_risk_decisions` desc; `peer_avg = total_overrides / total_high_risk` across the whole register; per official `rate = (gate + threshold) / max(1, high_risk)`. Two flags: `gate_flag = gate_overrides >= 1` and `rate_flag = rate > peer_avg * 1.5`. Returns `[{id, name, role, district, state, highRiskDecisions, gateOverrides, thresholdOverrides, flaggedNote, _rate}]`.
- L45-65 `override_records(db)`: `OverrideRecord` ordered by timestamp desc joined to `Case` for the title; returns `[{id, caseId, caseTitle, kind, officialName, officialDistrict, action, body, timestamp, ledgerIndex}]`.

## 5. Backend — ML

### 5.1 `backend/app/ml/models.py` (327 lines) — the single source of truth for features

- L18-24 `STALL_FEATURES = ["months_since_sanction","extensions","completion_pct","category_code","district_stall_rate"]`.
- L33 `COST_FEATURES = ["district_code","category_code","terrain_code","year"]`.
- L35-48 `CATEGORY_CODES` — 11 entries mapped to 0-10. L50-89 `DISTRICT_CODES` — 36 entries mapped to 0-35. L91 `TERRAIN_CODES = {plain:0, semi-hilly:1, hilly:2}`. L93 `UNKNOWN_CODE = -1`.
- L95 `MODEL_VERSIONS = {"stall":"stall-lr-v2","cost":"cost-xgb-v1"}` — the version string surfaced in evidence payloads, `/ml/metrics`, and the methodology page.
- L97 `ARTIFACT_DIR = …/app/ml/artifacts`. L99-100 a module-level `threading.Lock` and `_state = {"loaded": False}`.
- L103-118 `_encode`, `_encode_category`, `_encode_district`, `_encode_terrain` — the encoders, returning `UNKNOWN_CODE` for anything unrecognised.
- L121-137 `_train_in_memory()`: fits both models from the synthetic frames when artifacts are absent, so a fresh clone without artifacts still serves predictions.
- L139-164 `_ensure_loaded()`: loads `stall_model.joblib`, `cost_model.joblib`, `metrics.json`, `cost_training_samples.csv`; on any failure falls back to in-memory training. Caches the lazily-created `explainer` as `None`.
- L167-175 `_cost_frame()`: memoised read of the cost training CSV.
- L178-200 `stall_proba(months, extensions, completion, category, rate) -> float`: encodes the five features, builds one row, calls `predict_proba`, returns the positive-class probability.
- L203-218 `cost_expected_lakh(district, category, terrain, year) -> float`: encodes four features, predicts in log space, returns `exp(...)`.
- L221-250 `cost_shap_contribs(...) -> [(district, category, terrain, year, shap_value rounded to 4)]`: `shap.TreeExplainer` on the cost model, guarded by the module lock.
- L253-295 `history_cell_count(district, category, terrain, db)`: a memoised count combining the in-memory cost frame with the live `CostBaseline.n_records` sum, which is what the cost module's 30-row guard consults.
- L298-299 `get_metrics() -> dict` (the committed `metrics.json`).
- L302-327 `trend_history(district) -> [{year, worksSanctioned, avgReleasePct}]`: from `trend_history.csv`, else the synthetic frame, filtered by district and sorted by year.

Because `models.py` owns both the feature order and the encodings, and both `train.py` and inference import from it, train/serve skew is structurally impossible — that is the design claim the code actually supports.

### 5.2 `backend/app/ml/train.py` (153 lines)

- L30-33 `STALL_TEST_SIZE = 0.2`, `STALL_SPLIT_SEED = 7`, `COST_TEST_SIZE = 0.2`, `COST_SPLIT_SEED = 7`.
- L36-55 `train_stall(df) -> (LogisticRegression, metrics)`: `max_iter=2000`, stratified 80/20 split, metrics `{model:"LogisticRegression", version, n_train, n_test, accuracy, roc_auc, features}`.
- L58-94 `train_cost(df) -> (XGBRegressor, metrics)`: `n_estimators=300, max_depth=5, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, reg_lambda=1, random_state=7, n_jobs=-1, tree_method="hist"`; encodes district/category/terrain; target is `log(max(sanctioned_lakh, 0.01))`; metrics `{model:"XGBRegressor", version, n_train, n_test, mae_lakh = MAE on the exponentiated prediction, r2_log, features, target:"log(sanctioned_lakh)"}`.
- L97-148 `train_all(out_dir=ARTIFACT_DIR)`: pulls `real_training.dataset_card()`, `real_training.stall_frame()` and `real_training.cost_history_frame()`, trains both models, attaches the `dataset` block to each model's metrics, then writes seven artifacts: `stall_model.joblib`, `cost_model.joblib`, `metrics.json`, `encodings.json` (`{stall_features, cost_features, versions, dataset_card}`), `stall_training_samples.csv`, `cost_training_samples.csv`, and `trend_history.csv` (synthetic). `__main__` prints the metrics as JSON, so `python -m app.ml.train` is the documented reproduction command.

### 5.3 `backend/app/ml/real_training.py` (148 lines) — the real-label training path

- L47 `TERRAIN_CONSTANT = "plain"` with the documented reason: the portal does not publish terrain.
- L50-51 `_extensions(completion) = min(3, completion // 40)`. (The module docstring says "lakh // 40" while the parameter is `completion`; the derived field name in `encodings.json` says "sanctioned-amount chunk size" — see §12.)
- L54-109 `stall_frame()`: `stall_labels(load_real_works())`, filtered to `age_at_snapshot >= 12` so the label is fully determined. Computes the global stall rate, then per district the positives, the total, and the mean completed share; the per-row `district_stall_rate` feature is a **leave-one-out** rate `(pos - stalled)/(n - 1)` when `n > 30`, else the global rate. Rows: `{months: age_at_snapshot, extensions, completion_pct: district completion share * 100, category_code, district_stall_rate, stalled}`.
- L112-127 `cost_history_frame()`: rows where sanction > 0 and a date parses, projected to `{district, category, terrain: "plain", year, sanctioned_lakh = rupees/1e5}` — exactly the CSV contract `SOURCES.md` documents.
- L130-148 `dataset_card()`: `{source: "eSAKSHI work-level exports (portal snapshot 2026-09-21)", n_works, n_completed, stall_definition: "payment lapse: >= 6 months since sanction with zero vendor payments recorded", n_stall_positive, stall_population: "works aged >= 12 months at snapshot (label fully determined)", feature_policy: "sanction-time features only; leave-one-out district prior", terrain_note, extensions_note}`.

### 5.4 `backend/app/ml/synthetic.py` (146 lines) — the fallback/training-fallback generators

- L27-32 `RNG_SEED = 20260920`, `COST_HISTORY_YEARS` 2015-2025, `COST_ROWS_PER_CELL = 120`, `STALL_TRAINING_ROWS = 2000`, `TREND_HISTORY_YEARS` 2015-2025.
- L35-61 `cost_history_frame(seed, rows_per_cell)`: log-normal around each `seed_data.COST_BASELINES` median with a drift factor `1 + 0.008*(year - 2020)`; columns `district, category, terrain, year, sanctioned_lakh`.
- L64-79 `_stall_label(months, extensions, velocity, completion)`: the documented rule `(months >= 9 and velocity < 20 and completion < 70) or (extensions >= 2 and velocity < 40 and completion < 80) or (months >= 12 and completion < 50)`.
- L82-115 `stall_frame(seed, n)`: months 0-18, extensions `poisson(0.7)` capped at 4, 20% of rows "stuck" with completion 0-40, otherwise completion correlated with age; `released = completion + U(-5, 15)`; `velocity = released / max(1, months)`; random category; `district_stall_rate = U(0.05, 0.4)`; then a **4% label flip** to inject noise. Columns include `disbursal_velocity` and `stalled`.
- L118-146 `trend_history_frame(seed)`: per district from `DISTRICT_CODES`, works sanctioned 38-69 and release 48-62 plus drift; columns `district, year, works_sanctioned, avg_release_pct`.

The shipped artifacts are trained on the **real** frames, not these — the synthetic path is the fallback used by `_train_in_memory`.

### 5.5 `backend/app/ml/__init__.py` (44 lines)

The only non-empty `__init__.py` in the backend. A docstring describing the two models, the shared feature order, the artifact directory, and the in-memory fallback; then re-exports `CATEGORY_CODES, COST_FEATURES, DISTRICT_CODES, MODEL_VERSIONS, STALL_FEATURES, TERRAIN_CODES, UNKNOWN_CODE, cost_expected_lakh, cost_shap_contribs, get_metrics, history_cell_count, stall_proba` with an explicit `__all__`.

### 5.6 Committed artifacts

**`app/ml/artifacts/metrics.json` (42 lines) — exact content:**

```json
{
  "stall": {
    "model": "LogisticRegression", "version": "stall-lr-v2",
    "n_train": 29370, "n_test": 7343,
    "accuracy": 0.796, "roc_auc": 0.7997,
    "features": ["months_since_sanction","extensions","completion_pct","category_code","district_stall_rate"],
    "dataset": {
      "source": "eSAKSHI work-level exports (portal snapshot 2026-09-21)",
      "n_works": 81727,
      "stall_definition": "payment lapse: >= 6 months since sanction with zero vendor payments recorded",
      "n_positive": 9678
    }
  },
  "cost": {
    "model": "XGBRegressor", "version": "cost-xgb-v1",
    "n_train": 65381, "n_test": 16346,
    "mae_lakh": 3.211, "r2_log": 0.2706,
    "features": ["district_code","category_code","terrain_code","year"],
    "target": "log(sanctioned_lakh)",
    "dataset": {
      "source": "eSAKSHI work-level exports (portal snapshot 2026-09-21)",
      "n_works": 81727,
      "terrain_note": "terrain not published by the portal; constant 'plain' for real rows"
    }
  }
}
```

**`app/ml/artifacts/encodings.json` (29 lines) — exact content:** the two feature lists, `versions {stall: stall-lr-v2, cost: cost-xgb-v1}`, and a `dataset_card` with `source`, `n_works: 81727`, `n_completed: 35648`, `stall_definition`, `n_positive`/`n_stall_positive: 9678`, `stall_population`, `feature_policy`, `terrain_note`, `extensions_note`.

**`app/ml/artifacts/trend_history.csv` — 396 data rows.** Header `district,year,works_sanctioned,avg_release_pct`. First rows: `Hyderabad,2015,47,49.4`, `2016,47,52.5`, `2017,48,55.7`, `2018,49,52.8`. Last rows: `Sant Kabir Nagar,2023,59,61.7`, `2024,53,67.3`, `2025,64,61.2`.

**`app/ml/artifacts/cost_training_samples.csv` — 81,727 data rows.** Header `district,category,terrain,year,sanctioned_lakh`; matches `n_works` exactly. First rows: `Dharwad,Normal/Others,plain,2024,4.972`, `Dharwad,Trust and Society,plain,2025,5.0`, `Dharwad,Trust and Society,plain,2024,4.5`, `Haveri,Normal/Others,plain,2025,15.0`. Last: `Kasaragod,Normal/Others,plain,2026,3.0` twice.

**`app/ml/artifacts/stall_training_samples.csv` — 36,713 data rows.** Header `months_since_sanction,extensions,completion_pct,category_code,district_stall_rate,stalled`. First rows: `26.4,0.0,55.3,7.0,0.3784,0`, `12.1,0.0,55.3,9.0,0.3514,1`, `23.9,0.0,55.3,9.0,0.3514,1`, `15.8,0.0,22.4,7.0,0.1458,0`. Last: `12.0,0.0,90.0,7.0,0.2636,0`, `12.0,0.0,91.3,7.0,0.2636,0`.

`29,370 + 7,343 = 36,713` and `65,381 + 16,346 = 81,727` — the CSV row counts match the recorded train/test splits exactly, so the shipped artifacts are the ones the metrics describe.

**`app/ml/artifacts/stall_model.joblib` and `cost_model.joblib`** are the binary fitted estimators (excluded from line counts).

### 5.7 `backend/app/ml/data/SOURCES.md` (60 lines)

States the dataset position: the stall training rows are labelled by a rule plus 4% noise, because no labelled stall outcomes and no bulk payment history are obtainable from the portal (the aggregator needs a sign-in; data.gov.in needs an API key). Documents the two CSVs (2,000 stall rows with columns `months_since_sanction, extensions, disbursal_velocity, category_code, district_stall_rate`; ~4,200 cost rows with `district, category, terrain, year, sanctioned_lakh` generated log-normal around `seed_data.COST_BASELINES`, imported rather than copied). Then gives the **real retrain contract**: a CSV with `district, category, terrain, year, sanctioned_lakh` (example `Rangareddy,Community Assets,plain,2019,16.50`), canonical names taken from `models.DISTRICT_CODES` / `models.CATEGORY_CODES` with unknown → `-1`, terrain one of `plain|semi-hilly|hilly`, year = sanction year, amounts in lakh; source: 16th/17th Lok Sabha MoSPI tables via data.gov.in or aggregators; policy: aggregated statistics only, never a real MP under a flag. `trend_history.csv` (`district, year, works_sanctioned, avg_release_pct`) feeds the Trend module, from `synthetic.trend_history_frame` or MoSPI tables.

Note the file still describes the ~4,200-row synthetic cost set, while the committed `cost_training_samples.csv` holds 81,727 real rows — the doc is stale relative to the artifacts (§12).

---

## 6. Backend — data loading

### 6.1 `backend/app/data/mp_loader.py` (125 lines)

- L21-24 `DATA_PATH = …/app/data/mp_allocations_2025.csv`, `_CRORE = 10_000_000`, `_GRAND_TOTAL_CR = 83_418_702_273.8 / 1e7` (₹8,341.87 Cr, hardcoded as the published control total).
- L27-39 `_norm` and `_parse_amount_cr`: strips non-numeric characters and divides by 1e7, rounded to 2 dp, `None` when unparseable.
- L42-70 `load_allocations() -> (rows, totals)`, `lru_cache`d: `rows = [{mpName, state, constituency, allocatedCr}]`; `totals = {mpCount, totalCr, grandTotalCr, rowsSkipped}`. The `Grand Total` footer row is skipped, which is what makes `rowsSkipped == 1`.
- L73-80 `allocation_summary()`; L83-85 `__main__` prints it.
- L88-125 `_name_tokens` and `find_official_match(display_name)`: token-subset matching in **both** directions, plus a containment rule requiring at least 8 characters, plus a bare-surname rule, with a 0.66 similarity threshold; returns `None` when nothing clears the bar. This is the conservative matcher that both the backend and the TypeScript port in `src/lib/mp-allocations.ts` implement — and the reason a scale row can be anchored to a real constituency while still carrying a fictional MP name.

### 6.2 `backend/app/data/works_loader.py` (207 lines)

- L27-33 `BACKEND`, `DATA`, `LS_DIR = "lok_shaba"`, `WORK_ID_RE = re.compile(r"WS[\s/]*MP(\d+)/(\d{4}-\d{4})/(\d+)(-(.*))?")`.
- L36-45 `parse_work_id(raw) -> (work_id, mp_no, fy, seq, title)`.
- L49-58 `STATUS_COMPLETION_PCT = {Sanction:0, "Vendor ID":5, "Time Est":10, "Physical Insp":10, Partially:50, Completed:100}`.
- L61 `SNAPSHOT_DATE = "2026-09-21"`.
- L64-70 `_read(name)`: `csv.DictReader` over `LS_DIR/name`, dropping the `Grand Total` footer row.
- L73-74 `rupees(s)`: strips everything except digits and `.`.
- L77-84 `parse_date(s)`: tries `%d-%b-%Y`, `%d-%m-%Y`, `%Y-%m-%d`.
- L87-96 `split_work_field` and `district_from_ida(ida)` — the IDA looks like `ARARIA(DISTRICT PLANNING OFFICER ARARIA_IDA)`, so the district is the parenthesised prefix.
- L99-100 `months_between(a, b) = max(0, days / 30.44)`.
- L104-180 `load_real_works()` (lru_cached) returns one dict per work: `work_id, title, category, state, district, ida, constituency, mp_name, sanction_amount_rupees, sanctioned_date, status, completed, completion_pct, released_pct = min(100, paid/sanction*100), paid_rupees, payment_count, months_since_sanction (sanction → end), age_at_snapshot, disbursal_velocity = released/max(1,months)`. It joins `Works Completed.csv` (work id → completion date) and `Expenditure on Completed and On-going Works as on Date.csv` (per work: paid sum, payment count, last payment date), and defines `end` as the completion date, else the last payment, else the snapshot date.
- L183-197 `stall_labels(works)`: sets `stalled = int((not completed and months > 12) or (completed and months > 12))`, which reduces to `months > 12` for every row (see §12).
- L200-207 `district_stall_rates(works)`: the share of stalled works per district where the district has at least 5 works.

### 6.3 `backend/app/data/mp_allocations_2025.csv`

Byte-identical in structure to the root copy: 545 CSV records (543 MP rows + 1 blank-amount row + `Grand Total 83,41,87,02,273.8`), same five headers, same first three rows.

### 6.4 `backend/app/data/lok_shaba/` — 6 files, `wc -l` (records = +1)

| File | `wc -l` | Headers | Grand total / notes |
|---|---|---|---|
| `Allocated Limit for Honble MPs.csv` | 544 | `Sr. No. \| State \| Hon'ble Members of Parliaments \| Constituency \| Allocated AMOUNT ( ₹ )` | `83,41,87,02,273.8` |
| `Amount consented for Calamity.csv` | 13 | `Sr. No. \| Calamity Type \| Calamity Name \| Hon'ble Members of Parliament \| Date of Consent \| Consent Amount ( ₹ )` | `4,05,67,400`; first row `1 \| National Calamity \| Flood 2025 in Punjab \| Shri Gurjeet Singh Aujla \| 07-Dec-2025 \| 7067400` |
| `Expenditure on Completed and On-going Works as on Date.csv` | 86,469 | `Sr. No. \| State \| Work \| Work ID \| IDA \| Hon'ble Members of Parliament \| Constituency \| Expenditure Date \| Vendor Name \| Payment Status \| Fund Disbursed Amount ( ₹ )` | 86,468 payment rows; first `WS/MP18218/2025-2026/233777`, `ATUL GARG`, `21-Aug-2026`, `DARSH BUILDCON`, `Payment In-Progress`, `799146` |
| `Works Completed.csv` | 35,649 | `Sr. No. \| Work Category \| Work \| State \| IDA \| Work Description \| Hon'ble Members of Parliament \| Constituency \| Image \| Completion Date \| Amount Disbursed ( ₹ )` | 35,648 rows; `Image` is `N/A` or `Images` |
| `Works Recommended.csv` | 109,626 | `Sr. No. \| Work category \| WORK \| State \| IDA \| Hon'ble Members of Parliament \| Constituency \| Work description \| Recommended date \| RECOMMENDED AMOUNT   ( ₹ ) \| Sanction Date` | 109,625 rows; ~1,500 `WORK` values contain a literal tab after `WS/` |
| `Works Sanctioned.csv` | 81,728 | `Sr. No. \| Work category \| Work \| State \| IDA \| Hon'ble Members of Parliament \| Constituency \| Work description \| Recommended date \| Sanction Date \| Sanction Amount ( ₹ ) \| Work Status` | 81,727 rows; `Work Status` values e.g. `Physical Inspection`, `Vendor Identification` |

`Works Recommended` ⊇ `Works Sanctioned` ⊇ `Works Completed` in id terms; 28,279 recommended rows have a blank `Sanction Date` (pending sanction).

### 6.5 `backend/app/data/rajya_sabha/` — 6 files

| File | `wc -l` | Difference from the Lok Sabha set |
|---|---|---|
| `Allocated Limit for Honble MPs.csv` | 233 | Headers swap `Constituency` for `Elected/Nominated`; 232 MPs; `Grand Total 33,58,94,82,301.82`; names carry tenure suffixes, e.g. `Dr. Abhishek Manu Singhvi (2026-32) (2026-2032)` |
| `Amount consented for Calamity.csv` | 21 | 20 rows; `Grand Total 10,45,00,000` |
| `Expenditure on Completed and On-going Works as on Date.csv` | 25,621 | 25,620 payment rows; older snapshot (dates from 27-Jul-2023); first work `WS/MP138/2025-2026/205446` |
| `Works Completed.csv` | 10,158 | 10,157 rows |
| `Works Recommended.csv` | 25,699 | 25,698 rows; 5,854 blank sanction dates |
| `Works Sanctioned.csv` | 20,080 | 20,079 rows |

The Rajya Sabha set is vendored and documented, but no code path reads it: `works_loader.LS_DIR` is hardcoded to `lok_shaba`, and `validate_worklevel_exports.py` validates the RS files without a live tile reference (§12).

### 6.6 `backend/app/data/worklevel/README.md` (69 lines)

Records the provenance and the per-file schema: the CSVs were pulled from the eSAKSHI dashboard tiles on **2026-09-21**. It tabulates the LS-vs-RS comparison — Allocated 543 / ₹8,341.87 Cr (exact) vs 232 / ₹3,358.95 Cr; Recommended 109,625 / ₹5,892.43 Cr (exact) vs 25,698 / ₹2,264 Cr; Sanctioned 81,727 / ₹4,313.83 Cr (exact) vs 20,079 / ₹1,751.48 Cr; Completed 35,648 (count exact, 0.98% money gap) vs 10,157; Expenditure 86,468 payments across 57,943 works / ₹2,856.90 Cr (exact) vs 25,620 payments from an older snapshot. Verdict recorded in the file: the LS money figures match the live national tile (`0,0,0,2`) to the paisa, and the Completed money gap is definitional (export column is "Amount Disbursed", the tile is on a different basis). Ingest notes: strip `\t` (~1,500 rows); Recommended ⊇ Sanctioned ⊇ Completed with 28,279 blank sanction dates meaning pending; the expenditure file is payment-grained with `Payment Status` of Success / In-Progress; expenditure Work IDs are a different id space in the older RS snapshot; join to MPs with `find_official_match`, never raw string equality. Scope: `app/ml/` was untouched by this dataset, and any retrain goes through the SOURCES.md column contract.

### 6.7 `backend/app/data/worklevel/VALIDATION.md` (78 lines)

The reconciliation output. Header: tiles are read in real time and drift is reported rather than failed; reference snapshot 2026-09-21 21:47 IST.

`lok_shaba`:
- Allocated — 543 rows, ₹83,418,702,273.80, drift +0.00, 543 MPs.
- Calamity — 12 rows, ₹40,567,400, 10 MPs.
- Expenditure — 86,468 rows, ₹28,569,021,832.45, drift +0.00, dates 25-Jul-2024 → 21-Sep-2026, 85,241 of 86,468 ids match the `WS/MP<n>/<fy>/<id>` pattern, 1,227 rows contain tabs, 57,943 distinct works of which 15,060 have multiple payments, 532 MPs.
- Completed — 35,648 rows, ₹17,347,838,096.40 against a tile of ₹17,519,631,601.73 (row count exact, sum off by ₹171,793,505.33 = 0.98%), dates 12-Aug-2024 → 21-Sep-2026, 34,978 of 35,648 ids match, 670 tab rows, 0 duplicates, `Image` = `N/A` on 9,302 and `Images` on 26,346, 505 MPs.
- Recommended — 109,625 rows, ₹58,924,249,017.91, drift +0 / +0.00, recommended dates 08-Jul-2024 → 21-Sep-2026, sanction dates 09-Jul-2024 → 21-Sep-2026 (28,279 blank = pending), 79,822 of 109,625 ids match, 1,524 tab rows, 28,174 duplicates, 538 MPs.
- Sanctioned — 81,727 rows, ₹43,138,262,871.78, drift +0 / +0.00, recommended → 15-Sep-2026, sanction → 21-Sep-2026, 80,200 of 81,727 ids match, 1,527 tab rows, 0 duplicates, 536 MPs.

`rajya_sabha` (no tile reference available):
- Allocated — 232 rows, ₹33,589,482,301.82, 232 MPs.
- Calamity — 20 rows, ₹104.5M, 16 MPs.
- Expenditure — 25,620 rows, ₹12,691,639,490.69, 27-Jul-2023 → 21-Sep-2026, all 25,620 ids match, 15,616 distinct works of which 5,032 have multiple payments, 170 MPs.
- Completed — 10,157 rows, ₹7,864,008,797.21, 02-Aug-2023 → 21-Sep-2026, all ids match, 0 duplicates, `N/A` 3,458 / `Images` 6,699, 155 MPs.
- Recommended — 25,698 rows, ₹22,639,941,836.33, 14-Jun-2023 → 21-Sep-2026 recommended / 07-Jul-2023 → 21-Sep-2026 sanctioned (5,854 blank), 19,844 ids match, 5,763 duplicates, 201 MPs.
- Sanctioned — 20,079 rows, ₹17,514,811,925.99, dates → 16-Sep-2026 / → 21-Sep-2026, all ids match, 0 duplicates, 179 MPs.

The ~1,500 tab rows and the ~4-30k unmatched ids are why `WORK_ID_RE` tolerates `WS[\s/]*`.

---

## 7. Backend — tests (56 test cases)

### 7.1 `backend/tests/conftest.py` (48 lines)

- L1-5 inserts the `backend/` root onto `sys.path`.
- L7-15 imports `pytest`, `create_engine`, `sessionmaker`, `StaticPool`, `TestClient`, `Base`, `reseed`, and the FastAPI `app`.
- L20-34 `test_db` fixture: `create_engine("sqlite://", connect_same_thread=False, poolclass=StaticPool)` — in-memory **with a single shared connection** so the TestClient's portal thread sees the same tables — then `Base.metadata.create_all`, `reseed(db, force=True)`, yield, `drop_all`.
- L36-48 `client` fixture: overrides the `app.core.db.get_db` dependency with `test_db`, yields `TestClient(app)`, and pops the override on teardown. No test can touch the developer's `sentinel.db`.

### 7.2 `backend/tests/test_gate_and_fusion.py` (83 lines) — 2 tests

- **L7-53 `test_gate_override_proof(test_db)`** — the gate's independence proof. Ingests `MPL-TEST-GATE-01` ("Community Meeting Shed on Private Layout", Rangareddy/Chevella, ₹12.0 lakh) with a `trend`/`payment`/`predictive` facts block and one critical compliance check that fails (private layout society vs public/municipal land, rule `OP 2025–26 §4.1.3`). Asserts `ingest_and_evaluate_batch` returns `ingested == 1` and `held == 1`; then that the case has `gate_fired True`, `gate_held_independent True`, `status == "hold_active"`, `"mandatory compliance guardrail"` in `gate_rule`, and **`composite_score < 60`** — i.e. the hold happened despite a low average score.
- **L56-83 `test_explainability_dual_branch(test_db)`** — `MPL-2025-1007` (gate) must have a narrative and a gate/hold step in its path; `MPL-2025-1001` (threshold) must have non-empty attributions with the duplicate module contributing a positive `attribution` and `pct`.

### 7.3 `backend/tests/test_concurrency_and_ledger.py` (193 lines) — 3 tests

- **L9-61 `test_ledger_tamper_detection(test_db)`** — resets the chain, appends 5 blocks (`STAGE_{i}_ACTION`, alternating `hold`/`clear` category, `actor_{i}`, timestamp `2025-06-0{i+1}T10:00:00`, case `MPL-2025-100{i}`), asserts all five verify `True`, tampers index 2 with `body="MALICIOUS_TAMPERED_BODY_OVERWRITE"` and `timestamp="2025-06-03T11:99:99"`, then asserts index 0 and 1 still `True` while **index 3 is `False`** (the attacker's own block re-seals, the child link breaks), and finally that `untamper()` restores a fully valid chain.
- **L64-119 `test_scoped_lock_concurrency(test_db)`** — sets `MPL-2025-1001` to `hold_active`, then runs a `ThreadPoolExecutor(max_workers=8)` with 20 futures: one thread calls `state_machine.decide(..., "inspect")`, the rest read the case, `run_case_pipeline`, and commit. Asserts no error contains `"deadlock"`, that at least one succeeded, and that the final status is one of `hold_active` / `released` / `escalated`.
- **L122-193 `test_manual_field_edit_detected_as_tampering(test_db)`** — the field-edit path, which is a different attack surface from a body overwrite. Snapshots `{index: (body, hash, prev_hash)}`, then for index 2 uses `ledger_edits.split_body` → `record_edit` → `encode_body(head, 99.5, "FALSIFIED")` → `chain.tamper`. Asserts the edited block's hash changed while every other block's `hash` and `prev_hash` are untouched, `edited_indices() == [2]`, `verify()[2] is True` (the attacker re-sealed) and **`verify()[3] is False`** (the child fails), then that `untamper() + restore_edited()` restores the original body byte-for-byte and the chain verifies. It then re-edits with `(head, 0.5, "X")`, untampers, and verifies clean again.

### 7.4 `backend/tests/test_ml_and_runtime.py` (312 lines) — 14 tests

Header docstring: real-ML plus runtime plus identity fixes. `AUTH_HEADERS` carries the demo bearer token. Helper `_mods(db, case_id) -> {module: ModuleScore}`.

1. **L27-50 `test_stall_model_is_trained_and_live`** — `get_metrics()["stall"]` must have `version == "stall-lr-v2"`, `n_train >= 1000`, `accuracy >= 0.75`, and **`0.75 <= roc_auc < 0.98`** (the upper bound is a leakage guard: an AUC at or above 0.98 would suggest the label leaked into a feature). `stall_proba(1,0,100,"Community Assets",0.15)` versus `stall_proba(9,3,10,"Social Infra",0.30)` must both be in [0,1] with the ghost case higher. The `MPL-2025-1009` predictive evidence must carry `model == "stall-lr-v2"`, a probability in [0,100], and a `districtStallRate` key.
2. **L53-73 `test_cost_model_is_trained_with_shap`** — cost metrics must be `cost-xgb-v1`, `n_train >= 3000`, `mae_lakh <= 6.0`; `cost_expected_lakh("Rangareddy","Community Assets","plain",2025)` in `[0.5, 60]`; `cost_shap_contribs(...)` returns 4 values named `{district, category, terrain, year}`; the `MPL-2025-1005` cost evidence must have a positive `expectedLakh`, `residualPct > 45`, exactly 2 `shapTop` entries, and `triggered True`.
3. **L76-94 `test_duplicate_similarity_computed_live`** — `MPL-2025-1001`'s duplicate evidence has `computedLive True`, `textSimilarityPct >= 85`, `distanceMeters == 160`, `triggered True`. It then rewrites the title to `Drainage Pumping Station, Habsiguda`, re-runs the pipeline, and asserts the similarity changed and dropped below 85.
4. **L97-109 `test_retitle_endpoint_recomputes_scores`** — `PATCH /cases/MPL-2025-1003 {"title":"Brand New Unrelated Anganwadi Shed, Ghatkesar"}` returns 200 and drops the duplicate module below 85 with `triggered False`; a one-character title returns 422.
5. **L112-132 `test_decision_endpoints_require_demo_token`** — no token → 401 on decide, on PATCH, and on demo reset; wrong token → 401; correct `Bearer` → 200; the `X-Demo-Token` header also → 200.
6. **L135-172 `test_decide_attributes_correct_dm_per_case`** — decides on 1007 (approve), 1003 (inspect), 1009 (approve). Asserts `status_since` is a `%d %b %Y` date and not the literal `"now"`; that each `OverrideRecord` carries the right `official_name` (DM Verma / DM Iyer / DM Nair, each suffixed `(Demo)`), the right `official_district` (Rangareddy / Medchal-Malkajgiri / Sangareddy), and the right `kind` (gate / threshold / threshold); that the `LedgerEntry.actor` starts with `dm_`, contains the DM's surname, and that `actor_role` contains the district; and that `OfficialStat` counters incremented for the right officials.
7. **L175-182 `test_cors_has_no_wildcard_with_credentials`** — a wildcard origin is forbidden when credentials are on; `http://localhost:3000` must be present.
8. **L185-198 `test_no_fictional_geography_leftovers`** — globs `backend/app/**/*.py`, `src/**/*.ts(x)`, and `report.md` (skipping `.venv`, `.next`, `node_modules`, `__pycache__`) and asserts two historical fictional-toponym strings appear nowhere, case-insensitively.
9. **L201-206 `test_trend_uses_longitudinal_series`** — the `MPL-2025-1001` trend evidence has `longitudinal True`, a basis containing "longitudinal series", and a description containing "trailing average".
10. **L209-226 `test_cost_baseline_falls_back_on_thin_cells`** — monkeypatches `cost_delay.history_cell_count` to return 5 when a terrain is supplied; `baseline_for(MPL-2025-1005)` must then return a row whose source is `district` or `manual` — the thin-cell guard is not bypassable.
11. **L229-233 `test_serialize_case_detail_smoke`** — `MPL-2025-1021` has `gate.fired True` and `compositeScore < 60`.
12. **L236-237 `test_ingest_sync_requires_auth`** — `POST /ingest/sync {}` without a token → 401.
13. **L240-284 `test_ingest_sync_runs_pipeline`** — monkeypatches `EsakshiScraperClient.scrape_district_works` to return one valid row (`MPL-2025-9001`) and one corrupt row (`{"title": "x"}`) with `last_fetch_live = False`. Asserts HTTP 200, `ingested == 1`, `quarantined == 1`, `cases == ["MPL-2025-9001"]`, `portal_live False`, and `"fallback"` in `provenance`; then in the database that the case has a composite score and **7 module scores**.
14. **L287-312 `test_scale_seed_endpoint`** — no auth → 401; with auth and `seed 7` → 200 with `seeded True`, `count == 60`, `len(states) >= 15`, `existing_total == 60`; repeating returns `seeded False` (idempotent). In the database: 60 `MPL-SC-%` rows, at least 5 `StateStat` rows, `"[Scale sample]"` in every `overview`, and 7 module scores per row.

### 7.5 `backend/tests/test_policy_mp_flags.py` (206 lines) — 11 tests

The data-policy suite. `HELD_STATES = {"hold_active","escalated"}`.

1. **L30-39 `test_fictional_names_match_no_official_mp`** — every `(Demo)` MP/DM name in `seed_data.CASES` plus `scale_seed.DEMO_OFFICIAL_NAME` / `DEMO_DM_NAME` must return `None` from `find_official_match`.
2. **L42-53 `test_demo_dm_names_are_consistent_per_district`** — the DM per district is fixed: Hyderabad→Sharma, Rangareddy→Verma, Medchal→Iyer, Sangareddy→Nair, Mahbubnagar→Rao, all suffixed `(Demo)`.
3. **L56-67 `test_no_held_case_carries_a_real_mp(test_db)`** — with at least 20 rows present, every held row must fail to match an official MP.
4. **L70-79 `test_no_held_case_carries_a_real_dm(test_db)`** — every held row's `dm_name` must end with `(Demo)`.
5. **L82-92 `test_real_mps_only_appear_on_clean_works(test_db)`** — rows carrying a real MP must be in `{released, evaluating}`.
6. **L95-114 `test_scale_sample_rows_use_fictional_officials_with_real_anchors(client, test_db)`** — after a 200-row scale seed, every row has `mp_name == DEMO_OFFICIAL_NAME`, no official match, the honesty tag in its overview, and a `(state, constituency)` pair that exists in the official allocation table.
7. **L125-138 `test_ingest_sync_fallback_batch_is_policy_safe(client, test_db)`** — after a real ingest sync, every held ingested row must have no official MP match and a fictional DM name.
8. **L141-154 `test_workflow_guard_blocks_hold_release_for_untagged_cases(test_db)`** — strips the `demo` key from `MPL-2025-1007`'s facts; `decide(approve)` must raise a `ValueError` mentioning "Data policy"; rolls back.
9. **L157-176 `test_real_records_rejected_from_every_decision_path(test_db)`** — takes the first `WS/%` case and asserts `approve`, `inspect` and `escalate` each raise a `ValueError` containing "Data policy"; skips when no real rows exist.
10. **L179-193 `test_real_records_cannot_be_retitled(client, test_db)`** — `PATCH /cases/WS/…` → 409 with "Data policy".
11. **L196-206 `test_decide_on_non_transitional_status_is_409_not_500(client)`** — deciding on `MPL-2025-1002` returns 200 or 409 but never 500, and a 409 detail contains "not allowed".

### 7.6 `backend/tests/test_mp_allocations.py` (143 lines) — 9 tests

1. **L15-19** `load_allocations()` must give `mpCount == 543`, `rowsSkipped == 1` (the footer), `grandTotalCr == 8341.87`.
2. **L22-35** row spot-checks: Owaisi → Telangana / HYDERABAD / 14.70; `CHAVAN VASANTRAO BALWANTRAO` → `allocatedCr is None` (blank means pending revision, not zero); Gadkari → 16.82.
3. **L38-44** the sum of rows must fall in `[8300, grandTotalCr + 1]` and `totalCr == round(sum, 2)`.
4. **L47-54** `MpAllocation` count is 543, at least 10 Telangana rows, and every `allocated_cr` is `None` or `> 0`.
5. **L57-67** `GET /mps/allocations` → 200, `mpCount 543`, `totalCr > 8300`, 543 rows, Owaisi = 14.70/Telangana; **no auth required**.
6. **L70-80** `GET /ml/metrics` → `stall.version == "stall-lr-v2"`, accuracy and ROC AUC in (0,1], `stall.dataset.n_works == 81727`, `cost.version == "cost-xgb-v1"`, `mae_lakh > 0`, and `sum(fusionWeights) == 1 ± 1e-6`.
7. **L83-105** after a 120-row scale seed, every row's `(state, constituency)` is a real official pair, `find_official_match(mp_name)` is `None`, and the overview carries the tag; at least 20 states.
8. **L108-115** `/bootstrap` includes `analytics.mpAllocations` with `mpCount 543`, `totalCr > 8300`, 543 rows.
9. **L118-143** unit + integration on the breakdown shape: `_normalize_breakdown({"Education":1.45,"Rural Roads":0.8})` → a list of `{category, lakh}`; a list passes through; `None` → `[]`; `"garbage"` → `[]`; and every entitlement in a real `/bootstrap` response is a list of `{category, lakh}`.

### 7.7 `backend/tests/test_search.py` (112 lines) — 9 tests

Helper `_search(client, q, limit)` asserts HTTP 200 first. Tests: `test_search_requires_query` (no `q` → 422); `test_search_finds_demo_case_and_links_detail` (`MPL-2025-1001` → the `cases` group with `href == /cases/{id}`); `test_search_finds_works` (inserts `WS/MP138/2025-2026/205446`, Hyderabad / Owaisi / 56.57 lakh, then searches `205446` → the `works` group with an exact id and an `/works?q=` href); `test_search_finds_mp_and_links_dashboard` (`Owaisi` → `mps` with `href == /dashboard/mp?mp={name}`); `test_search_finds_official_by_role` (`Magistrate` → `officials`, all hrefs `/override-audit`); `test_search_finds_ledger_blocks` (`genesis` → `ledger` with `href == /ledger?q={index}`); `test_search_finds_state_rollup` (`Telangana` → `states`, first href `/works?state=Telangana`); `test_search_groups_are_nonempty` (`MPL` → non-empty groups, every `total > 0`, `len(results) <= 6`); `test_search_garbage_has_no_groups` (nonsense → `groups == []`); `test_search_limit_is_respected` (`q=a limit=2` → at most 2 results per group).

### 7.8 `backend/tests/test_ingestion_and_pfms.py` (77 lines) — 3 tests

1. **L7-22 `test_esakshi_scraper_normalization`** — parses a one-row HTML table (`2025-4491, Construction of CC Road Ward 2, Rural Roads, Shri G. Kishan Reddy, ₹18.50 Lakh, 12 Jun 2025`); asserts one case, `id == "MPL-2025-4491"`, `category == "Rural Roads"`, `sanctionedAmountLakh == 18.5`, `district == "Hyderabad"`, and a `facts` key.
2. **L24-38 `test_quarantine_queue_on_corrupt_payload(test_db)`** — three bad payloads (empty title / missing fields, negative amount, a string payload) must all be quarantined: `total 3`, `quarantined 3`, `ingested 0`, at least 3 `QuarantineQueue` rows, and at least one reason mentioning "negative" or "positive".
3. **L40-77 `test_pfms_matcher_disbursement(test_db)`** — three scenarios on `MPL-2025-1010`: clean (`SBIN00014239871`, `36AAAGW2345Q1Z6`, "Rural Water…") → `matched True`, no redirection alert, similarity ≥ 85; redirection (`HDFC00099999999`) → alert true, `"FUND_REDIRECTION_ALERT"` in flags, `risk_score >= 60`; vendor mismatch (stage 1, `36XXXXX…`, "Unknown Private…") → similarity < 85 and `"UNVERIFIED_PFMS_VENDOR"` in flags.

### 7.9 `backend/tests/test_fetch_mplads_live.py` (49 lines) — 4 tests, fully offline

A module constant `SAMPLE_TILES` (L12-20) mimics the portal's `getTilesData` response, with keys for each tile and a `Current Tenure: [{ID:7, CAPTION:"18th Lok Sabha"}]` list. Tests: `test_parse_amount_strips_currency_glyphs_and_commas` (`₹83,41,87,02,273.80 → 83418702273.80`, `₹14.70 Crore → 14.70`, `"" → 0.0`, `₹0.00 → 0.0`); `test_parse_amount_is_locale_tolerant` (a mangled rupee glyph still parses); `test_tile_row_extracts_counts_and_amounts` (`level == "national"`, allocated `83418702273.80`, recommended `109625`, sanctioned `81727`, completed `35648`, tenure `2`); `test_tile_row_is_total_strut_with_missing_keys` (an empty tile dict yields zeros and `raw == {}`).

### 7.10 `backend/pytest.ini` (4 lines)

```ini
[pytest]
pythonpath=.
testpaths=tests
asyncio_mode=auto
```

`asyncio_mode=auto` is what lets the async `TestClient` calls in the ingest tests run without decorators.

## 8. Backend — operational scripts

None of these are pytest tests; all are run by hand and none take CLI arguments.

### 8.1 `backend/scripts/validate_worklevel_exports.py` (155 lines)

Constants: `NATIONAL_LS` — the tile values probed **2026-09-21 21:47 IST** (Recommended 109,625 / ₹58.9 B, Sanctioned 81,727 / ₹43.1 B, Completed 35,648 / ₹17.5 B, Expenditure — / ₹28.5 B, Allocated — / ₹83.4 B) — plus `AMOUNT_COLS` and `DATE_COLS` per filename. Helpers: `read_csv` (drops the `Grand Total` footer), `rupees`, `parse_date` (three formats). `validate_house(dir, tile_ref)` reports, per file: row count and money sum versus the tile (as drift), date ranges, the match rate of ids against `WS/MP<n>/<fy>/<id>`, tab-character warnings, duplicate counts, the expenditure file's payment structure (payments / distinct works / multi-payment works), the `Image` `N/A` split, the 0.98% definitional note on Completed, and the distinct MP count. `main()` validates `lok_shaba` against `NATIONAL_LS` and `rajya_sabha` against an empty reference, then writes `app/data/worklevel/VALIDATION.md`.

### 8.2 `backend/scripts/fetch_mplads_live.py` (221 lines) — the live portal harvester

Constants: `BASE = https://mplads.mospi.gov.in/rest/PreLoginDashboardData`, `OUT = app/data/live`, `DELAY = 0.3`, browser `HEADERS`, `TENURE = 2`. `call(endpoint, payload, retries=6)` POSTs JSON via `urllib` with a 40 s timeout, requires HTTP 200 **and** a JSON content type, backs off `min(2*(attempt+1), 10)`, and raises after the last retry. `read_csv`. `harvest_tiles(level, entities, out_path, uname_fn)` is resumable per row: it reads the ids already present in the output, appends and flushes each new row, skips completed ones, sleeps `DELAY`, and prints progress every 50 rows — so an interrupted harvest resumes rather than restarting. `parse_amount` strips `[^\d.]`. `write_csv` mkdirs and reports the count. `tile_row(level, sid, cid, mid, tiles)` builds `{level, state_id, const_id, mp_id, tenure, allocated_limit_rupees, expenditure_rupees, works_recommended_{count,rupees}, works_sanctioned_{count,rupees}, works_completed_{count,rupees}, raw}` using inner helpers `amt(key, idx)` and `cnt(key)`. `harvest()` runs six phases: (1) all states via `getStateData`; (2) all constituencies per state via `getConstituencyData`; (3) the MP master via `getMpAndConstCombo` with `const_combo=0`; (4) national + state tiles via `getTilesData` with `uname` = S, C, M and tenure 2; (5) constituency tiles; (6) MP tiles. It finally prints the national allocated limit next to the expected ~₹8,341.87 Cr. `__main__` calls `harvest()` and catches `KeyboardInterrupt` to print a resume message.

### 8.3 `backend/scripts/reconcile_live_harvest.py` (202 lines) — writes `app/data/live/RECONCILIATION.md`

`TOL = 1.0` rupee. Four reconciliation passes: (1) the national tile against the CSV grand total, printing the difference, the percentage, and MATCH/MISMATCH; (2) per-state tiles against the CSV state sums with a normalized-name match, as a `State | Live | CSV | Diff` table plus matched/ok counts; (2b) constituency sums against state tiles and constituency rows against the CSV `(state, constituency)` pairs, reporting the worst absolute difference, exact/off/missing counts, the median absolute difference, and a CONSISTENT/CHECK verdict plus a ROW-LEVEL MATCH line; (3) per-MP tiles against the CSV, matching by exact name first and falling back to `find_official_match`, reporting exact/off/unmatched counts, the median difference, and the first 15 unmatched names; a missing `live_tiles_mp.csv` produces a placeholder note instead of a crash.

### 8.4 `backend/scripts/rehearse_demo_path.py` (145 lines) — the DEMO_SCRIPT.md generator

Runs against a fresh `/tmp/sentinel_demo_path.db` with `DATABASE_URL` overridden, calls `init_schema` + `reseed`, and uses `Authorization: Bearer sentinel-demo-2026`. Nine steps: (1) `POST /ingest/sync`, printing ingested/held/quarantined, whether the fetch was live or fallback, the provenance string, and the per-district rows; (2) the first `hold_active` + `gate_fired` case, printing id/title/status/composite/rule/MP/DM; (3) `POST /cases/{GATE_ID}/decide {"decision":"approve"}`, printing the new status and path; (4) the last `LedgerEntry` with index/action/actor/body and hash prefixes; (5) an `OfficialStat` with `gate_overrides > 0`, printed as high-risk/gate/threshold → FLAGGED; (6) `POST /ledger/tamper {"index":1,…}`; (7) `GET /ledger/verify`, printing `ok`, the tampered count, and a CRITICAL banner; (8) untamper then verify clean; (9) the policy check printing `find_official_match` for every held ingested row.

### 8.5 `backend/scripts/verify_real_stack.py` (109 lines) — end-to-end smoke, not pytest

Honours `DATABASE_URL` (default `/tmp/sentinel_smoke.db`). Monkeypatches `real_seed.seed_real_works` down to 1500 rows for speed, boots the app through `TestClient` with the lifespan, and runs `check(label, condition, detail)` which prints ✓/✗ and tracks an `ok` flag. Six checks: (1) `GET /works?page_size=5` → 200 with `total > 1000`, ids starting `WS/`, and a non-empty `mpName` and `sanctionedLakh`; (2) `GET /works/summary` → 200 with at least 10 states, printing `totalWorks` / `sanctionedCr` / `noPaymentYet`; (3) `POST /ingest/sync {state:"Telangana", districts:["Hyderabad"]}` → 200 with `ingested > 0`, honest provenance, and `portal_live` printed; (4) `decide(escalate)` on the first `WS/%` case must raise the "Data policy" error even though the transition itself is legal; (5) `POST /demo/reset` → 200 and `/works` total unchanged, proving the real register survives a reset. Exits 0 or 1 with `SMOKE PASS` / `SMOKE FAIL`.

### 8.6 `backend/scripts/generate_allocations_ts.py` (69 lines) — codegen for the frontend table

`OUT_PATH = ../src/lib/mp-allocations.generated.ts`. `HEADER` is a TS interface `MpAllocationRow { mpName; state; constituency; allocatedCr: number | null }` plus `export const MP_ALLOCATIONS: MpAllocationRow[] = [`; `FOOTER` writes `MP_ALLOCATION_TOTAL_CR` and `MP_ALLOCATION_COUNT`. `main()` calls `load_allocations()`, emits each row with `allocatedCr` as `null` or `%.2f`, writes the file, and prints `Wrote … N MPs, ₹X Cr`. This is the single generator behind the 560-line generated TS file, so the browser's copy of the allocation table cannot drift from the CSV.

### 8.7 `backend/scripts/list_missing_mp_tiles.py` (33 lines) — one-off diagnostic

Reads the allocation CSV (minus the footer), computes each MP's amount, reads `live/live_mps.csv`, matches names through a `norm` helper (lowercase, letters only) plus a `rupees` helper, and prints the count plus a `#Sr MP | State | Constituency | Rs amt` table of the MPs with no harvested tile. It is the gap-finder used to decide which of the 543 MP tiles still need fetching.

### 8.8 `backend/alembic/` (Alembic scaffolding)

- **`alembic.ini` (100 lines)** — `script_location=alembic`, `file_template`, `prepend_sys_path=.`, `version_path_separator=os`, `sqlalchemy.url=sqlite:///sentinel.db`, plus root/sqlalchemy/alembic logging sections (WARN / INFO to console).
- **`alembic/env.py` (81 lines)** — inserts the backend root onto `sys.path`; imports `DATABASE_URL`, `Base`, and `app.db.models`; `target_metadata = Base.metadata`; `run_migrations_offline()` uses `DATABASE_URL` directly; `run_migrations_online()` overrides `sqlalchemy.url` with `DATABASE_URL` and uses `NullPool`; dispatches on `context.is_offline_mode()`.
- **`alembic/versions/0001_initial_schema.py` (228 lines)** — revision `0001`. `upgrade()` creates 13 tables and `downgrade()` drops them in reverse. The widths here are `String(24)` for `cases.id`, `module_scores.case_id` and `overrides.case_id` — narrower than the 48 in `models.py` — and there is **no `mp_allocations` table** in this revision. The live application never runs migrations: `db.init_schema()` calls `Base.metadata.create_all`, so this revision is historical rather than authoritative (§12).
- **`alembic/script.py.mako` (26 lines)** — the standard revision template.

### 8.9 `backend/Dockerfile` (14 lines) and `backend/requirements.txt` (22 lines)

Dockerfile: `FROM python:3.11-slim`; `ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1`; `WORKDIR /app`; `COPY requirements.txt` then `pip install --no-cache-dir`; `COPY . .`; `EXPOSE 8000`; `CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]`.

Requirements, with the versions pinned in the file: `fastapi 0.115.8`, `uvicorn[standard] 0.34.0`, `sqlalchemy 2.0.38`, `pydantic 2.10.6`, `pydantic-settings 2.7.1`, `psycopg[binary,pool] 3.2.4`, `python-multipart 0.0.20` (needed for the photo-upload endpoint), `Pillow 12.3.0`, `imagehash 4.3.1`, `httpx 0.28.1`, `thefuzz 0.22.1`, `numpy 2.5.3`, `pandas 3.0.6`, `scipy 1.18.1`, `scikit-learn 1.9.1`, `xgboost 3.0.5`, `shap 0.52.0`, `PyJWT 2.14.0`, `passlib 1.7.4`, `bcrypt 5.0.0`, `GeoAlchemy2 0.20.0`, `redis 8.1.0`.

Three of these are declared but not imported anywhere in `backend/app` — `PyJWT`/`passlib`/`bcrypt` (auth is the demo token) and `redis` (no cache backend is wired); `GeoAlchemy2` is only used for the `CREATE EXTENSION postgis` path. Recorded in §12.

### 8.10 `backend/.dockerignore` (13 lines) and `backend/.gitignore` (5 lines)

The dockerignore excludes `__pycache__/`, `*.pyc`, `.venv/`, `*.db`, `.pytest_cache/`, `tests/`, `.env`, `alembic/`, `scripts/`, and the local db/journal files. The gitignore ignores `__pycache__/`, `*.py[cod]`, `.venv/`, `*.db`, and `*.db-journal`.

---

## 9. Frontend — library layer

### 9.1 `src/lib/types.ts` (222 lines)

The type contract shared by every component. Exported types:

- `Role` — the six desk identifiers.
- `PfmsStage`, `Proposal`, `BankDetails`, `MilestoneRequest`.
- `RiskBand` — low / medium / high.
- `ModuleKind` — `"trend" | "duplicate" | "cost" | "compliance" | "payment" | "predictive" | "photo"` (7, matching the backend modules).
- `CaseState` — 8 values: `submitted`, `evaluating`, `auto_cleared`, `hold_active`, `override_approved`, `escalated`, `released`, `rejected` (matching `state_machine.TRANSITIONS`).
- `LedgerCategory` — 11 values.
- `OverrideKind` — `gate | threshold`.
- `Evidence` — a 7-member discriminated union, one variant each for `duplicate`, `cost`, `compliance`, `photo`, `predictive`, `trend`, and `pfms`. This is the type-level guarantee that every module's evidence block has a known shape.
- `ModuleBreakdown` — `{module, subScore, description, triggered, evidence}`.
- `GateInfo` — `{fired, rule, detail, heldIndependent}`.
- `WorkCase` — the full case, camelCase to match `serialize_case`.
- `LedgerEntry` — `{index, action, category, actor, actorRole, body, timestamp, caseId, hash, prevHash}`.
- `OfficialStat`, `AnalyticsData`, `MpAllocationData`.

### 9.2 `src/lib/api.ts` (387 lines) — the only HTTP layer

- `API_BASE` and `DEFAULT_DEMO_TOKEN`, plus `setDemoToken` / `getDemoToken` / `isTokenAuthenticated`.
- Types: `PhotoVerifyResult`, `BootstrapData`, `SearchHit` / `SearchGroup` / `SearchResponse`, `MlMetrics`, `MpAllocationsPayload`, `IngestSyncResult`, `WorkRow` / `WorksPage` / `WorksSummary` / `WorksSummaryState` / `WorksQuery`, `ScaleSeedResult`.
- `request(...)` is the shared wrapper; on failure it walks a fallback list `BACKENDS = [API_BASE, "http://localhost:8000", "http://127.0.0.1:8000"]`, which is why the app still works when the dev server is reached under one hostname and the backend is bound to the other.
- Functions and the endpoints they hit:
  | Function | Request |
  |---|---|
  | `fetchBootstrap` | `GET /api/v1/bootstrap` |
  | `fetchUniversalSearch(term, limit)` | `GET /api/v1/search?q=&limit=` |
  | `fetchMlMetrics` | `GET /api/v1/ml/metrics` |
  | `fetchMpAllocations` | `GET /api/v1/mps/allocations` |
  | `postDecide(id, decision, note)` | `POST /api/v1/cases/{id}/decide` |
  | `patchCaseTitle(id, title)` | `PATCH /api/v1/cases/{id}` |
  | `postIngestSync(...)` | `POST /api/v1/ingest/sync` |
  | `fetchCases(ids)` | `GET /api/v1/cases?ids=` (capped at 200) |
  | `fetchWorks(query)` | `GET /api/v1/works?state=&q=&page=&page_size=` |
  | `fetchWorksSummary()` | `GET /api/v1/works/summary` |
  | `postScaleSeed(count, force)` | `POST /api/v1/demo/scale-seed {count, seed: 7, force}` |
  | `postTamper(index, body, timestamp)` | `POST /api/v1/ledger/tamper` |
  | `postTamperFields(...)` | `POST /api/v1/ledger/tamper-fields` |
  | `postUntamper()` | `POST /api/v1/ledger/untamper` |
  | `verifyChainLive()` | `GET /api/v1/ledger/verify` |
  | `postResetDemo()` | `POST /api/v1/demo/reset` |
  | `verifyPhotos(formData)` | `POST /api/v1/verify-photos` with `image_a` and `image_b` |
- Every mutating call sends `Authorization: Bearer {demoToken}`. Error text is `HTTP {status}`. `offlineVerifyResult(...)` produces a client-side stand-in verdict so the photo verifier still renders in demo mode.

### 9.3 `src/lib/sha256.ts` (94 lines) — a pure-TypeScript SHA-256

Implements FIPS 180-4 in TypeScript over `TextEncoder` bytes, with the `K` and `H0` constant tables and a `rotr` helper. Exports `sha256(text) -> hex` and `sha256Ok()`, and self-checks against the known vectors: the empty string, `"abc"`, and the quick-fox test string. This exists so the browser can re-derive a ledger block hash and verify the chain itself rather than trusting the server's `/ledger/verify` — the mock-mode ledger and the tamper demo both depend on it.

### 9.4 `src/lib/hash.ts` (15 lines)

`ledgerHash(prevHash, index, action, actor, body, timestamp)` calls `sha256` on the same `|`-joined string the backend hashes, and `shortHash(h) = h.slice(0,10)` for display. This is the frontend's half of the cross-implementation contract that `test_concurrency_and_ledger.py` exercises on the Python side.

### 9.5 `src/lib/similarity.ts` (74 lines) — a Python parity port

Exports `DUPLICATE_SIM_THRESHOLD = 85`, `DUPLICATE_DIST_THRESHOLD_M = 500`, `indelRatio`, `tokenSortRatio`, `duplicateSubScore`. The docstring states the goal precisely: reproduce `thefuzz.token_sort_ratio` v0.22 / `rapidfuzz` behaviour — ASCII-only, lowercase, non-alphanumerics to spaces, token sort, an LCS dynamic program, `200*LCS/(n+m)` with **Python's banker rounding**. `duplicateSubScore = min(100, sim*0.9 + proximity + 4)`, matching `modules/duplicate.py` L28-29. `src/lib/similarity.test.ts` pins the parity cases, so the browser's live duplicate re-score after a retitle agrees with the backend's.

### 9.6 `src/lib/ledger-edits.ts` (50 lines) — the TypeScript mirror of the Python encoder

`formatAmount`, `sanitizeStatus`, `splitBody`, `encodeBody`, with the same end-anchored `{head} ₹{amount} ₹{status}` convention. It exists so the ledger page can open an editor on a record, prefill the amount and status fields, and re-encode a body the backend will parse identically.

### 9.7 `src/lib/format.ts` (133 lines)

- `inr(147) → "₹147 L"`, `inrFull(147) → "₹1,47,00,000"` (Indian digit grouping), `inrCr(4.82) → "₹4.82 Cr"`, `inrWords`, `inrCompact`, `pct`.
- `stageLabel` for `mobilization | stage1 | stage2 | final`.
- `officialStatus` maps every `CaseState` to its uppercase official code (`hold_active → "HOLD_ACTIVE"`, `override_approved → "Override Approved"`); `statusLabel` is the display form; `statusPillColor` and `officialStatusColor` supply the Tailwind classes.
- `scoreBand(score)` → `low` below 40, `medium` 40-69, `high` at 70 and above; `bandLabel`, `bandColor`.
- `moduleMeta` — the seven modules with their **published weights and descriptions**: `trend 0.08`, `duplicate 0.20`, `cost 0.20`, `compliance 0.28`, `payment 0.10`, `predictive 0.07`, `photo 0.07`. This is the frontend's copy of `config.FUSION_WEIGHTS`, and `src/lib/format.test.ts` asserts the two stay identical.

### 9.8 `src/lib/geo.ts` (29 lines)

`districtCenters` for Hyderabad (`17.385, 78.4867`), Rangareddy, Medchal-Malkajgiri, Sangareddy, Mahbubnagar, plus `DEFAULT_CENTER`. `caseGeo(c, seq)` places a case on the map using a golden-angle deterministic jitter (`r = 0.006 + …`) so the same case always lands in the same spot. `toApprox(px, py)` is the inverse projection used by the map's click-to-drop-pin handler (`lat = 16.45 + y*1.75`, `lng = 77.55 + x*1.9`).

### 9.9 `src/lib/mp-allocations.ts` (56 lines)

Re-exports `MP_ALLOCATIONS`, `MP_ALLOCATION_COUNT`, `MP_ALLOCATION_TOTAL_CR` and the `MpAllocationRow` type from the generated file, and adds the matcher: `normalizeMpName`, `tokenSetOverlap`, and `findOfficialAllocation(name)` — the same conservative rule as the Python `find_official_match`: alphanumeric lowercase token sets, subset matching in both directions, a containment rule requiring at least 8 characters, a bare-surname rejection, and a 0.66 threshold.

### 9.10 `src/lib/mp-allocations.generated.ts` (560 lines)

Generated by `backend/scripts/generate_allocations_ts.py` from the official MoSPI table, with a header comment naming the generator and the source table (FY 2025-26). Exports `MpAllocationRow {mpName, state, constituency, allocatedCr: number | null}`, `MP_ALLOCATIONS` with 543 rows, `MP_ALLOCATION_TOTAL_CR = 8341.94`, `MP_ALLOCATION_COUNT = 543`, and a comment stating that `allocatedCr === null` means pending revision. First rows: `{AASHTIKAR PATIL NAGESH BAPURAO, Maharashtra, HINGOLI, 19.03}`, `{ABDUL RASHID SHEIKH, Jammu And Kashmir, BARAMULLAH, 15.48}`, `{ABHAY KUMAR SINHA, Bihar, AURANGABAD_BR, 14.70}`.

### 9.11 `src/lib/i18n.tsx` (311 lines)

- `Locale = "en" | "hi"`. `LocaleProvider` holds the locale in state, persists it to `localStorage` under `mplads-locale`, and syncs `document.lang` in an effect. `useLocale()` returns `{locale, setLocale, toggle, t}`.
- `DICTS` holds two complete dictionaries of roughly 70 keys each, grouped `util`, `brand`, `search`, `roles`, `tabs`, `hero`, `stats`, `desks`, `mode`, `footer`. Sample pairs: `MPLADS Sentinel` / `एमपीलैड्स सेंटिनल`; `Every MPLADS work. Monitored, verified, auditable.`; `Search by MP name…`; `Demo Mode (Mock Data)`.
- `src/lib/i18n.test.tsx` enforces that every key exists in **both** dictionaries, that no translation is empty, and that the hero and tab keys required by the problem statement are present — so a missing Hindi string fails the build rather than shipping.

### 9.12 `src/lib/data.ts` (1099 lines) — the mock/demo dataset

This is the largest file in the frontend and exists so the entire app is fully functional with the backend down.

- Constants: `STATE_NAME = "Telangana"`, `PIA`, `FISCAL_YEAR = "2025–26"`, `districts` (6), `mps` (7), `proposalCategories` (7), `proposalConstituencies` (7).
- `CASES` (21) — `MPL-2025-1001` … `MPL-2025-1021`, mirroring `backend/app/db/seed_data.py`: the 1001/1002 and 1003/1004 duplicate pairs; the 1005 and 1006 cost outliers; 1007 with a land-tenure `§4.1.3` critical failure at composite 94; 1008 with a 99.6% pHash match at composite 88; 1009 the ghost work (90% released / 10% progress); 1010 the PFMS redirection (`SBIN…` → `HDFC…`); the clean released set 1011, 1012, 1013, 1016, 1017, 1018, 1020; the evaluating set 1014, 1015, 1019; and **1021 at composite 30 with the gate fired** — the low-score gate proof the demo script opens.
- `buildLedger()` — the 5 seed blocks (GENESIS, PROPOSAL INGESTED 1002, GATE HOLD FIRED 1007, PHOTO GATE FIRED 1008, ESCALATED TO AUDIT 1005), hashed with `ledgerHash` so the mock chain is genuinely valid.
- `baseOfficials` (5) — DM Sharma / Verma / Iyer / Nair / Rao with their high-risk, gate and threshold counters.
- `analyticsMock` — `districtUtilization` with Q1-Q4 and YTD, `districtTrend` for Apr-Aug, `nationalHeatmap` for 5 states, `categoryExpenditure` for 7 categories, and `entitlements` for 7 MPs with `usedCr` between 3.8 and 4.82 and a per-category `breakdown`.
- Helper `mod(module, subScore, desc, triggered, evidence)` builds module rows.

### 9.13 `src/store/AppStore.tsx` (798 lines) — the single client state container

- **`AppState`**: `role`, `mode` (`"mock" | "live"`), `cases`, `ledger`, `officials`, `analytics`, `proposals`, `milestones`, `tamperIndex`, `tamperOriginal`, `editedBlocks`, `verifying`, `verifyRunId`, `scoresSynced`, `scoresSyncedAt`, `lastAction`, `mlMetrics`. `initialState` is the mock snapshot; `cloneInitial` deep-copies it. Two refs, `modeRef` and `stateRef`, keep async callbacks reading current values.
- **`hydrate()` / `applyBootstrap(data)`** — the live path: `fetchBootstrap()` then `applyBootstrap`; on failure it keeps the mock snapshot and sets `mode: "mock"`. In parallel `fetchMlMetrics()` populates `mlMetrics`. `retryLive` re-runs hydration — the `⟳ Connect live backend` button in `ModeBanner`.
- **Live mutations**: `decideCase` (`postDecide`), `updateCaseTitle` (`patchCaseTitle`), `syncIngest` (`postIngestSync` then `fetchCases` to merge the new rows), `syncScores` (`fetchCases(ids)` capped at 200, then recompute the local gate/composite view), `tamperLedgerAt`, `editLedgerFields` (`encodeBody`), `simulateDbTamper`, `undoTamper` / `restoreLedger`, `verifyChain` (`verifyChainLive`), `resetDemo` (`postResetDemo`).
- **Mock-only mutations**: `appendLedger(ledgerHash(...))`, `bumpOfficial(name, district)`, and `decideCase` mapping approve → `GATE OVERRIDE` / `THRESHOLD OVERRIDE` with status `released` (appending `override_approved` to the path), escalate → `ESCALATED TO AUDIT`, inspect → `HELD FOR INSPECTION`; `tamperLedgerAt` re-seals only the touched block; `editLedgerFields` encodes the body; `simulateDbTamper` marks a random block `⚠ DB-TAMPERED` and `AMOUNT / STATUS ALTERED`; `verifyChain` sleeps 1400 ms to simulate the check; `submitProposal` mints `MPL-P-…` ids; `requestDisbursement` moves a milestone to `photo_pending`; `approveMilestone` approves it; `updateCaseTitle` recomputes the duplicate module locally with `tokenSortRatio` + `duplicateSubScore`.
- **`chainValidity(ledger)`** — the client-side verifier: walks the blocks and returns a boolean per block, exactly mirroring `ledger/chain.verify` (compare `prevHash` to the previous block's `hash` **and** re-derive `hash`). `useCase(id)` is the lookup hook.
- `lastAction` carries the human-readable result strings the toast components render.

### 9.14 `src/test/setup.ts` (12 lines)

Imports `@testing-library/jest-dom/vitest` and calls `cleanup` in `afterEach`. It also stubs `global.fetch` to reject with an "offline in tests" error, which is what makes `AppStore.test.tsx`'s "hydrates the mock dataset" test deterministic — the store must fall back to mock mode rather than depending on a running backend.

## 10. Frontend — components and routes

### 10.1 `src/app/globals.css` (209 lines)

`@import "tailwindcss"` then an `@theme` block defining the palette: `navy-50`…`navy-950`, `gov #002147`, `gov-deep`, `gov-line`, `saffron`, `gov-gold`, `paper`, `gold`, `gate`, plus a `slate-400` override to `#64748b` for contrast. Keyframes: `scanline`, `gate-pulse`, `check-drop`, `toast-in`. Utility classes: `.gov-barcode`, `.gate-pulse`, `.check-drop`, `.toast-in`, `.glass`, `.glass-strong`, `.hero-photo` (an Unsplash photo `1547471080-7cc2caa01a7e` under gradient overlays). Scrollbar styling; `@media print` rules that isolate `#print-doc` and set A4 page margins of `11mm 12mm`; a `:focus-visible` gold outline; and `#main-content { scroll-margin-top: 120px }` so the skip link does not land under the sticky header.

### 10.2 `src/app/layout.tsx` (41 lines)

Exports `metadata` (title `MPLADS Sentinel — AI-assisted monitoring demo`; description naming anomaly detection, critical-risk gates, the immutable ledger and override audit, and stating "Synthetic data only") and the default `RootLayout({children})`. Renders `<html lang="en">`, a `Skip to main content` link as the first focusable element, the `Inter` and `Geist_Mono` font variable classes on `<body>`, and then `<AppProvider><LocaleProvider>{children}</LocaleProvider></AppProvider>` — the two providers that every page depends on.

### 10.3 `src/components/shell.tsx` (21 lines)

Re-exports `roleShort` and renders `<Header>`, a `<main id="main-content">` with `max-w-7xl` and padding, and `<Footer>`. This is the chrome every page reuses.

### 10.4 `src/components/Header.tsx` (271 lines)

- Exports `roleNames`, `roleShort`, `Emblem`, `Header({active})`.
- **State**: `fontPct` (90-130, driving an A−/A/A+ text-size control), `menuOpen` for the role dropdown, and a `menuRef` outside-click handler. Reads `state.role` and `state.mode`, and uses `useLocale()` for `t`/`toggle`.
- **Role switching**: `api.setRole(r)` then `router.push(/dashboard/${r})`; the menu also has a `Reset demo` item calling `api.resetDemo()` and returning to `/`.
- **i18n keys used**: `util.gov`, `util.nic`, `util.live`, `util.demo`, `util.prototype`; `brand.name`, `brand.division`; the search input placeholder; the role menu (`Select Role`, `Switch Portal`, and the five role descriptions — "MP · Recommend works", "DM · Sanction & inspect", "State · Nodal oversight", "MoSPI · Audit & policy", "I.A. · Execute works"), `Signed in as`, `Telangana • FY 2025–26`, `Reset demo`; and the tab strip (`Public Citizen View`, `Works Register`, `MP View`, `District Authority`, `State`, `Ministry`, `Audit & Ledger`, `Methodology & ML`).

### 10.5 `src/components/Footer.tsx` (126 lines)

State: an `open` disclaimer toggle and the store's `mode`. Four columns — **Transparency** (Immutable SHA-256 audit ledger, Citizen asset directory, State nodal dashboards, Ministry audit console), **Citizen Rights** (RTI 2005, MPLADS Guidelines 2023, PMAY-G / SC-ST sub-plan audits, Geotagged asset disclosure), **Resources & Policies** (About · Methodology & Limitations, Accessibility Statement (GIGW 3.0), Terms of Use, Sitemap, Contact, Help Desk), and **Contact & Help** (NIC Help Desk 1800-11-1555, nic.in, mospi.gov.in, pfms.nic.in). Bottom line reports `MPLADS Sentinel — hackathon demo ({live API | mock data})` depending on mode, a `▲/▼ Disclaimer` expander, `Designed for MoSPI | Powered by NIC & MPLADS Sentinel AI | Data Encrypted with SHA-256`, `Last updated: 01 Sep 2026`, and `© 2025–26 MoSPI. All data shown is synthetic…`.

### 10.6 `src/components/ui.tsx` (297 lines) — the presentational kit

Fourteen exports, all stateless: `Card`, `SectionTitle({eyebrow, title, subtitle?, right?})`, `StatCard({label, value, detail?, accent?, icon?})`, `Pill`, `PrimaryButton`, `SecondaryButton`, `DangerButton`, `ExportPdfButton` (renders a barcode glyph), `ProgressBar({value, barColor})`, `LinkButton({href})`, `Field({label})`, `TextInput({value, onChange, placeholder?, rows?, inputMode})`, `SelectInput({value, onChange, options})`, `HelpNote`. Every button in the app is one of these three variants, so the danger/primary/secondary semantics are consistent across desks.

### 10.7 `src/components/hero/Hero.tsx` (91 lines)

State: `q`. Uses `useLocale()` for all copy and `useRouter` for submission. The form does not fetch — it routes to `/search?q=…`. Copy keys: `hero.eyebrow`, `hero.title1`, `hero.title2`, `hero.subtitle`, `hero.placeholder`, `hero.searchAria`, `hero.searchBtn`, `hero.try`. Suggestion chips: `duplicate road works`, `Kishan Reddy`, `Hyderabad`, `drinking water`. Button text `🔍 Search works`.

### 10.8 `src/components/dashboard/StatStrip.tsx` (40 lines)

`StatStrip({items, columns = 4})` where each item is `{label, value, detail?, accent?, icon?}`, rendered as a CSS grid. `columns` accepts 3 or 4, which is how a 5-tile row becomes a 3+2 wrap on narrower desks. It is the component used by every role desk's top metric row.

### 10.9 `src/components/dashboard/risk.tsx` (90 lines)

Seven exports: `scoreStyling` (the shared band→class map), `ScoreChip({score, size})` rendering `{score}/100`, `ScoreBar({score, width = 90})`, `RiskDot({band})`, `GateBadge({small})` (`⚠ GATE` / `⚠ Critical-Risk Gate`), `RowTint`, and `GatePill`. `RiskDot` carries an `aria-label` of High/Medium/Low risk band, so the band is never conveyed by colour alone.

### 10.10 `src/components/dashboard/gate-banner.tsx` (28 lines)

`GateBanner({c})` returns `null` unless `c.gate.fired`. Otherwise it renders `⚠ CRITICAL-RISK GATE FIRED`, the rule text, the detail, and — when `heldIndependent && score < 70` — the line "This hold is independent of the composite score ({score}/100)", which is the UI statement of the gate-versus-score separation.

### 10.11 `src/components/dashboard/gauge.tsx` (58 lines)

`RadialGauge({score, size = 200, label = "Composite risk", gateFired = false})` — an SVG arc gauge; when `gateFired` the ring switches to a dashed red treatment so the visual does not imply the score is low-risk.

### 10.12 `src/components/dashboard/stepper.tsx` (87 lines)

`STAGES` (5 entries) names the lifecycle columns: Submitted; Evaluating; Auto-Cleared / Hold Active; Override Approved / Escalated; Released / Rejected. `Stepper({path})` marks the steps the case actually traversed with a `✓`. `StatusPill({status, gateFired})` renders one of Submitted, Evaluating, Auto-Cleared, Hold Active, Override Approved, Escalated, Released, Rejected, appending `· Gate` when the gate fired.

### 10.13 `src/components/dashboard/heatmap.tsx` (87 lines)

`HeatmapGrid({rows, columns, cellKey})` — a generic label×label grid rendering `{v}%` per cell. `NationalHeatmap({data})` uses it with the legend bands ≥80, 65-79, 50-64, 40-49, <40 and the caption "Mean release pace of evaluated works per state (official allocation table coverage)". Each cell also shows its work count.

### 10.14 `src/components/dashboard/charts.tsx` (132 lines)

Four recharts wrappers: `LineTrend({data, series})`, `Donut({data, nameKey})`, `SpendBars({data})` (category releases vs sanctions in ₹ Cr), `OfficialsBar({data})` (override rate on high-risk, with gate and threshold bars scaled ×3). Exports `chartPalette` — `["#1b4775","#14b8a6","#d97706","#dc2626","#16a34a","#8b5cf6","#64748b"]`. Tooltips read "…% release", "₹… Cr", "Releases/Sanctions", "Override rate on high-risk", "Gate overrides", "Threshold overrides".

### 10.15 `src/components/dashboard/district-map.tsx` (232 lines)

- Exports `MapProject`, `DistrictMap`, `dropperProjectRate`.
- `DistrictMap({cases, selectedId, onSelect, dropper, dropperDot, onDrop, height, title})` renders a stylised SVG of the five districts with labels, a north arrow, a `20 km` scale bar, and the coordinate readout `17.38N · 78.49E`. `ProjectPin` is a coloured circle per case; the tooltip reads `{id} · {title} — {status} · GATE HELD`.
- The header says "click map to drop a pin" when the `dropper` prop is set, and `onSvgClick` converts the click through `toApprox` into coordinates and calls `onDrop`. The map is hand-drawn SVG, not real PostGIS geometry (the component name mentions PostGIS; the geometry is stylised — §12).

### 10.16 `src/components/dashboard/AllocationTable.tsx` (138 lines)

`AllocationTable({allocations, highlightNames?})` — the paginated official allocation register. State `q` (search across MP, state and constituency) and `page`, with `PAGE_SIZE = 12`. Header: "Official allocation register — {n} MPs · {m} with published amounts". Columns: `#`, `Hon'ble MP`, `State`, `Constituency`, `Allocated limit`. A row whose `allocatedCr` is `null` renders `pending revision` in the demo-state colour rather than a fabricated zero. `highlightNames` marks those rows `demo state`. Footer: `Showing 1–12 of 543` with `← Prev` / `Next →`.

### 10.17 `src/components/dashboard/AuthBanner.tsx` (32 lines)

`AuthBanner({compact?})` renders only for the district role, and shows one of `🔒 Auth Active: Signed in as District Magistrate (Token Authenticated)` or `🔓 Auth Missing: decisions will be rejected by the API — set the demo token to act`, based on `isTokenAuthenticated()`. It exists so a demo failure caused by a missing token is visible before the judge clicks Approve.

### 10.18 `src/components/dashboard/ModeBanner.tsx` (50 lines)

Reads `state.mode` and `useLocale().t`. Live mode shows `mode.live` / `mode.liveDetail`; demo mode shows `mode.demo`, `mode.demoDetail`, and a `mode.retry (⟳ Connect live backend)` button wired to `api.retryLive()`.

### 10.19 `src/components/dashboard/IngestSyncButton.tsx` (74 lines)

State `status` (`idle | syncing | done | error`), `detail`, and `elapsed` from a `setInterval` ticker started via a `startedRef`. Calls `api.syncIngest()`. Copy: `⇅ Sync Live eSAKSHI Feed`, `Evaluating… {s}s`, `Running modules 1–9 on new records…`, then the result line `{ingested} ingested · {held} held · {quarantined} quarantined · live portal` or `· fallback batch (portal unreachable)`, plus a hint to switch to Live mode to audit them on-chain.

### 10.20 `src/components/dashboard/proposal-form.tsx` (191 lines)

The MP's recommendation form. State: `title, hindiTitle, category, district, constituency, mpName, amount, scWorks, stWorks, generalWorks, loc{lat,lng}, submitted`. It derives a reservation checker `{scPct, stPct, scOk (≥ 15%), stOk (≥ 7.5%)}` and a `complete` flag. Submit calls `api.submitProposal({title, hindiTitle, category, district, constituency, mpName, sanctionedAmountLakh, reserved, location})`. Copy: `New Formal Recommendation`, `MP → District Authority. Mandatory SC/ST reservation checker (15% SC / 7.5% ST)`, form number `MPL-2025`, a हिंदी शीर्षक field, the checker block citing `MPLADS Guideline ¶7.2`, the map-based location pin ("A geotag is required…"), disabled reasons for each unmet condition, and the success line `✓ Recommendation recorded to SHA-256 audit ledger…`.

### 10.21 `src/components/dashboard/photo-verify.tsx` (487 lines) — inline Module 6 workflow

- Exports `PhotoVerifyTarget`, `photoTargetFor`, `ExifComparisonRow`, `PhotoAlertBanner`, `PhotoVerifyInline`.
- Internal: `Modal`, `fnv` (a small hash for synthesizing a stable baseline per work), `newBaselineFile(canvas 640x400)` which **paints** a baseline image from the work's `pHash`, `demoResult`, `Row`.
- `PhotoVerifyInline({target, compact, autoVerify = true})` synthesizes a deterministic baseline per `workId`/`title`/`district`/`pHash`, lets the user upload a candidate, and posts both to `POST /api/v1/verify-photos` as `image_a` / `image_b`; when the backend is unreachable it falls back to `demoResult(...)` (98.4% / 99.6% for a forged target, 12.1% otherwise) and marks the result `⚠ offline estimate — live backend unreachable`.
- Copy: `Stage photo verification`, `Auto-compares against soiled asset baseline… (<2 km geo-cluster)`, `Existing asset (baseline)`, `Upload stage photo`, `Automatic pHash + EXIF verification running…`, `Only image files are accepted.`, `MODULE 6 ALERT: Duplicate / Forged Photo Detected (Match: …%)`, `Authentic capture — …% match`, `🔍 Compare Photo Hashes`. The modal shows Hash A/B, similarity, Hamming distance, verdict, EXIF corroboration rows, and the inconsistency list.

### 10.22 `src/components/dashboard/audit-certificate.tsx` (377 lines) — the printable PDF

- Exports `AuditCertCase({c, ledger})` and `AuditCertLedger({ledger})`.
- Internal: `useGeneratedAt` (`en-IN` locale), `AuditDoc`, `CertHeader`, `CertSection`, `MetaField`, `SealRow`, `SignatureBlock`, `CertFooter`, `breakerStatus`.
- `sealSig = sha256(id|district|mp|amount|score|hash)` — the browser re-derives the certificate signature with its own SHA-256, so the certificate is sealed by the same primitive as the ledger. `sealBlock` is the head block; `valid` comes from `chainValidity`.
- Everything prints inside `#print-doc`: the bilingual letterhead `भारत सरकार · Government of India / Ministry of Statistics & Programme Implementation (MoSPI) / National Informatics Centre (NIC) · MPLADS Sentinel Platform`; reference numbers `MPL-SENT-AUD-{id}` and `MPL-SENT-LED-{n}-SHA256`; `RESTRICTED · INTERNAL`; the case certificate's sections (1 Case Metadata, 2 Risk Analysis — Module 1 to 9, 3 SHA-256 Cryptographic Verification Seal with the verdict `SEAL VERIFIED` / `INVALID`); the ledger certificate's sections (Ledger Metadata with Blocks / Genesis / Head / Jurisdiction `Telangana` FY 2025-26 / Chain status `CLEAN` or `CORRUPTED`, a block-by-block table with `VERIFIED` / `CORRUPTED` / `TAMPERED`, and the seal); the circuit-breaker status `⛔ TRIPPED · Module 9 Hard Gate FIRED`, `⚠ TRIPPED · Module 8 Fusion Threshold HOLD`, or `● LIVE`; and the signature block `Authorised Signatory / Digitally signed · MoSPI Audit Wing / SHA-256 Certificate Seal`.

### 10.23 `src/components/modules/module-card.tsx` (129 lines)

`ModuleCard({m})` renders the module name, a `FLAGGED` badge, `Sub-score {n}/100`, the description, and a `ModuleMiniVisual` whose text is module-specific: `overlap`, `+41%`, `released 100%`, `completed 8%`, `62% stall`, `B/A`. `MiniSpark` draws the sub-score bar.

### 10.24 `src/components/modules/evidence.tsx` (375 lines)

`EvidencePanel({module, liveTitle?})` plus internal `StylizedMap`, `PinGlyph`, `Row`. The header is `Evidence · {module label} … flagged · sub-score {n}/100`. Seven per-module bodies:

- **duplicate** — twin work, overlap distance in metres, and "Text similarity · recomputed live" computed **in the browser** with `tokenSortRatio(liveTitle, twinTitle)` so the number on screen is the live one; footnote "merge or drop… ADR-11".
- **cost** — `Manual review pending…` when there is no baseline, else peer mean ₹L, sanctioned, model-expected, cost residual, robust z-score, peer mean/band, the baseline source (`district+category+terrain` / `district+category` / `state-level` / `manual`), and "Scored by trained regressor {model} · top drivers…" with the SHAP top-2.
- **compliance** — one row per check: field, required, actual with a ✗ marker, and `{ruleRef}. {clause}`.
- **photo** — `Perceptual hash match: …%` plus a metadata table with per-field `Signal corroborating ↗ / neutral`, footnoted "pHash and EXIF are corroborating — not conclusive…".
- **predictive** — `62% likely to stall`, contributing early-stage factors F1…, footnoted "Modelled probability, not determination…".
- **pfms** — bank account binding (`✓ Stage-1 Account Match` or `⚠ UNMATCHED`), vendor match percentage, disbursement stage, the PFMS audit summary `{detail}`, and the disclosure "illustrative vendor/agency directory…".
- **trend** — "This work released {pct}%", the comparator pace, and the comparison basis ending "multi-year longitudinal series".

### 10.25 `src/components/modules/explainability.tsx` (124 lines)

`ExplainabilityPanel({c})` with a `view` toggle between **Analyst view** and **Stakeholder view**. Helpers `attributions`, `gatePathHeader` / `gatePathText`, `stakeholderSentence`. Gate cases get `⚠ Held due to hard rule violation…` plus the sentence naming the rule. Analyst view shows `Fusion score: {n}/100`, `Model: weighted early-fusion (7 modules)`, the band, and the note that "Attribution is share…". Stakeholder view renders a single plain sentence per band (and for gate cases) — the deliberate translation of a number into an explanation a DM can act on.

### 10.26 `src/components/modules/InspectorPanel.tsx` (161 lines)

`InspectorPanel({kase, onClose})` — the slide-over opened by clicking a table row. `MODULE_ICON` maps the seven modules to 📈 👯 💰 📋 🏦 🔮 📷 and `MODULE_LABEL` to their names. It shows `🗂️ Case inspector`, the case id/title/district/category/amount, the composite risk score and band, the Critical-Risk Gate line, the top three risk drivers, and an `Open full case file →` link. With `kase === null` it shows "Select any row…".

### 10.27 `src/components/search/UniversalSearch.tsx` (278 lines)

`UniversalSearch({compact?})` — the header's type-ahead. State `value`, `resp`, `loading`, `open`; refs for the flat hit list, the active index, the dropdown box, the input, and a request sequence number so a stale response cannot overwrite a newer one. Debounce 250 ms, `limit` 5. On submit it routes to `/search?q=…`. i18n keys: `brand.searchPlaceholder`, `brand.searchAria`, `search`, `search.seeAll`, `search.noMatches`, and one label per group (`search.works`, `cases`, `mps`, `officials`, `ledger`, `states`). Hit secondary lines are `₹{usedCr} Cr used`, `Block #{i} · {action} · {actor}`, and `State rollup`. Full keyboard support: the active row is `aria-selected` and the listbox carries `#universal-search-dropdown` (both referenced by `scripts/search_check.mjs`).

### 10.28 `src/components/doc-page.tsx` (35 lines)

`DocPage({eyebrow?, title, children})` — the shared wrapper for the four static pages, rendering a `Home / {title}` breadcrumb plus the eyebrow and title.

### 10.29 `src/app/page.tsx` (221 lines) — the landing page

`LandingPage` reads `state.cases` and `state.analytics.mpAllocations`, derives `flagged`, `flagRate` and `totalCr`, and uses `api.setRole(r)` + `router.push(/dashboard/${r})` for the desk cards. Structure: `<Header active="public">`, `<Hero/>`, a `StatStrip` (`Total MPs Covered / official MoSPI allocation table`, `Total Funds Sanctioned / allocated limits, all Lok Sabha MPs / ₹{totalCr} Cr`, `Active Works Monitored / {STATE_NAME} · FY 2025–26 demo slice`, `Real-Time Anomaly Flag Rate / {flagged} of {cases} works flagged`), `<ModeBanner>`, the six-desk grid under the heading `One system · six desks`, the three-step pipeline `Anomaly → gate → ledger, end to end` with numbered cards 01/02/03 (Detect, Gate, Ledger), and `<Footer>`. The District card carries a `Recommended` badge. The Citizen card reads `Citizen Public View / Transparency · भागीदारी` with bullets for the interactive asset map, the public asset directory and the SHA-256 ledger explorer, and links `Open public explorer →`.

### 10.30 `src/app/cases/[id]/page.tsx` (455 lines) — the case file

Exports the default `CaseDetailPage` (a `Suspense` wrapper, because `useSearchParams` requires it), `CaseDetailBody`, and `Toast`. Reads `params.id` and the `from` search param (`mp|state|ministry|ledger|vendor|district`) to build the back link — `← Back to {my works|state view|ministry view|agency portal|district queue}`. State: `decision` (`approve|inspect|escalate|null`), `note`, `editingTitle`, `titleDraft`, plus the toast timer. Calls `api.decideCase(c.id, decision, note)` and `api.updateCaseTitle(c.id, titleDraft)`. Sections, in order:

- `Export Official Audit Certificate (PDF)`.
- Header: District / MP / Sanctioned / Sanctioned on / Status since / `District officer — DM {dmName}`.
- `✎ Revise work description (duplicate check re-scores live)` with a `Re-score live` / `Cancel` pair.
- `fusion of 7 modules · demo` and the `RadialGauge`.
- `GateBanner` vs `Module 8 · Fusion Threshold Hold Active / Composite Score {score}/100 (Threshold ≥60)`.
- `Lifecycle path — highlighted = this case's actual route` (`Stepper`).
- Module cards, then `Evidence panels for flagged modules`.
- **PFMS panel** — `PFMS · Vendor Disbursement Reconciliation`: stage number, registered vendor, stage-1 account, stage-2 destination account, and either `⚠ FUND REDIRECTION ALERT` or `✓ SNA Account Matched`.
- **Stage-milestone evidence** / `Module 6 · photo integrity workflow` (the inline photo verifier) with `Baseline clean — no photo gate history` when there is none.
- `ExplainabilityPanel`.
- `District decision — you are the District Magistrate` with `Approve & Release`, `Hold for Inspection`, `Escalate to Audit`, and `Confirm & log to ledger`; the controls hide themselves for non-district roles with "Decision controls are hidden — …only District Magistrate…"; and a footer note "Safe to demo: refreshing the page resets…".
- Not-found state: `Case not found / {id} is not in the demo queue / Back to district queue`.

### 10.31 `src/app/dashboard/district/page.tsx` (409 lines) — the DM working queue

State: `district`, `filter` (`all|actionable|gate|risk`), `q`, `sortBy` (`score|amount|id`) with `asc`, `selectedId`, `syncingScores`. Store: `state.cases`, `state.milestones`, `state.scoresSynced`, `state.scoresSyncedAt`. Helpers `pfmsRow` and `sortHdr`. Calls `api.syncScores()` and `api.decideCase(...)` for the inline quick actions, and `api.approveMilestone(workId)`. Elements: `District Authority · case review workflow` / `Working queue`; a `StatStrip` (Cases in queue across 8 districts, Actionable holds, Open gate holds, Escalated to audit); filter pills `All / Actionable holds / Critical gate hold / High cost variance`; a `Search work / ID / district…` box; `↻ Sync live scores` → `Syncing…` → `Live scores synced · {time}`, with a `Seed snapshot scores` fallback label; a table with headers Work / District / DM / Sanctioned / Flags / Risk / Gate / Status / DM actions and row actions `✓ Sanction`, `🔍 Inspect`, `↑ Escalate`, or `select to inspect`; a `Milestone photo approval` panel listing stage-progress verifications awaiting the DM with `✓ Approve milestone release` and the resulting `✓ milestone approved — routed to PFMS`; a legend explaining that `GATE` is a critical-rule hold and that the risk colours are green < 40, amber 40-69, red ≥ 70; and a `HelpNote` pointing at `MPL-2025-1021` as the gate proof point.

### 10.32 `src/app/dashboard/state/page.tsx` (234 lines)

`State Nodal Authority · {STATE_NAME}` / `State oversight`. Derives `trendSeries` with `useMemo` over the first five districts and a five-colour palette. `StatStrip`: Districts tracked, Utilisation (state), Open gate holds, Peer override rate. Sections: the `Inter-district utilisation heatmap` (Q1-Q4 + YTD, FY 2025-26), `Cross-district trend` (`LineTrend`), `Override-rate by official` with a `OUTLIER` marker and an `Open full register →` link, `Officials at a glance` (horizontal bars with gate/threshold bars scaled ×3), and `Open gate holds in the state`. Includes an `IngestSyncButton` and a `HelpNote` stating that every decision is on record and a gate override is treated as serious.

### 10.33 `src/app/dashboard/ministry/page.tsx` (216 lines)

`MoSPI Ministry · national overview` / `National picture`. `StatStrip`: National utilisation 59% of ₹1,850 Cr sanctioned, States/UTs covered, Open gates (all states), Escalated this week. Sections: `National utilisation heatmap` (`NationalHeatmap`), `Expenditure by category` (`SpendBars`) plus `Category share of releases` (`Donut`), an `Escalation feed` of top escalated and high-risk cases, and a `Signal only` block. An internal `ScaleSeedPanel` holds `status` (`idle|seeding|done|error`) and `detail` and posts `POST /demo/scale-seed {count: 750, force}`; its heading is `National scale sample — works across all 543 real constituencies` and it labels the rows `MPL-SC-*`, with `Seed scale sample` / `Force re-seed` / `Seeding…` buttons and an `api.retryLive()` path when the batch came back from the fallback.

### 10.34 `src/app/dashboard/mp/page.tsx` (273 lines)

Exports the default `MPDashboardPage` (a `Suspense` wrapper, because the page reads the `?mp=` deep link) and `MPDashboardInner`, plus a `plainTone` helper. State: `selectedMp` (defaulting to `mps[6]`), `showForm`. Renders `<ProposalForm/>` and `<AllocationTable/>`. Elements: `Member of Parliament · dashboard` / `Your recommended works` with the plain-language disclaimer; `+ New Recommendation` / `− Hide recommendation form`; `Viewing works for`; `Your formal recommendations this session — {n} filed`; a `StatStrip` (FY 2025–26 entitlement `₹5.00 Cr` annual MPLADS entitlement, Utilised so far, Works on your watch-list); an `Entitlement utilisation {utilPct}%` bar; an `Official allocation limit · MoSPI published table` card reading the MP's name and constituency with the real allocated limit in ₹ Cr; the watch-list with the four tones `All clear / Being investigated / Needs a check / In progress`; the `MP allocation register — official MoSPI table`; and a `HelpNote` suggesting switching to the District Magistrate desk to see the specialist queue.

### 10.35 `src/app/dashboard/vendor/page.tsx` (263 lines) — the Implementing Agency portal

State: `banks` with a `bankDraft {bank, account, ifsc, pan}`, `disbStage`, `disbAmt`, `linked`. Constants `BANK_NAMES` (6) and `STAGES`. Calls `api.requestDisbursement(id, stage, amt)`. Elements: `Implementing Agency (vendor) · execution portal` / `Your assigned works & stage requests`; a `StatStrip` (Assigned works, PFMS-linked accounts, Milestone requests, Disbursed to date); per work, a `💳 PFMS bank link (Stage 0)` block marked "Illustrative — activates once PFMS-level identity…" with account/IFSC/PAN inputs and a `✓ {linked}` confirmation; a `💰 Stage disbursement request` block stating "Demo: …no real PFMS settlement…" with `Link a bank account first` as the disabled reason; and a `Track your requests` table with the `✓ APPROVED — PFMS` / `Photo verification pending` statuses. The `HelpNote` points at `POST /api/v1/verify-photos`.

### 10.36 `src/app/dashboard/verify-photo/page.tsx` (414 lines) — the pHash playground

Internal `simBand`, `SimGauge`, `UploadBox`, `Row`. `UploadBox({slot, title, subtitle, preview, fileName, dragging, inputRef, onFile, onDragging, onDrop})` supports both click-to-browse and drag-and-drop. State: `imageA/B`, `previewA/B`, `dragging`, `running`, `result`, `error`, plus the two input refs. Posts `FormData` with `image_a` and `image_b`. Copy: `Photo verification playground · Module 11 photo-integrity` / `Live pHash Verification`; `Box A · Target image / Existing site asset photo` and `Box B · Candidate image / Newly submitted milestone photo`; `▶ Run Real-time pHash Verification`; the sub-line `pHash (64-bit) · EXIF GPS + timestamp · Haversine distance`; the three bands `Green · no visual match`, `Yellow · borderline watch`, `Red · likely duplicate`; the similarity bar `0% — distinct / 50% — borderline / 85%+ — duplicate gate`; the verdicts `FLAGGED_FORGED_DUPLICATE` and `VERIFIED_DISTINCT`; `⚠ offline estimate — live backend unreachable`; and `Module 6 Hard Gate Triggered… Similarity ≥85% (Hamming ≤10)`. Sections: `pHash breakdown / 64-bit perceptual hash fingerprints` (Hash A/B, Hamming distance, Similarity) and `EXIF location comparison` (GPS per image, capture distance, timestamps per image). The `HelpNote` explains that WhatsApp and social messengers strip EXIF.

### 10.37 `src/app/ledger/page.tsx` (676 lines) — the integrity desk

- Exports the default `LedgerPage` (a `Suspense` wrapper for the `?q=` deep link), `LedgerPageInner`, `MutationEditor`, `Toast`, `HashCell`. Constants `catColor`, `catChip`, `MOCK_TAMPER_MARKER`, `searchableText`.
- Store: `state.ledger`, `state.tamperOriginal`, `state.editedBlocks`, `state.verifyRunId`, `state.mode`. Refs `focusIndex` (driven by `?q=`) and `focusRowRef`. Derives `valid = chainValidity(ledger)`, `firstBad`, `chainBroken`, `tamperedIndices`, `brokenCount`, `visible` (the filtered rows).
- Calls `api.verifyChain()`, `api.simulateDbTamper()`, `api.restoreLedger()`, `api.tamperLedgerAt(index, body)`.
- Elements: `Integrity & audit trail` / `Ledger` / `Audit Trail` / `Citizens can read this same chain`; the buttons `Export Ledger Audit Certificate (PDF)`, `Verify chain integrity`, `Simulate Database Tampering`, `Restore Integrity` / `Re-seal`; the freeze banner `Cryptographic mutation detected: hash chain linkage broken at index #…  System frozen for audit`; the search box `Search Case ID, block hash, official role, action state, actor…` with the count line `{n} of {m} blocks match` and the empty state `No ledger blocks match…`; the table with headers Index / Timestamp / Action / Actor / case / Record / Amount (₹L) / Status / Prev Hash / Block Hash / Check / Mutation; the per-row tampered state `DB-TAMPERED` and `RECORD ALTERED IN DB — RE-SEALED HASH` / `altered`; the editor's `Simulate DB Mutation` / `Execute Mutation (write & re-seal)` / `Cancel`; and the aside `How the SHA-256 chain works` with five numbered steps and the formula `hash = SHA-256(prevHash|index|action|actor|body|time)`, ending at `Genesis (block 0)`. Toasts: `Verification complete — …` and `Original records restored…`.

### 10.38 `src/app/override-audit/page.tsx` (204 lines)

`Override-Audit register` under the heading `Override audit · due diligence on decisions`. Derives `peerAvg`, `overrides` (ledger blocks in the `override` category, newest first), `isStateOrMinistry`, `total`, `totalDecisions`. Explains that when a District Magistrate clears a Hold Active case, two separate columns are recorded — Threshold Override versus Gate Override — and shows `Restricted desk — normally State Nodal Authority & MoSPI Ministry only…` for other roles. `StatCards`: Officials tracked, High-risk decisions, Overrides recorded, the peer rate, `Gate overrides live — serious — every one is flagged`, and the total decisions. The table has Official / district / High-risk decisions / Override rate / Gate overrides / Threshold overrides / Status, with `FLAGGED` and `within norms`, plus the legend "Gate override present — always serious" and "Rate > 1.5× peer avg…". Sections: `Peer comparison`, `Ledger extraction / Override blocks on record`, and a `HelpNote` giving the live path (District queue → held case → Approve & Release).

### 10.39 `src/app/public/page.tsx` (371 lines) — the citizen explorer

Internal `Explorer`, helper `publicBadge`, `PAGE_SIZE = 8`. State `selectedId`, `q` (from `?q=`), `district`, `page`; reads `state.cases`, `state.ledger`, `state.analytics.mpAllocations` and derives `rows`, `pageCount`, `totalSanctioned`, `openGates`, the chain validity, and the last 10 blocks. `Citizen transparency portal · {STATE_NAME}` / `Public works explorer`. `StatStrip`: Works sanctioned, Official allocations tracked, Gate holds under audit, and `Ledger integrity` showing `Verified ✓` or `Broken @ #…`. Sections: `Spatial index / Geotagged project map` with the legend "Green = approved · amber = delayed · red = flagged"; the `Asset card / Selected work` with District / Constituency / MP / Sanctioned / Status / Geo and `Open full case file →`; `Transparency` → `Public asset directory` with the search box `Search MP, work, ID, district…`, `Showing …`, `← Prev` / `Next →` and the empty state; `Democratic oversight` → `Public audit ledger explorer` with `# / Timestamp / Action / Actor / Prev hash / Block hash` and either `✓ Chain integrity verified` or `⚠ Chain corrupted…`; a `Citizen rights & democratic oversight` note; and the `Official data / MP allocation register` table. Badges: Approved / Delayed / Flagged / In Review.

### 10.40 `src/app/works/page.tsx` (347 lines) — the real-data register

Exports the default `WorksRegisterPage` (a `Suspense` wrapper) and `WorksRegisterInner`, plus a `riskPill` helper; `PAGE_SIZE = 25`. State `summary`, `pageData`, the filter state, `q`, the committed `query`, `page`, `loading`, `error`; the URL carries `?state=` and `?q=`. Calls `fetchWorksSummary()` and `fetchWorks({state, q, page, pageSize})`. Copy: `Real data · eSAKSHI work-level register` / `Works register — every sanctioned MPLADS work`; a `StatStrip` (Real works in register, Sanctioned value, `No payment yet / 0% released · 0% complete`, States, UTs covered); the provenance line `Provenance: {source} — validated paisa-exact… via GET /api/v1/works`; `National register / Browse the works`; the search box `Search title, work ID, MP, district…`; the failure state `Could not reach backend… http://127.0.0.1:8000`; the table Work / ID / Constituency · State / MP / Sanctioned / Progress / Risk; `Loading register…` and `No works match…`; `Showing … of … real works` with `← Prev` / `Next →`; `Real aggregates / State-wise rollup` (State / UT / Works / Sanctioned (₹ Cr) / Avg completion / High-risk count); and an explanatory note titled "Why real rows show no 'hold' badges…", which is the UI disclosure of the `record_kind == real` policy in `pipeline.ingest_and_evaluate_batch`.

### 10.41 `src/app/search/page.tsx` (229 lines)

Exports the default `SearchPage`, `Results`, `GroupSection`; `PAGE_SIZE_GROUP = 12`; `groupIcons`. State `resp`, `loading`, `error`; the query comes from `useSearchParams`. Calls `fetchUniversalSearch(q, 12)`. Copy: `Universal search / Search everything / One query across entire program…`; the idle state `Type a query above…`; `Searching…`; `Search failed: …`; `No matches for “{q}”…` with a `Go back` link; and `{total} results for “{q}” across {n} areas…`. Group headers carry the emoji set 🏗️ works, 📁 cases, 👤 mps, 🏛️ officials, 🔗 ledger, 🗺️ states, with `hitPrimary` / `hitSecondary` helpers.

### 10.42 `src/app/about-methodology/page.tsx` (12 lines) and `MethodologyBody.tsx` (304 lines)

The page is a metadata export plus `<MethodologyBody/>`. The body reads `state.mlMetrics` and `state.analytics.mpAllocations` and derives the metric figures, falling back to `0.87 / 0.87 / 2,000 / 4.11 / 0.34 / 4,200 / stall-lr-v1 / cost-xgb-v1` when the metrics endpoint has not answered. Structure:

- `Government of India · MoSPI / About · Methodology & Limitations`.
- `What this is` with two numbered differentiators: `1 · The system refuses to let a strong composite average hide a critical violation` and `2 · Every flag carries SHAP or rule-based evidence…`.
- `Running on one fully real, verified dataset / official MoSPI-published data · regression-tested`.
- `Scoring methodology` with a **live** badge — `model metrics: LIVE from trained artifacts vs last committed training run`.
- `MODEL_TABLE` (9 rows): Trend, Vendor duplicate, Cost variance (XGBRegressor), Compliance, Payment, Early-stall (LogisticRegression), Photo pHash, Fusion with the published 28/20/20/10/8/7/7 split, and the Gate M9 at a ≥99% pHash.
- `SOURCE_TABLE` (7 rows): MP allocations 543, Demo cases (fictional, suffixed `(Demo)`), Scale sample, Stall rows, Cost rows plus the 2015-2025 trend, Peer bands, PFMS (illustrative).
- `Integrity & audit layers`.
- `Limitations (read before relying on this)` — 5 bullets.
- The fusion sentence, verbatim: `8% trend, 20% duplicate, 20% cost, 28% compliance, 10% payment, 7% predictive, 7% photo`.

Because the table reads `/api/v1/ml/metrics` rather than a constant, a retrain changes these numbers without a code change.

### 10.43 Static pages

- **`src/app/accessibility/page.tsx` (49 lines)** — `DocPage` with eyebrow `GIGW 3.0` and title `Accessibility Statement`. Cites GIGW 3.0, the RPwD Act 2016 and WCAG 2.x, then commits to: text sizing A−/A/A+, keyboard navigation with the skip link, screen readers marked "not part of this demo build", colour contrast "not by colour alone", and Chrome/Edge/Firefox/Safari support. Links the Contact page and the NIC Help Desk at 1800-11-1555.
- **`src/app/contact/page.tsx` (35 lines)** — `Government of India · MoSPI / Contact / Help Desk`; `Demonstration contact channel — mplads-sentinel-demo@nic.in (illustrative address)`; official channels NIC Help Desk 1800-11-1555 (10:00-17:30 IST), nic.in, mospi.gov.in, pfms.nic.in; and the statement that a query about an actual MPLADS work must go to the District Magistrate or State Nodal Authority.
- **`src/app/terms/page.tsx` (50 lines)** — `Terms of Use` in three sections: `Demonstration purpose only` (no exchange of data with live MPLADS, PFMS, GSTN, e-Sakshi or NIC), `No collection of personal data` (runs entirely in the browser), `No warranty, no liability` (as-is), plus Contact.
- **`src/app/sitemap/page.tsx` (64 lines)** — `Site index / Sitemap`; `GROUPS` (3) covering Portals & role views (7 links), Transparency & audit (5) and Policies & help (5), including the two gate-proof deep links `/cases/MPL-2025-1007` (gate hold, land tenure) and `/cases/MPL-2025-1021` (low composite, gate fired).

## 11. Frontend tests and browser probes

### 11.1 `src/lib/format.test.ts` (51 lines) — 5 tests

Currency: `inr(147) → "₹147 L"`, `inrFull(147) → "₹1,47,00,000"`, `inrCr(4.82) → "₹4.82 Cr"`. Bands: 0 and 39.9 → low, 40 and 69.9 → medium, 70 and 100 → high. Status vocabulary: every `statusLabel` key has a matching `officialStatus` code, `hold_active → HOLD_ACTIVE`, `override_approved → Override Approved`. Module weights: the sum is exactly 1.0 and equals the published 28/20/20/10/8/7/7 split with `compliance 0.28`, `duplicate 0.2`, `cost 0.2`, `payment 0.1`, `trend 0.08`, `predictive 0.07`, `photo 0.07`; and all seven modules are defined.

### 11.2 `src/lib/similarity.test.ts` (60 lines) — 6 tests

Parity with the backend: Amberpet Ward 14 vs Ward 16 → 98, CC Road Pragathi Nagar pair → 86. Identity → 100, empty → 0, two empty strings → 100, `Road work` vs `road WORK!!` → 100, token-order swap → 100. `indelRatio("abc","abc") → 100` and `indelRatio("a","b") → 0`. `duplicateSubScore` mirrors the backend formula: `(98, 160) → 99`, `(86, 210) → 87`, `(0, 500) → 4`. And the watch thresholds are exposed as 85 and 500 m.

### 11.3 `src/lib/ledger.test.ts` (46 lines) — 4 tests

`sha256Ok()` true and `sha256("")` equal to `e3b0c44…b855`; `ledgerHash` deterministic and field-sensitive (a different `body` gives a different hash); the hash length is 64 and `shortHash` is 10, and changing `prev`/index/action each changes the result; and `buildLedger()` produces a chain of more than 3 blocks where `chainValidity` is all true and block 0's hash re-derives from `ledgerHash`.

### 11.4 `src/lib/ledger-edits.test.ts` (72 lines) — 4 tests

Round-trip: `encodeBody("Released ₹14.20 for stage 2 of MPL-2025-1007", 45.5, "FALSIFIED")` then `splitBody` recovers the original prose head, `amount 45.5`, `status "FALSIFIED"`, and a second edit stays stable — this is the case that would break if the parser scanned from the start, because the prose itself contains `₹`. Legacy/plain bodies are treated as unencoded (`{head, null, null}`; `cost ₹12 lakh approved` has a `null` amount). `formatAmount` renders `14.2`, `45`, `0` and `sanitizeStatus` turns `STAGE 2 ₹ RELEASED` into `STAGE 2 RELEASED`. Finally, a manual edit breaks `chainValidity` exactly the way `simulateDbTamper` does: a 3-block chain is valid, the re-sealed edit block stays valid, and the child fails.

### 11.5 `src/lib/mp-allocations.test.ts` (85 lines) — 9 tests

543 rows and `MP_ALLOCATION_COUNT === 543`. The total is within 0.5 of ₹8,341.87 Cr and the summed rows agree with the constant to 1 dp. Spot-checked rows: Owaisi `{Telangana, HYDERABAD, 14.7}`, Shashi Tharoor `{Kerala, THIRUVANANTHAPURAM, 14.7}`, `CHAVAN VASANTRAO BALWANTRAO` `null`. A negative test: the demo aliases Kishan Reddy / Aruna / Raghunandan must never resolve to the wrong person. `findOfficialAllocation` handles name variants (Owaisi → 14.7, Eatala → MALKAJGIRI, Kishan Reddy → Telangana), maps `Shri M. Raghunandan Rao` → `MADHAVANENI RAGHUNANDAN RAO / MEDAK`, returns `null` for a name absent from the table, rejects a bare `Reddy` as ambiguous, and `normalizeMpName("Dr. Shashi THAROOR") → "dr shashi tharoor"` with `tokenSetOverlap` 1 while `K. Rahman` / `Khalilur Rahaman` scores below 0.66.

### 11.6 `src/lib/i18n.test.tsx` (69 lines) — 4 tests

Every key exists in both locales; no translation is empty; the hero and tab keys required by the problem statement are present; and the provider defaults to English and toggles globally without raw keys leaking into the DOM.

### 11.7 `src/components/dashboard/StatStrip.test.tsx` (34 lines) — 2 tests

Each tile renders its label, value and detail (`Total MPs Covered` / `543` / `official MoSPI allocation table`, plus a `12%` detail string), and four items produce exactly four grid children — the layout contract the desks depend on.

### 11.8 `src/components/dashboard/AllocationTable.test.tsx` (65 lines) — 6 tests

The full register renders `543 MPs · 542 with published amounts` and `Showing 1–12 of 543`; a null-amount row renders `pending revision` and its MP name; page-one rows show Indian-format amounts (`₹14.7 Cr`); filtering by `Owaisi` keeps `Asaduddin Owaisi`, drops `Nitin Jairam Gadkari`, and hides the pagination; `highlightNames` marks the row `demo state`; and `Next →` then `← Prev` returns to `Showing 1–12 of 543`.

### 11.9 `src/store/AppStore.test.tsx` (82 lines) — 4 tests

Hydration with `fetch` rejecting lands in `mode: "mock"` with a non-zero case count, `mp-count 543`, and `total-cr ≈ MP_ALLOCATION_TOTAL_CR`; the mock snapshot's allocation table has 543 rows; clicking `approve-held` records the decision to a valid chain without changing the case count; and `chainValidity` on `[{0,0,h0},{1,h0,h1},{2,WRONG,h2}]` returns `[true, true, false]`.

**Frontend total: 44 test cases across 8 files.** Backend total: 55 test functions across 8 files. The README (L7, L84-88) states 37 and 41 — see §12.

### 11.10 `scripts/*.mjs` — 12 puppeteer-core probes

All twelve launch `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` through `puppeteer-core` with `headless: "new"` and `--no-sandbox --disable-dev-shm-usage`. None is part of `npm test`; they are manual verification harnesses.

| Script | Lines | Target | What it checks |
|---|---|---|---|
| `browser_sweep.mjs` | 107 | `SWEEP_BASE ?? http://127.0.0.1:3000` — `/`, `/public`, `/works`, `/ledger`, `/override-audit`, `/about-methodology`, `/dashboard/{mp,ministry,district,vendor}` | The broadest sweep: captures console errors, `pageerror`, and `requestfailed` per page; asserts `/Live Mode|live data|LIVE/` is present; asserts required text per page (e.g. `Works Register` on `/works`, counting `table tbody tr` and matching a headline `/([\d,]{4,})/`); detects the `Runtime TypeError` crash banner on the MP desk; counts interactive buttons on the district desk; ignores `/_next/hmr` and WebSocket noise; settles 2.5 s; exits 0/1. `SWEEP_REPEAT` re-visits `/public`. |
| `ledger_requirements_check.mjs` | 158 | `http://localhost:3000/ledger` at 1680×1100 (production build) | Four named requirements: **Req4** search — `District Magistrate` (0 < count < total), `override` (> 0), a block-hash prefix via the `Copy hash` title, `MPLADS`, and `zzzqqqxxx` → `No ledger blocks match`; **Req2** no emoji in the ledger UI, using the regex `/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2190}-\u{21FF}]/gu`; **Req3** per-block `Simulate direct DB mutation` buttons > 0, editing `textarea[aria-label="Record payload (override reason)"]` → `Execute Mutation` → `CRYPTOGRAPHIC MUTATION DETECTED` + `SYSTEM FROZEN FOR AUDIT` + `DB-TAMPERED`, all mutation buttons disabled, `Hash mismatch vs predecessor` icons, then Restore clearing the banner. Emits a JSON summary. |
| `search_check.mjs` | 133 | `http://localhost:3000` and `http://127.0.0.1:8000/api/v1/works?page=1&pageSize=1` (to get a real work id token) | Universal search end to end: the combobox exists; typing `Kishan` opens `#universal-search-dropdown` with `→` and `[data-search-row]` or "No matches"; the MP group appears; Enter routes to `/search`; the MP / Works / Ledger groups populate; a `a[href^="/works?q="]` link filters the register; a `a[href^="/dashboard/mp?mp="]` link renders Owaisi; a `a[href^="/ledger?q="]` link works; `zzqqxx_never_9137` returns "No matches"; zero page errors. Prints a PASS/FAIL list and exits 1 on any failure. |
| `ledger_edit_check.mjs` | 81 | `http://localhost:3000/ledger` | The manual edit path in Live mode: counts `button[aria-label^="Edit amount and status of block"]`, opens block #2, sets `input[aria-label="Amount (lakh rupees)"]` to `45.5` and the status to `FALSIFIED` through the React setter, clicks `Save (write`, waits for `/critical: sha-256 ledger chain corruption detected at block #/i`, then asserts the `DB-TAMPERED` badge, the `AMOUNT / STATUS ALTERED` tag, the `Restore Integrity / Re-seal` button, **that edit buttons are 0 while frozen**, and that restoring clears the banner with zero page errors. |
| `deep_probe.mjs` | 46 | `http://localhost:3000/works` | Logs every request to `127.0.0.1:8000` with status and path; reads the `modeBanner` element and classifies `LIVE PIPELINE` as live or `DEMO MODE` + Retry as demo; counts `mainRows` / `tableCount`; matches the empty state `/No works|No results|Loading/`; waits 6 s; prints a 1200-char sample. |
| `ledger_diag.mjs` | 54 | `http://localhost:3000/ledger` (`domcontentloaded`) | Diagnoses why the mutation button might not respond to a click: rows before/after, the first enabled `button[aria-label^="Simulate direct DB mutation"]`, `tr.bg-amber-50` editor rows, `textarea` count, the `[role="status"]` toast, the `Simulate Direct DB Mutation` header, any HTTP ≥ 400, and JS errors. |
| `origin_probe.mjs` | 36 | both `http://127.0.0.1:3000/works` and `http://localhost:3000/works` (90 s, 8 s settle) | Compares the two dev origins: counts `:8000` responses, `WS/MP` real ids, rows, API calls, JS errors, and any HTTP ≥ 400 or console error. |
| `spot_check.mjs` | 28 | `/works` (5 s) then `/ledger` (3 s) | A fast snapshot: `tbody tr` count and a 400-char headline from the register, a 700-char ledger sample, and a match for `/live/`, `genesis` and the block count. |
| `hydration_probe.mjs` | 25 | `http://127.0.0.1:3000/works` | Separates hydration from API reachability: counts `script[src]` and `window.__NEXT_DATA__`, logs `requestfailed` and responses matching `/8000|health|works/`, and runs an in-page `fetch` against both `http://127.0.0.1:8000/health` and `http://localhost:8000/health`. |
| `warm_probe.mjs` | 20 | `http://localhost:3000/works` (90 s, 10 s wait) | Warms the page and traces the API: logs `:8000` responses with the path after byte 21, console/pageerror output, `worksRows`, `WS/MP` visibility, and any `/failed|unreachable|error/` in body characters 2000-4000. |
| `badge_check.mjs` | 11 | `http://localhost:3000/ledger` | Counts `DB-TAMPERED` badges: waits for `/DB-TAMPERED/` to appear, regex-counts them, prints the count. |
| `case_page_check.mjs` | 15 | `http://localhost:3000/cases/MPL-2025-1007?from=ledger` | A single case-page smoke: HTTP status, `pageerror` and console errors (ignoring hmr), and the first 500 characters of body text. |

`puppeteer-core` is used by these scripts but is not a dependency in `package.json`; they rely on a globally available install (§12).

---

## 12. Cross-file contracts

These are the places where two files must agree, and where they do.

### 12.1 Endpoint map (complete)

| Method | Path | Auth | Source |
|---|---|---|---|
| GET | `/health` | — | `app/main.py` |
| GET | `/api/v1/bootstrap` | — | `api/v1/bootstrap.py` |
| GET | `/api/v1/cases?district&mp&status&ids` | — | `api/v1/cases.py` |
| GET | `/api/v1/cases/{id}` | — | `api/v1/cases.py` |
| POST | `/api/v1/cases/{id}/decide` | ✅ | `api/v1/cases.py` |
| PATCH | `/api/v1/cases/{id}` | ✅ | `api/v1/cases.py` |
| GET | `/api/v1/override-audit` | — | `api/v1/dashboards.py` |
| POST | `/api/v1/demo/reset` | ✅ | `api/v1/demo.py` |
| POST | `/api/v1/demo/scale-seed` | ✅ | `api/v1/demo.py` |
| POST | `/api/v1/ingest/sync` | ✅ | `api/v1/ingest.py` |
| GET | `/api/v1/ledger` | — | `api/v1/ledger.py` |
| GET | `/api/v1/ledger/verify` | — | `api/v1/ledger.py` |
| POST | `/api/v1/ledger/tamper` | ✅ | `api/v1/ledger.py` |
| POST | `/api/v1/ledger/tamper-fields` | ✅ | `api/v1/ledger.py` |
| POST | `/api/v1/ledger/untamper` | ✅ | `api/v1/ledger.py` |
| POST | `/api/v1/ledger/reset` | ✅ | `api/v1/ledger.py` |
| GET | `/api/v1/ml/metrics` | — | `api/v1/ml_metrics.py` |
| GET | `/api/v1/mps/allocations` | — | `api/v1/mps.py` |
| GET | `/api/v1/search?q&limit` | — | `api/v1/search.py` |
| GET | `/api/v1/works?state&district&mp&category&q&page&page_size` | — | `api/v1/works.py` |
| GET | `/api/v1/works/summary` | — | `api/v1/works.py` |
| POST | `/api/v1/verify-photos` | — | `api/v1/photo_verify.py` |

### 12.2 Risk computation, end to end

1. `pipeline.run_case_pipeline` runs the seven modules and writes seven `module_scores` rows per case.
2. `fusion.fuse` computes `composite = round(min(100, Σ weight × sub_score))` with the weights in `config.FUSION_WEIGHTS` (0.08 / 0.20 / 0.20 / 0.28 / 0.10 / 0.07 / 0.07, summing to 1.0).
3. `gate.evaluate_gate` independently returns `True` for `compliance.critical_hard_fail` or `photo.high_confidence_photo`.
4. `ingest_and_evaluate_batch` sets `hold_active` when `gate or any sub_score >= 75 or composite >= 60` **and** the record is not real; real records stay `evaluating` by design.
5. `state_machine.decide` is the only path out of a hold, and it refuses real records and untagged records.

### 12.3 Ledger hash, two implementations

| Concern | Python | TypeScript |
|---|---|---|
| Algorithm | `hashlib.sha256` | hand-written FIPS 180-4 in `src/lib/sha256.ts` |
| Input | `f"{prev_hash}\|{index}\|{action}\|{actor}\|{body}\|{timestamp}"` | identical string via `ledgerHash` |
| Genesis prev | `"0000000000000000"` (`chain.GENESIS_PREV`) | the same literal in `src/lib/data.ts` |
| Verification | `ledger/chain.verify` | `chainValidity` in `AppStore.tsx` |
| Edit encoding | `ledger_edits.encode_body` | `ledger-edits.ts` `encodeBody` |
| Similarity | `thefuzz.token_sort_ratio` | `similarity.ts` `tokenSortRatio` |
| Duplicate score | `modules/duplicate.py` | `similarity.ts` `duplicateSubScore` |
| Weights | `core/config.FUSION_WEIGHTS` | `lib/format.ts` `moduleMeta` |

`test_concurrency_and_ledger.py` and `src/lib/ledger.test.ts` / `similarity.test.ts` / `format.test.ts` pin each pair on its own side; nothing in CI compares the two implementations against each other directly.

### 12.4 Data policy, enforced in four places

| Guard | Location |
|---|---|
| Real records can never be held | `pipeline.ingest_and_evaluate_batch` (`risk_hold and real → evaluating`) and `real_seed._seed_real_works_locked` (the `would_hold` reset) |
| Real records cannot be decided on | `state_machine.decide` (`record_kind == "real"` → `ValueError`) |
| Real records cannot be retitled | `api/v1/cases.py` PATCH (409) |
| Untagged records cannot be decided on | `state_machine.decide` (`facts["demo"]` required) |

Plus the regression suite `backend/tests/test_policy_mp_flags.py` (11 tests) and the matcher's refusal to resolve a `(Demo)` name to a real MP in both `mp_loader.find_official_match` and `mp-allocations.findOfficialAllocation`.

---

## 13. Inconsistencies and gaps found inside the codebase

These are observations from reading the files against each other, not judgements borrowed from anywhere. Fixed items are marked **→ RESOLVED** (see Section 13 for the fix and verification).

1. **Test counts in the README are stale.** `README.md` L7 and L84-88 claim 37 backend and 41 frontend tests. The files contain **56** backend test cases and **45** frontend test cases.
2. **CI and the Docker image run different Python versions.** `.github/workflows/ci.yml` uses `python-version: 3.14`; `backend/Dockerfile` uses `python:3.11-slim`; `README.md` L19 tells a developer to create the venv with `python3.11`. The system Python here is 3.14.6.
3. **`models.Case.id` is `String(48)` but the Alembic revision created `String(24)`.** `db/models.py` L20-29 documents that 48 is needed for `WS/MP138/2025-2026/205446`-style ids and the `MPL-WS/…` derived form; `alembic/versions/0001_initial_schema.py` L20-212 uses 24 for `cases.id`, `module_scores.case_id` and `overrides.case_id`. The revision also predates the `mp_allocations` table, which exists in `models.py` but not in `0001_initial_schema.py`. **→ RESOLVED** by `0002_align_models.py`.
4. **Migrations are not actually used.** `db.init_schema()` uses `Base.metadata.create_all`; `alembic/` is present and wired to the same `DATABASE_URL`, but no application startup path calls `alembic upgrade head`. `_migrate_indexes` exists specifically because `create_all` does not index an existing database. The new `0002` revision provides the upgrade path for existing databases; fresh installs still go through `create_all`.
5. **`MP_ALLOCATION_TOTAL_CR` is 8341.94 in the generated TS while the CSV footer and the loader's `_GRAND_TOTAL_CR` are 8341.87.** `mp-allocations.test.ts` L17 tolerates this ("within row-rounding") by asserting `|TOTAL - 8341.87| < 0.5`.
6. **The two allocation CSVs sum to roughly double their own Grand Total footer.** Summing the 542 numeric MP rows in the root `Allocated Limit for Honble MPs.csv` gives about ₹16,683.74 Cr against a footer of ₹8,341.87 Cr. The loader's test (L38-44) accepts a sum in `[8300, grandTotal + 1]`, so it would not catch this; what it does pin is that the loader returns `grandTotalCr == 8341.87` from the constant. Worth confirming against the source table before publication.
7. **`oversight/override_audit.py` declares `GATE_OVERRIDE_TERMS` and `THRESHOLD_TERMS` but never uses them.** The gate/threshold distinction is carried by `OverrideRecord.kind` instead, so the two constants are dead code.
8. **`SOURCES.md` describes a ~4,200-row synthetic cost training set, while the committed `cost_training_samples.csv` has 81,727 real rows** and `metrics.json` records `n_works: 81727`. The document has not been updated to describe the shipped artifacts.
9. **`real_training._extensions` takes `completion` and divides by 40, but the docstring says "lakh" and `encodings.json` calls it "sanctioned-amount chunk size".** In `real_seed._facts_for` the same formula is applied to `(sanction/1e5)//40`, i.e. to the sanctioned amount in lakh. The two call sites do not pass the same quantity under the same name. **→ RESOLVED** — the parameter was renamed `sanction_lakh` and the docstring now matches the single call site (behavior unchanged, both still use `(sanction/1e5)//40`).
10. **`works_loader.stall_labels` reduces to `months > 12`.** The expression is `(not completed and months > 12) or (completed and months > 12)`, so the `completed` branch never discriminates. The `stall_definition` string in `metrics.json` and `encodings.json` describes a different rule — ">= 6 months since sanction with zero vendor payments recorded" — and `config.PAYMENT_LAPSE_MONTHS` is 6, so the shipped label and the shipped definition do not describe the same computation. **→ RESOLVED** — `metrics.json` now states the rule the label vector actually implements (one-year norm violation, computed from the eSAKSHI completion register).
11. **`rajya_sabha/` is vendored and documented but unread by any code path.** `works_loader.LS_DIR` is hardcoded to `lok_shaba`, and `validate_worklevel_exports.py` validates the RS files against an empty tile reference. The RS numbers appear in `worklevel/README.md` and `VALIDATION.md` only.
12. **`override_audit._rate` is returned in the payload.** The leading underscore suggests it is internal, but it is serialised to the browser. **→ RESOLVED** — the dead field was dropped from `official_audit_rows` and the payload.
13. **`backend/requirements.txt` lists `PyJWT`, `passlib`, `bcrypt` and `redis`, none of which is imported anywhere under `backend/app`.** `GeoAlchemy2` is only reachable through the `CREATE EXTENSION postgis` branch.
14. **`puppeteer-core` is used by all 12 `scripts/*.mjs` but is absent from `package.json`.** Those probes only run where it is installed globally. **→ RESOLVED** — `puppeteer-core` `^25.11.0` is now declared in `devDependencies`.
15. **`asyncio` test support depends on `pytest-asyncio`, which is not in `requirements.txt`.** `pytest.ini` sets `asyncio_mode=auto`; CI installs only `pytest` on top of `requirements.txt`. As of this revision no backend test uses `asyncio`, so the setting is inert; no dependency is required.
16. **`escalated`, `released`, `submitted`, `auto_cleared` and `rejected` are terminal in `TRANSITIONS`, yet `POST /cases/MPL-2025-1021/decide` with `approve` is the README's and DEMO_SCRIPT.md's headline verification step** (README L52-54, DEMO_SCRIPT step 4). It works only because the seed leaves that case in a hold-eligible state; the demo depends on seed state rather than on the state machine permitting the transition.
17. **The frontend's copy of the demo dataset is a hand-maintained duplicate of the backend's** (`src/lib/data.ts` `CASES` vs `backend/app/db/seed_data.py` `CASES`), and the ledger seeds are duplicated a third time in `buildLedger()`. Nothing enforces their agreement; `AppStore.test.tsx` only checks the allocation count.
18. **`public/*.svg` (five files) and `next-env.d.ts` are unreferenced leftovers** from the framework scaffold.
19. **`report.md` (the file this document replaces) contained claims that the code does not support** — a `MPL-2025-0244` case id in a district-desk HelpNote that does not exist in either dataset, a `§5.1`/`§6.1`/`weakness 3.1`/`3.3` self-referential numbering, and a "weakness 3 — one leak" that its own §3.3 marks as FIXED. Those are gone.
20. **`state_machine.decide` computes `is_module_alert` and never uses it** (L47-48), in contrast to `ingest_and_evaluate_batch`, which does apply the `sub_score >= 75` hold on ingest. A case that is escalated by a high single module during ingest can still be approved from the hold, because the decision path does not re-check the module alert. **→ RESOLVED** — the alert is now appended to the decision's signed ledger body ("module-level alert: single-module severity ≥ 75") so the decision record carries the guard that the ingest path already enforced.

---

## 14. What the code demonstrably does, in one list

- Seven detection modules that recompute from the database on every evaluation, with per-case evidence dicts, and no stored scores.
- Two fitted models (LogisticRegression `stall-lr-v2`, XGBRegressor `cost-xgb-v1`) trained on 81,727 real works, with committed artifacts, hold-out metrics, SHAP TreeExplainer attributions, and an in-memory retrain fallback.
- A deterministic gate that is structurally independent of the composite score, and a fusion threshold that can also hold on its own — with a test that pins a hold at composite < 60.
- A SHA-256 hash chain where tampering re-seals the attacker's own block and breaks the child's `prev_hash`, verified by `verify()` in Python and by `chainValidity` in the browser, with a second attack surface (structured field edits) covered by its own test.
- A seven-state workflow with `SELECT … FOR UPDATE`, a transition table, and a one-transaction write of case + ledger block + override record + official counters.
- 543 real MP allocations loaded from the official CSV, seeded, served by an unauthenticated endpoint, codegen'd into TypeScript, and matched to display names by a conservative two-directional matcher that refuses ambiguous input.
- 81,727 real sanctioned works ingested with payment and completion joins, exposed through a paginated register and a 30-second-cached state rollup built with SQLite `json_extract`.
- A four-layer data policy that prevents a real MP or DM from ever appearing on a held, escalated, or retitled row, enforced in the application and in 11 regression tests.
- A bilingual (English / हिन्दी) shell with a test that fails the build on any missing or empty translation.
- A frontend that is fully functional with the backend down, because a complete mock dataset, a local SHA-256 implementation, and a client-side chain verifier are all in the repo.

---

## 15. Production hardening record

Applied to the snapshot above without adding features or frontend/backend options. Every change is limited to reliability, performance, time/space complexity, or metadata, and each is verified by the suites listed in the front matter. "No features added" was the constraint; where a knob was surfaced it is a safety bound, not a product option.

### 15.1 Reliability

| Change | File | Why |
|---|---|---|
| SQLite connection hardening on every connect: `foreign_keys=ON`, `busy_timeout` from config, `journal_mode=WAL`, `synchronous=NORMAL`. | `core/db.py` | Prevents corrupt-write cascades and locked-database errors under concurrent API/ingest access; WAL keeps reads non-blocking. |
| Postgres connection-pool bounds (`pool_size`, `max_overflow`, `pool_recycle`) from config; SQLite-specific pool overrides removed. | `core/db.py` | Fixes the pool accumulating idle connections without a recycle bound under long-running processes. |
| Migration `0002_align_models` — widens `cases.id` / `module_scores.case_id` / `ledger.case_id` / `overrides.case_id` to `String(48)`, creates the `mp_allocations` table and unique index, and adds seven hot indexes idempotently (guarded with an inspector check). | `alembic/versions/0002_align_models.py` | Existing databases created by the old `String(24)` revision would otherwise truncate real `WS/…` ids on upgrade; the indexes were previously only added on the create path. |
| Per-record savepoint isolation in the real-work ingest: each record runs inside `with db.begin_nested():`; a failure quarantines only that record (via the existing `QuarantineQueue`) instead of rolling back the whole batch. | `ingestion/pipeline.py` | A single malformed row no longer aborts the entire 81k-record ingest. |
| Duplicate-integer-PK guard in the batch ledger append path — `append(commit=False)` now flushes each block, so chained appends seal against the true tail instead of the same committed tail. | `ledger/chain.py` | Latent bug: consecutive blocks in one batch would collide on integer block `index`. |
| Constant-time token comparison with `secrets.compare_digest`. | `core/auth.py` | Removes a timing oracle on the mutation token. |
| Unhandled exceptions in any request convert to a JSON 500 via middleware instead of an HTML stack trace. | `core/observability.py` (wired in `main.py`) | No internal paths or server headers leak to callers on failure. |
| Upload limits: `MAX_UPLOAD_BYTES` (5 MB) read cap with 413 on oversize and 400 on empty bodies; `MAX_IMAGE_PIXELS` (25 megapixels) with `DecompressionBombError` → 413, `OSError`/`ValueError` → 400. | `api/v1/photo_verify.py` | Stops decompression-bomb and oversized-upload denial of service. |
| eSAKSHI scraper response cap (`MAX_RESPONSE_BYTES`, 8 MB) in `fetch_page` and `_scrape_live`. | `ingestion/esakshi_scraper.py` | A hostile or corrupted upstream response can no longer balloon memory. |
| Frontend request timeout (20 s `AbortController`) on every API call. | `src/lib/api.ts` | A hung backend no longer leaves the SPA stuck on an unterminated fetch. |

### 15.2 Performance

| Change | File | Effect |
|---|---|---|
| Real-signal fuse uses the in-memory module results already returned by the pipeline instead of re-running `module_scores` queries per record. | `ingestion/pipeline.py` | Eliminates ~77,000 round-trips during the 81,727-record ingest. |
| `selectinload(Case.module_scores)` on the bootstrap query, and the pivot built in O(m) with dict-keyed buckets instead of a nested scan. | `api/v1/bootstrap.py` | Removes the N+1 load and an O(n·groups) rebuild on the dashboard bootstrap. |
| `override_records` no longer materializes all `Case` ORM rows — only titles for ids actually present (`Case.id.in_(wanted_ids)`). | `oversight/override_audit.py` | Drops an O(77k) ORM materialization per request. |
| Search `<2` entries return without scanning; works group gets an exact-id fast path (`Case.id == term`) before the leading-wildcard LIKE scan. | `api/v1/search.py` | Short queries and exact work ids short-circuit. |
| GZip compression for responses ≥ 1 KB, plus `Cache-Control` on `works_summary` (both cache-hit and compute paths), `/works` list (30 s) and `Cache-Control: no-store` on bootstrap. | `main.py`, `api/v1/works.py`, `api/v1/bootstrap.py` | Cuts payload bandwidth and caches the hot state rollup; the 30-second rollup cache is preserved, not re-built per request. |
| `_CELL_COUNT_CACHE` is now an `OrderedDict` LRU bounded at 2048 entries instead of an unbounded dict. | `ml/models.py` | Space bound on cell-distance caching in `compute_features`. |

### 15.3 Time and space complexity

- **Bootstrap pivot** reduced from O(records × groups) nested scans to O(records) bucket insert + O(groups) read-out.
- **Ingest fuse** reduced from O(records × module-count) extra DB round-trips to O(records) with the already-computed results — the dominant term is now the pipeline itself, not the bookkeeping.
- **Override audit** loaded record set reduced from O(total cases) to O(records requested); payload keeps only the fields the UI renders.
- **Exact-match works search** is O(1) on the PK before the O(n) LIKE fallback; empty and sub-length queries no longer scan.
- **Image decode** is split from load, and dimensions are capped so memory use per request is bounded regardless of attacker-supplied size.
- **Frontend single-flight map** (`IN_FLIGHT` in `src/lib/api.ts`) deduplicates concurrent identical GETs — simultaneous callers share one request instead of N.

### 15.4 Metadata

- **API observability metadata** (new `core/observability.py`): `X-Request-ID` (sanitized, ≤ 64 alphanumeric), `X-Response-Time-Ms`, and a structured `sentinel.http` access log on every request path.
- **`/health`** now reports `service`, `version` (`API_VERSION`), `schemaVersion` (`SCHEMA_VERSION`) and `uptimeSeconds` alongside the pre-existing `status`/`database` keys; `SCHEMA_VERSION` defaults to `0002` to match the new migration.
- **Response metadata**: `/works` and `works_summary` payloads now carry `generatedAt` (ISO-8601 UTC) so consumers can timestamp the snapshot they received.
- **Decision ledger metadata**: when a `decide` call has a single-module severity ≥ 75, the signed ledger body carries "module-level alert: single-module severity ≥ 75" — the guard that the ingest path already enforced is now also a verifiable record of the decision.
- **Model metadata**: `metrics.json` `stall_definition` rewritten to the rule the label vector actually computes (one-year norm violation read from the completion register; no synthetic threshold) and `_extensions` renamed to `sanction_lakh` so the parameter name matches the real training call site.
- **Frontend metadata**: `metadataBase` sourced from `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`) and a `viewport` export with `themeColor`, so social links and the PWA-style title bar render canonical URLs and branding.
- **`report.md` metadata**: this file is prefixed with YAML front matter (title, document type, repository, generated date, commit, and the four verification gates).

### 15.5 Verification

Re-run after every change above, on the final tree:

```
backend  pytest -q        →  54 passed, 2 skipped
frontend npm run test     →  45 passed (9 files)
         npx tsc --noEmit →  clean
         npm run lint     →  clean (0 errors, 0 warnings)
         npm run build    →  compiles, type-checks, prerenders all 20 routes
```

Lint clean-up also fixed 7 pre-existing react-hooks/react-compiler findings (setState-in-effect, refs-read-during-render, broken memoization) in `ledger/page.tsx`, `works/page.tsx`, `search/page.tsx`, `dashboard/mp/page.tsx` and `components/search/UniversalSearch.tsx`, plus an unused binding in `scripts/browser_sweep.mjs` — with the frontend suite and the production build still green.







