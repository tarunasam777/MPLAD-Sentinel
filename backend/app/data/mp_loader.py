"""Loader for the official MoSPI “Allocated Limit for Hon'ble MPs” table.

The vendored CSV (``mp_allocations_2025.csv``) is the published allocation
table for all Lok Sabha MPs — state, constituency and the sanctioned
allocation limit in ₹. This module is the single parse point: the seeder,
the API and the TS snapshot generator (``scripts/generate_allocations_ts.py``)
all consume it, so amounts can never disagree between layers.

Amounts are normalised to ₹ crore (the demo's canonical unit). Rows with no
published amount (blank cell) keep ``allocatedCr = None`` — shown as
“pending revision” in the UI rather than silently coerced to zero.
"""

from __future__ import annotations

import csv
import re
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "mp_allocations_2025.csv"

_CRORE = 10_000_000.0
_GRAND_TOTAL_CR = 83_41_87_02_273.8 / _CRORE  # “Grand Total” row as published


def _norm(value: str | None) -> str:
    return " ".join((value or "").split()).strip()


def _parse_amount_cr(raw: str | None) -> float | None:
    """₹ string like “147000000”, “154773472.11” or “83,41,87,02,273.8” → crore."""
    text = _norm(raw).replace(",", "").replace("₹", "")
    if not text:
        return None
    try:
        return round(float(text) / _CRORE, 2)
    except ValueError:
        return None


@lru_cache(maxsize=1)
def load_allocations() -> tuple[list[dict], dict]:
    """Parse the vendored CSV → (rows, totals).

    Each row: ``{mpName, state, constituency, allocatedCr (₹ Cr | None)}``.
    Totals: ``{mpCount, totalCr, grandTotalCr}`` where ``totalCr`` is the sum
    over rows that publish an amount (the CSV's own “Grand Total” row is
    skipped as data but kept in ``grandTotalCr`` for cross-checking).
    """
    rows: list[dict] = []
    skipped = 0
    with DATA_PATH.open("r", encoding="utf-8-sig", newline="") as fh:
        for record in csv.DictReader(fh):
            mp_name = _norm(record.get("Hon'ble Members of Parliaments"))
            if not mp_name or mp_name.lower() == "grand total":
                skipped += 1
                continue
            rows.append(
                {
                    "mpName": mp_name,
                    "state": _norm(record.get("State")),
                    "constituency": _norm(record.get("Constituency")),
                    "allocatedCr": _parse_amount_cr(record.get("Allocated AMOUNT ( ₹ )")),
                }
            )

    total = round(sum(r["allocatedCr"] or 0.0 for r in rows), 2)
    totals = {"mpCount": len(rows), "totalCr": total, "grandTotalCr": round(_GRAND_TOTAL_CR, 2), "rowsSkipped": skipped}
    return rows, totals


def allocation_summary() -> dict:
    rows, totals = load_allocations()
    return {
        "source": "Official MoSPI allocation table — “Allocated Limit for Hon'ble MPs” (vendored at backend/app/data/mp_allocations_2025.csv)",
        "mpCount": totals["mpCount"],
        "totalCr": totals["totalCr"],
        "mps": rows,
    }


if __name__ == "__main__":
    _rows, _totals = load_allocations()
    print(f"{_totals['mpCount']} MPs · ₹{_totals['totalCr']:.2f} Cr (CSV grand total ₹{_totals['grandTotalCr']:.2f} Cr)")


def _name_tokens(name: str | None) -> list[str]:
    """Alphanumeric lowercase tokens — the same normalization the frontend
    matcher applies (src/lib/mp-allocations.ts::normalizeMpName)."""
    return [t for t in re.split(r"[^a-z0-9]+", (name or "").lower()) if t]


def find_official_match(display_name: str | None) -> dict | None:
    """Return the official allocation row a display name refers to, using the
    same deliberately conservative matching as the frontend (token-subset in
    both directions, relative to the smaller set; containment with a minimum
    length; bare surnames must match exactly or not at all). Returns None when
    no published MP matches — which is exactly how the demo asserts its data
    policy: no flagged/held case may resolve to a real, named MP."""
    needle = _name_tokens(display_name)
    if not needle:
        return None
    best: dict | None = None
    best_score = 0.0
    for row in load_allocations()[0]:
        candidate = _name_tokens(row["mpName"])
        if not candidate:
            continue
        if candidate == needle:
            score = 1.0
        elif len(needle) >= 2:
            inter = len(set(needle) & set(candidate))
            score = inter / min(len(needle), len(candidate))
            joined_n, joined_c = " ".join(needle), " ".join(candidate)
            if (
                (joined_c in joined_n or joined_n in joined_c)
                and min(len(joined_n), len(joined_c)) >= 8
            ):
                score = max(score, 0.9)
        else:
            score = 0.0
        if score > best_score:
            best_score, best = score, row
    return best if best_score >= 0.66 else None
