# DEMO_SCRIPT.md — MPLADS Sentinel, judge walkthrough

**Total run time: ≈ 4 minutes 45 seconds** (rehearse once, present in under 5).

**Setup before presenting (do not count against the clock):**

- Backend running (`docker compose up`, or `uvicorn app.main:app` from `backend/`) and frontend on `localhost:3000`.
- App in **Demo Mode** (mock cards) with the live backend reachable — the default state.
- Browser zoom 110–125%, start on the landing page.

Every step below names the exact click, what appears on screen, and which PS-26102 keyword it demonstrates. The full path was rehearsed end to end against the real API stack (`backend/scripts/rehearse_demo_path.py`); timings assume one rehearsal.

---

## 0 · Landing — the two differentiators (≈ 0:20)

- **Where:** Landing page (`/`).
- **Say:** "Anomaly → gate → ledger, end to end. Two things no black-box scorer does: a Critical-Risk Gate refuses to let a good average hide a hard violation, and every flag carries evidence — SHAP attributions, rule citations — not an unexplained number."
- **On screen:** hero, six desks, official MoSPI stat strip (543 MPs, ₹8,341.87 Cr — the real dataset anchor).
- **PS keyword:** transparency & accountability (framing for everything after).

## 1 · Methodology — proof, not claims (≈ 0:30)

- **Where:** Methodology & ML page (`/about-methodology`) — leads with the two differentiator cards and the "one fully real, verified dataset" banner.
- **Say:** "Every number here is stated with its source. The MP allocation table is the official published one, cross-checked against its grand total by tests. Model metrics load live from the trained artifacts."
- **On screen:** "model metrics: LIVE from trained artifacts" badge; the synthetic-data rows disclosed in the source table.
- **PS keyword:** transparency & accountability.

## 2 · Ingest Sync — honest provenance (≈ 0:40)

- **Where:** Ministry or State dashboard → **⇅ Sync Live eSAKSHI Feed** (top right).
- **Click it.** While it spins, say: "It is hitting the real eSAKSHI portal right now."
- **On screen:** status line like `5 ingested · 3 held · 0 quarantined · fallback batch (portal unreachable)` — verified live output. Say: "The portal isn't reachable from this network, and the system says so instead of pretending — that provenance banner is a feature. Each ingested record runs the full pipeline: detection, gate, ledger."
- **If the portal IS reachable:** the banner flips to `live portal` — present that as the live fetch succeeding.
- **PS keyword:** automated compliance monitoring; data integration.

## 3 · The gate fires on a low-score case (≈ 0:40)

- **Where:** District Authority desk (`/dashboard/district`) → open case **MPL-2025-1021**.
- **Say:** "Composite 30/100 — a threshold system would release this. But the land is a private gated plot, so the Critical-Risk Gate holds it anyway."
- **On screen:** status **HOLD_ACTIVE** with the gate banner; compliance module citing **OP 2025–26 §4.1.3** with the failing clause; officials of record shown as demo placeholders (fictional by enforced policy).
- **PS keyword:** risk-based alerts; deviations from established norms.

## 4 · DM override → SHA-256 ledger block (≈ 0:40)

- **Where:** same case → **Approve & Release** with note "Land title conveyed to municipality; gate cleared on record."
- **Then:** Audit & Ledger page (`/ledger`).
- **On screen:** case flips to **released** with `override_approved` in its path; the ledger shows a new top block **GATE OVERRIDE** (verified: block #10 in rehearsal) — actor `dm_dm_verma_demo`, previous hash linking to the block above it. Say: "The decision itself is now tamper-evident."
- **PS keyword:** transparency & accountability.

## 5 · Override-Audit flags the official (≈ 0:30)

- **Where:** Override-Audit register (`/override-audit`).
- **On screen:** DM Verma (Demo) now shows **gate overrides ≥ 1** and is flagged in red — the register compares override rates across officials and flags outliers automatically. Say: "The system audits the auditors."
- **PS keyword:** accountability.

## 6 · Tamper a block — corruption detected (≈ 0:45)

- **Where:** Ledger page → **💣 Simulate Database Tampering** → **✓ Verify chain integrity**.
- **On screen:** red banner `CRITICAL: SHA-256 Ledger Chain Corruption Detected at Block #2. System Frozen for Audit.` — every downstream block shows ✗ (rehearsal: 9 blocks failed linkage). Say: "One edited row breaks the whole chain — disbursements freeze until it's resolved."
- **PS keyword:** transparency & accountability (the strongest moment of the demo).

## 7 · Restore — verification passes clean (≈ 0:20)

- **Where:** Ledger page → **🔒 Restore Integrity / Re-seal** → **✓ Verify chain integrity**.
- **On screen:** original records restored, chain re-sealed, toast `✓ Verification complete — all blocks linked cleanly.` — green checks cascade down the table.
- **PS keyword:** resilience of the audit trail.

## 8 · Close on the citizen view (≈ 0:20)

- **Where:** Public Citizen View (`/public`) — the same ledger chain, read-only, with search.
- **Say:** "Citizens see the same chain the ministry sees. That's the accountability story of this system, end to end."
- **PS keyword:** transparency; decision-support for every stakeholder.

---

### Timing summary

| Step | Time | Cumulative |
|---|---|---|
| 0 Landing | 0:20 | 0:20 |
| 1 Methodology | 0:30 | 0:50 |
| 2 Ingest sync | 0:40 | 1:30 |
| 3 Gate hold | 0:40 | 2:10 |
| 4 Override + ledger block | 0:40 | 2:50 |
| 5 Override-audit flag | 0:30 | 3:20 |
| 6 Tamper detected | 0:45 | 4:05 |
| 7 Restore clean | 0:20 | 4:25 |
| 8 Citizen view | 0:20 | 4:45 |

### If something breaks live

- **Backend unreachable:** the Mode Banner honestly shows **Demo Mode (Mock Data)** — present the mock dataset, then hit **⟳ Connect live backend** to recover; never claim live when it isn't.
- **Sync stalls on the live portal retries:** the button reports the fallback-batch provenance after ~30 s; narrate the honesty, don't wait it out twice.
- **A 401 on a decision:** the demo token is pre-attached by the frontend; if you cleared storage, reload the page — the token re-attaches automatically.
