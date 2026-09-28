"""One-off: list official CSV rows whose MP name has no portal MP tile."""

import csv
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
COL = "Hon'ble Members of Parliaments"


def read_csv(p):
    return list(csv.DictReader(open(p, newline="", encoding="utf-8-sig")))


def norm(s):
    return re.sub(r"[^a-z]", "", (s or "").lower())


def rupees(raw):
    return float(re.sub(r"[^\d.]", "", raw or "") or 0)


official = [r for r in read_csv(BACKEND / "app/data/mp_allocations_2025.csv") if r["Sr. No."].strip().lower() != "grand total"]
for r in official:
    r["_amt"] = rupees(r["Allocated AMOUNT ( \u20b9 )"])
mp_names = {m["MP_NAME"] for m in read_csv(BACKEND / "app/data/live/live_mps.csv")}
csv_by_name = {norm(r[COL]): r for r in official}
matched = {norm(n) for n in mp_names if norm(n) in csv_by_name}
missing = [r for r in official if norm(r[COL]) not in matched]
print(f"CSV rows with no portal MP tile: {len(missing)}")
for r in missing:
    amt = r["_amt"]
    print(f"  #{r['Sr. No.']} {r[COL]} | {r['State']} | {r['Constituency']} | Rs {amt:,.0f}")
