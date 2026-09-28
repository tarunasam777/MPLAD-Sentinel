# Work-level eSAKSHI exports — provenance & ingest notes

**Source:** https://mplads.mospi.gov.in/digigov/dashboard.html — the public
eSAKSHI citizen dashboard's per-tile CSV downloads, pulled manually on
2026-09-21 (tiles probed live the same day).

**Validation:** `backend/scripts/validate_worklevel_exports.py` →
`VALIDATION.md` in this directory.

## What this is

The **first real work-level MPLADS dataset** in this repo — the layer the
problem statement's ML modules (cost-overrun, stall-risk, duplicate-detection)
were designed for but previously trained on synthetic rows. Both houses:

| | lok_shaba/ (18th LS) | rajya_sabha/ |
|---|---:|---:|
| Allocated Limit | 543 MPs — ₹8,341.87 Cr **exact vs live tile** | 232 MPs — ₹3,358.95 Cr |
| Works Recommended | 109,625 — ₹5,892.43 Cr **exact** | 25,698 — ₹2,264.00 Cr |
| Works Sanctioned | 81,727 — ₹4,313.83 Cr **exact** | 20,079 — ₹1,751.48 Cr |
| Works Completed | 35,648 — count exact; sum 0.98% definitional gap | 10,157 |
| Expenditure (payments) | 86,468 payments / 57,943 works — ₹2,856.90 Cr **exact** | 25,620 payments (older snapshot) |

## Reconciliation verdict (headline)

Every LS money figure matches the portal's own live national tile
(`getTilesData`, uname `0,0,0,2`) **to the paisa**: recommended, sanctioned,
expenditure, and allocated-limit totals all show `+0.00` drift. Works
Completed matches exactly on row count (35,648) with a 0.98% definitional gap
on the sum (export column is `Amount Disbursed`; the tile's basis differs
slightly — disclosed, not hidden).

## Schema (as exported)

- `Works Recommended.csv` — Work category, WORK (ID embedded: `WS/MP<n>/<fy>/<id>`),
  State, IDA, MP, Constituency, Work description, Recommended date,
  RECOMMENDED AMOUNT, Sanction Date (blank = not yet sanctioned)
- `Works Sanctioned.csv` — same + Sanction Amount, Work Status
- `Works Completed.csv` — Work Category, Work (ID embedded), State, IDA,
  Description, MP, Constituency, **Image**, Completion Date, Amount Disbursed
- `Expenditure…csv` — State, Work (title), **Work ID**, IDA, MP, Constituency,
  Expenditure Date, Vendor Name, Payment Status, Fund Disbursed Amount
  (payment-grain: one work → many payments)

## Ingest notes (read before loading)

1. **Strip tab characters inside work IDs** (~1,500 rows carry `\t` inside
   `WS/MP…`); normalize with `value.replace("\t", "")` before parsing.
2. **Recommended ⊇ Sanctioned ⊇ Completed** is the lifecycle; blank
   `Sanction Date` in Recommended means still pending (28,279 LS rows — data,
   not dirt).
3. **Expenditure is payment-grain**: dedupe on Work ID only for per-work
   views; keep rows for vendor-payment analysis (Payment Status split:
   Success / In-Progress).
4. **Expenditure work IDs ≠ works-table IDs** in the older (truncated)
   snapshot; the complete LS file reconciles, but verify joins per file with
   `validate_worklevel_exports.py` after any re-download.
5. The `rajya_sabha/Expenditure…csv` is an **older snapshot** (25,620 rows,
   ₹12.69 Bn) — the complete house-combined export lives in `lok_shaba/`;
   keep RS-side expenditure conclusions qualitative until re-pulled.
6. MP name spellings differ between tables and from the allocation CSV —
   always join through `app.data.mp_loader.find_official_match`, never raw
   string equality.

## Scope note

`backend/app/ml/` remains untouched; using these rows for retraining is a
separate, explicitly-scoped task (the CSV column contract in
`backend/app/ml/data/SOURCES.md` is the only integration point).
