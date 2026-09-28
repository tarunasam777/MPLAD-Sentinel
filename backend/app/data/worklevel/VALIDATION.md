# Work-level eSAKSHI exports — validation

Portal national tiles are real-time; exports were pulled at a point in
time, so small drift (portal newer than export) is expected and reported,
not failed. Reference tiles probed 2026-09-21 21:47 IST.

## lok_shaba

Files: 6 — Allocated Limit for Honble MPs.csv, Amount consented for Calamity.csv, Expenditure on Completed and On-going Works as on Date.csv, Works Completed.csv, Works Recommended.csv, Works Sanctioned.csv

| File | Rows | Sum (Rs) | Tile rows | Tile sum (Rs) | Row drift | Sum drift |
|---|---:|---:|---:|---:|---:|---:|
| Allocated Limit for Honble MPs.csv | 543 | 83,418,702,273.80 | — | 83,418,702,273.80 |  | +0.00 |
  - distinct MPs: 543
| Amount consented for Calamity.csv | 12 | 40,567,400.00 | — | None |  |  |
  - distinct MPs: 10
| Expenditure on Completed and On-going Works as on Date.csv | 86,468 | 28,569,021,832.45 | — | 28,569,021,832.45 |  | +0.00 |
  - `Expenditure Date`: 25 Jul 2024 → 21 Sep 2026 (0 unparsed)
  - `Work ID` matching `WS/MP<n>/<fy>/<id>`: 85,241/86,468
  - WARNING: tab chars inside `Work ID` (n=1,227) — strip on ingest
  - payment structure: 86,468 payment rows across 57,943 distinct works (15,060 works with >1 payment)
  - distinct MPs: 532
| Works Completed.csv | 35,648 | 17,347,838,096.40 | 35648 | 17,519,631,601.73 | +0 | -171,793,505.33 |
  - `Completion Date`: 12 Aug 2024 → 21 Sep 2026 (0 unparsed)
  - `Work` matching `WS/MP<n>/<fy>/<id>`: 34,978/35,648
  - WARNING: tab chars inside `Work` (n=670) — strip on ingest
  - duplicate `Work` rows: 0
  - Image column: N/A=9,302, other=26,346
  - NOTE: export column is `Amount Disbursed`; tile basis differs slightly — 0.98% definitional gap while the work count matches exactly
  - distinct MPs: 505
| Works Recommended.csv | 109,625 | 58,924,249,017.91 | 109625 | 58,924,249,017.91 | +0 | +0.00 |
  - `Recommended date`: 08 Jul 2024 → 21 Sep 2026 (0 unparsed)
  - `Sanction Date`: 09 Jul 2024 → 21 Sep 2026 (28279 unparsed — blank = recommended but not yet sanctioned (expected: recommended ⊇ sanctioned))
  - `WORK` matching `WS/MP<n>/<fy>/<id>`: 79,822/109,625
  - WARNING: tab chars inside `WORK` (n=1,524) — strip on ingest
  - duplicate `WORK` rows: 28,174
  - distinct MPs: 538
| Works Sanctioned.csv | 81,727 | 43,138,262,871.78 | 81727 | 43,138,262,871.78 | +0 | +0.00 |
  - `Recommended date`: 08 Jul 2024 → 15 Sep 2026 (0 unparsed)
  - `Sanction Date`: 09 Jul 2024 → 21 Sep 2026 (0 unparsed)
  - `Work` matching `WS/MP<n>/<fy>/<id>`: 80,200/81,727
  - WARNING: tab chars inside `Work` (n=1,527) — strip on ingest
  - duplicate `Work` rows: 0
  - distinct MPs: 536

## rajya_sabha

Files: 6 — Allocated Limit for Honble MPs.csv, Amount consented for Calamity.csv, Expenditure on Completed and On-going Works as on Date.csv, Works Completed.csv, Works Recommended.csv, Works Sanctioned.csv

| File | Rows | Sum (Rs) | Tile rows | Tile sum (Rs) | Row drift | Sum drift |
|---|---:|---:|---:|---:|---:|---:|
| Allocated Limit for Honble MPs.csv | 232 | 33,589,482,301.82 | — | None |  |  |
  - distinct MPs: 232
| Amount consented for Calamity.csv | 20 | 104,500,000.00 | — | None |  |  |
  - distinct MPs: 16
| Expenditure on Completed and On-going Works as on Date.csv | 25,620 | 12,691,639,490.69 | — | None |  |  |
  - `Expenditure Date`: 27 Jul 2023 → 21 Sep 2026 (0 unparsed)
  - `Work ID` matching `WS/MP<n>/<fy>/<id>`: 25,620/25,620
  - payment structure: 25,620 payment rows across 15,616 distinct works (5,032 works with >1 payment)
  - distinct MPs: 170
| Works Completed.csv | 10,157 | 7,864,008,797.21 | — | None |  |  |
  - `Completion Date`: 02 Aug 2023 → 21 Sep 2026 (0 unparsed)
  - `Work` matching `WS/MP<n>/<fy>/<id>`: 10,157/10,157
  - duplicate `Work` rows: 0
  - Image column: N/A=3,458, other=6,699
  - distinct MPs: 155
| Works Recommended.csv | 25,698 | 22,639,941,836.33 | — | None |  |  |
  - `Recommended date`: 14 Jun 2023 → 21 Sep 2026 (0 unparsed)
  - `Sanction Date`: 07 Jul 2023 → 21 Sep 2026 (5854 unparsed — blank = recommended but not yet sanctioned (expected: recommended ⊇ sanctioned))
  - `WORK` matching `WS/MP<n>/<fy>/<id>`: 19,844/25,698
  - duplicate `WORK` rows: 5,763
  - distinct MPs: 201
| Works Sanctioned.csv | 20,079 | 17,514,811,925.99 | — | None |  |  |
  - `Recommended date`: 14 Jun 2023 → 16 Sep 2026 (0 unparsed)
  - `Sanction Date`: 07 Jul 2023 → 21 Sep 2026 (0 unparsed)
  - `Work` matching `WS/MP<n>/<fy>/<id>`: 20,079/20,079
  - duplicate `Work` rows: 0
  - distinct MPs: 179
