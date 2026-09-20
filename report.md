# Report — MPLADS Sentinel vs. SIH Problem Statement 26102 (MoSPI)

**PS:** "Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation"
**Org:** MoSPI, Data Informatics & Innovation Division (DIID) · Theme: Smart Automation · Dataset: mplads.mospi.gov.in

---

## 1. How well does this match the problem statement?

**Bottom line: the product/workflow story is a strong match. The "AI" claim is the weakest link, and judges will find it in one question.**

Requirement-by-requirement:

| PS requirement | Coverage | Verdict |
|---|---|---|
| AI/ML-powered anomaly & fraud detection | 7 detection modules exist (duplicate, cost, compliance, payment, predictive, photo, trend) | ⚠️ **Weak** — see below |
| Detect duplicate works | Fuzzy title matching (thefuzz) + geo proximity + map evidence | ✅ Good |
| Detect cost overruns | Robust MAD log-cost z-score with terrain→district→state baseline cascade | ✅ Good |
| Detect delayed / stalled projects | Early-stall module + disbursal trend deviation vs peers | ⚠️ Partial (see ML note) |
| Payment / fund misuse | Ghost completion, lapse windows, PFMS vendor/GSTIN matching, fund-redirection alerts | ✅ Good |
| Risk-based alerts | Weighted composite score + non-waivable Critical-Risk Gate + single-module alert | ✅ Good |
| Predictive insights | `stall_pct` is a **hardcoded number in seed data** passed through `10 + 0.95*stall` | ❌ Weak — not a prediction, a pass-through |
| Dashboards for MP, State, District, Ministry | All four, **plus** Implementing Agency and Citizen public view (exceeds PS) | ✅ Excellent |
| Automated compliance monitoring | Compliance module + gate enforcement | ✅ Good |
| Trend analysis | Trend module + district/national analytics + charts | ✅ Good |
| Transparency & accountability | SHA-256 hash-chained ledger, tamper-detection demo, override audit per official | ✅ Excellent — beyond PS scope |
| Uses the provided dataset | eSAKSHI scraper written + tested, but **never called by any API route or pipeline** | ❌ Dead code |

**Match score (my honest estimate): ~70% of the PS surface is covered by working features. The core "AI-powered" differentiator is maybe 20% real.**

### The one thing you must fix before anything else

There is **zero machine learning in this codebase**. I searched: no sklearn, no statsmodels, no trained model, nothing. Every module is a deterministic rule with hardcoded weights and thresholds in `config.py`. The fusion is a fixed weighted sum. The "predictive" module reads a number someone typed into seed data.

This is not fatal — rule engines with explainable scoring are legitimately defensible for fraud monitoring (and explainability is genuinely good here). But the PS says "leverage Machine Learning (ML), Artificial Intelligence (AI)" twice. If a judge asks *"show me the model"*, the current honest answer is "there isn't one." That is the single biggest scoring risk in this project.

---

## 2. Positives

1. **Complete end-to-end story, not a mockup.** Detection → fusion → gate → workflow state machine → hash-chained ledger → override audit. Every human decision lands in the chain. This closed loop is exactly the "accountability" the PS asks for, and few teams will have it.
2. **The gate vs. score separation is a genuinely good design.** Soft composite score + hard non-waivable rules is how real compliance systems work, and it's well-communicated in the UI ("independent of score").
3. **Explainability is first-class.** Per-module sub-scores, attribution percentages, evidence objects, plain-language MP status, baseline-source fallback notes in cost variance. Judges like "why did it flag this."
4. **Six role-based dashboards** covering every stakeholder in the PS plus vendor and citizen views. MP view deliberately strips jargon — nice product thinking.
5. **Dual-mode data layer.** Mock dataset renders instantly; live backend hydration replaces it when up; graceful fallback. Demo never breaks on stage.
6. **Photo integrity module** (pHash + EXIF corroboration) — beyond PS scope and a strong fraud-detection angle for a scheme plagued by fake stage photos.
7. **Real backend engineering:** Alembic migrations, `with_for_update()` row locking for concurrent decisions, quarantine queue for corrupt payloads, 4 pytest files, Postgres/PostGIS via docker-compose with SQLite fallback.
8. **The tamper demo** (mutate a ledger block, show verification fail, restore) is a great live-demos moment.

---

## 3. Weaknesses (honest list)

### Critical for the PS
1. **No ML anywhere.** The word "AI" currently means: fuzzy string matching, pHash, and hardcoded threshold rules. Predictive module is a pass-through of seed data. Fusion weights are hand-picked constants.
2. **Dataset is not connected.** The PS links the MoSPI dashboard. You wrote an eSAKSHI scraper (`esakshi_scraper.py`, 239 lines, has tests) — and it is **never imported by any API route or pipeline**. Dead code. All 20+ cases are synthetic.
3. **Scale is one state, ~20 cases.** PS says "thousands of works across the country." Nothing demonstrates national scale except a national heatmap fed by mock analytics.

