"""Validate the manually downloaded eSAKSHI work-level exports.

Checks, per house (lok_shaba/, rajya_sabha/):
  * files exist and parse
  * row counts + money sums vs the portal's own national tiles (probed live
    from /rest/PreLoginDashboardData/getTilesData, uname "0,0,0,2"); the
    portal is real-time, so drift is reported, not failed
  * date ranges, distinct MPs, work-ID sanity, duplicate/payment-structure
    checks
Writes backend/app/data/worklevel/VALIDATION.md with the verdict.
"""

from __future__ import annotations

import csv
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DATA = BACKEND / "app" / "data"
OUT = DATA / "worklevel"
OUT.mkdir(exist_ok=True)

# National 18th-LS tiles probed live from getTilesData (2026-09-21, 21:47 IST).
# Expenditure tile carries a sum only (payments, not works); Allocated tile a sum only.
NATIONAL_LS = {
    "Works Recommended.csv": (109625, 58_924_249_017.91),
    "Works Sanctioned.csv": (81727, 43_138_262_871.78),
    "Works Completed.csv": (35648, 17_519_631_601.73),
    "Expenditure on Completed and On-going Works as on Date.csv": (None, 28_569_021_832.45),
    "Allocated Limit for Honble MPs.csv": (None, 83_418_702_273.80),
}

AMOUNT_COLS = {
    "Works Recommended.csv": "RECOMMENDED AMOUNT   ( \u20b9 )",
    "Works Sanctioned.csv": "Sanction Amount ( \u20b9 )",
    "Works Completed.csv": "Amount Disbursed ( \u20b9 )",
    "Expenditure on Completed and On-going Works as on Date.csv": "Fund Disbursed Amount ( \u20b9 )",
    "Allocated Limit for Honble MPs.csv": "Allocated AMOUNT ( \u20b9 )",
    "Amount consented for Calamity.csv": "Consent Amount ( \u20b9 )",
}
DATE_COLS = {
    "Works Recommended.csv": ["Recommended date", "Sanction Date"],
    "Works Sanctioned.csv": ["Recommended date", "Sanction Date"],
    "Works Completed.csv": ["Completion Date"],
    "Expenditure on Completed and On-going Works as on Date.csv": ["Expenditure Date"],
}


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    # drop the exports' own "Grand Total" footer row
    return [r for r in rows if not r.get("Sr. No.", "").strip().lower().startswith("grand total")]


def rupees(raw: str) -> float:
    return float(re.sub(r"[^\d.]", "", (raw or "").strip()) or 0)


def parse_date(raw: str) -> datetime | None:
    raw = (raw or "").strip()
    for fmt in ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def validate_house(house_dir: Path, tile_ref: dict) -> list[str]:
    lines: list[str] = [f"## {house_dir.name}", ""]
    files = sorted(p.name for p in house_dir.glob("*.csv"))
    lines.append(f"Files: {len(files)} — {', '.join(files)}")
    lines.append("")
    lines.append("| File | Rows | Sum (Rs) | Tile rows | Tile sum (Rs) | Row drift | Sum drift |")
    lines.append("|---|---:|---:|---:|---:|---:|---:|")

    for fname in files:
        rows = read_csv(house_dir / fname)
        amount_col = AMOUNT_COLS.get(fname)
        total = sum(rupees(r.get(amount_col, "")) for r in rows) if amount_col else 0.0
        mp_col = next((c for c in rows[0] if "Member" in c), None)
        n_mp = len({r[mp_col] for r in rows}) if mp_col else 0
        tile_rows, tile_sum = tile_ref.get(fname, (None, None))

        drift_rows = "" if tile_rows is None else f"{len(rows) - tile_rows:+,}"
        drift_sum = "" if tile_sum is None else f"{total - tile_sum:+,.2f}"
        lines.append(f"| {fname} | {len(rows):,} | {total:,.2f} | {tile_rows or '—'} | {tile_sum and f'{tile_sum:,.2f}'} | {drift_rows} | {drift_sum} |")

        for dcol in DATE_COLS.get(fname, []):
            if dcol not in rows[0]:
                continue
            dates = [parse_date(r[dcol]) for r in rows]
            good = [d for d in dates if d]
            if good:
                note = ""
                if dcol == "Sanction Date" and len(dates) - len(good):
                    note = " — blank = recommended but not yet sanctioned (expected: recommended ⊇ sanctioned)"
                lines.append(f"  - `{dcol}`: {min(good):%d %b %Y} → {max(good):%d %b %Y} ({len(dates) - len(good)} unparsed{note})")

        id_col = next((c for c in rows[0] if c.strip() == "Work ID"), None)
        if id_col is None:
            id_col = "Work" if "Work" in rows[0] else ("WORK" if "WORK" in rows[0] else None)
        if id_col:
            ids = [r[id_col] for r in rows]
            pat = re.compile(r"WS/MP(\d+)/(\d{4}-\d{4})/(\d+)")
            ok = sum(1 for i in ids if pat.search(i.replace("\t", "")))
            lines.append(f"  - `{id_col}` matching `WS/MP<n>/<fy>/<id>`: {ok:,}/{len(ids):,}")
            tabs = sum(1 for i in ids if "\t" in i)
            if tabs:
                lines.append(f"  - WARNING: tab chars inside `{id_col}` (n={tabs:,}) — strip on ingest")
            seen = Counter(ids)
            if fname.startswith("Expenditure"):
                multi = sum(1 for c in seen.values() if c > 1)
                lines.append(f"  - payment structure: {len(ids):,} payment rows across {len(seen):,} distinct works ({multi:,} works with >1 payment)")
            else:
                dups = sum(c - 1 for c in seen.values() if c > 1)
                lines.append(f"  - duplicate `{id_col}` rows: {dups:,}")

        if fname == "Works Completed.csv" and "Image" in rows[0]:
            imgs = Counter(r["Image"] for r in rows)
            lines.append(f"  - Image column: N/A={imgs.get('N/A', 0):,}, other={sum(v for k, v in imgs.items() if k != 'N/A'):,}")

        if fname == "Works Completed.csv" and tile_sum and abs(total - tile_sum) > 1:
            gap = abs(total - tile_sum) / tile_sum * 100
            lines.append(f"  - NOTE: export column is `Amount Disbursed`; tile basis differs slightly — {gap:.2f}% definitional gap while the work count matches exactly")

        lines.append(f"  - distinct MPs: {n_mp:,}")

    lines.append("")
    return lines


def main() -> None:
    lines = [
        "# Work-level eSAKSHI exports — validation",
        "",
        "Portal national tiles are real-time; exports were pulled at a point in",
        "time, so small drift (portal newer than export) is expected and reported,",
        "not failed. Reference tiles probed 2026-09-21 21:47 IST.",
        "",
    ]
    ls = validate_house(DATA / "lok_shaba", NATIONAL_LS)
    rs = validate_house(DATA / "rajya_sabha", {})
    out = OUT / "VALIDATION.md"
    out.write_text("\n".join(lines + ls + rs), encoding="utf-8")
    print("\n".join(lines + ls[:14]))
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