### Actual bugs found while reading
4. **`status_since = "now"`** — `state_machine.py` writes the literal string `"now"` into the DB instead of a timestamp.
5. **Every decision is attributed to one fictional DM.** The DM actor id and DM name key are hardcoded regardless of which district's case is decided — so the override-audit per-official tracking is meaningless for live decisions.
6. **Fictional geography leaks.** Backend actors reference a fictional district name; the frontend fallback uses a fictional state name while all data says **Telangana**. Leftovers from an earlier iteration. A judge who notices will ask what else is fake.
7. **CORS misconfig:** `allow_origins=[..., "*"]` together with `allow_credentials=True` — sloppy; the wildcard defeats the explicit list.
8. **`datetime.utcnow()`** — deprecated in modern Python; use `datetime.now(timezone.utc)`.
9. **Frontend `bumpOfficial` matches officials by `name === dmName || district === district`** — the OR can bump the wrong official's row.

### Gaps
10. **No authentication.** Fine for a hackathon demo, but "anyone can override a gate hold" needs a disclaimer or a token.
11. **No frontend tests, no CI.** Backend has 4 test files (decent), frontend has none.
12. **Duplicate module doesn't compute similarity itself** — it reads `text_similarity_pct` pre-baked in case facts. The "detection" happens at seed time, not run time. Same pattern for several modules: the pipeline re-scores, but many inputs are pre-cooked facts rather than measurements.
13. **Payment module mixes concerns** — ghost/lapse heuristics + PFMS matching in one score with additive boosts (+45, +25). Works, but hard to defend in a methodology Q&A.

---

## 4. How much is completed

| Area | Done | Notes |
|---|---|---|
| Product/UI (6 dashboards, ledger, audit, docs) | **~85%** | Polished, accessible, complete flows |
| Workflow + ledger + override audit backend | **~85%** | Real engineering; bugs #4–5 above |
| Detection modules (rules) | **~75%** | Work, explainable, but inputs pre-cooked |
| **Actual ML / AI** | **~15%** | Nothing trained or learned; stats are textbook z-scores |
| Real data ingestion (dataset link) | **~20%** | Scraper exists, unwired; no live dataset flow |
| Scale-out / national demo | **~30%** | Single state, tiny synthetic dataset |
| Tests / CI / auth | **~35%** | Backend tests exist; no FE tests, no CI, no auth |

**Overall: ~65–70% of a credible SIH demo. ~50% of the full problem statement as written.**

## 5. How much progression is needed

To be defensible on stage, the remaining ~30% is concentrated in exactly three things:
1. One honest ML component (a day of work, changes the story completely).
2. Wire the scraper to the provided dataset (the plumbing exists).
3. Fix the identity/consistency bugs so nothing on screen contradicts the Telangana story.

Everything else (auth, CI, scale) is polish.

---

## 6. What to do next — in order

**Step 1 — Add one real ML model (highest ROI, ~1 day).**
Train a simple, defensible model on data you can generate/justify:
- **Isolation Forest** over numeric features (amount, z-score, release-vs-completion gap, months since sanction, stall indicators) → real anomaly score feeding the composite. Or
- **Logistic regression / gradient boosting** for stall prediction trained on engineered features (prolonged status, repeated extensions, low disbursal — the factors you already list).
Keep the rule-based gate as-is (it's good); the ML replaces the hardcoded `stall_pct` pass-through. Document train/test split + metric (even on synthetic data) on the methodology page. Now "AI-powered" is true.

**Step 2 — Wire the eSAKSHI scraper (half day).**
Add an API route (`POST /api/v1/ingest/sync`) that calls `EsakshiScraperClient`, feeds raw records through the existing `ingest_and_evaluate_batch` (quarantine queue already handles bad payloads), and a button on the State dashboard that triggers it. Now the PS dataset link is actually used, live, in the demo.

**Step 3 — Fix the identity bugs (~2 hours).**
- Replace the fictional-district / fictional-state leftovers and the hardcoded DM actor with the actual case's district + DM name; attribute overrides to `case.dm_name`.
- Fix `status_since = "now"` → real timestamp.
- `datetime.now(timezone.utc)` everywhere.
- Remove `"*"` from CORS origins.
- Fix the `||` in `bumpOfficial` to match by name only.

**Step 4 — Scale story (half day).**
Generate ~500–1,000 synthetic works across 5–10 states (seed script already parameterized by district) so the national heatmap and "thousands of works" claim have substance. Mention dataset size on the landing page.

**Step 5 — Demo hardening (half day).**
- One-command startup: `docker compose up` + a README section mapped to PS keywords.
- Optional: a lightweight read-only auth token on decision endpoints, or an explicit "auth disabled for demo" banner.
- Script the 3-minute walkthrough: landing → DM queue → gate hold → override → ledger tamper demo → override audit → ML explainer.

**Step 6 — CI + frontend tests (optional but cheap).**
GitHub Actions running `pytest` + `tsc --noEmit` + `eslint`. Looks professional in the repo judges may open.

---

## Verdict

You have an unusually complete, well-engineered demo with an excellent accountability story that most teams won't match. But as written against this PS, it is currently a **rules engine wearing an AI costume**. One real model, one live data connection, and two hours of bug fixing separate this from a top-tier submission. Do Steps 1–3 first.
