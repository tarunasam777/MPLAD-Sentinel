"""Generate the typed TypeScript snapshot of the official MP allocation table.

Run from the repo root::

    backend/.venv/bin/python backend/scripts/generate_allocations_ts.py

Writes ``src/lib/mp-allocations.generated.ts`` from the same vendored CSV the
backend seeds from (single parse point in ``app.data.mp_loader``), so the
mock-mode frontend and the live API can never disagree about the official
allocation figures.
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.data.mp_loader import load_allocations  # noqa: E402

OUT_PATH = BACKEND_ROOT.parent / "src" / "lib" / "mp-allocations.generated.ts"

HEADER = """\
// AUTO-GENERATED from the official MoSPI allocation CSV — do not edit by hand.
// Regenerate with: backend/.venv/bin/python backend/scripts/generate_allocations_ts.py
// Source: “Allocated Limit for Hon'ble MPs” (all Lok Sabha MPs, FY 2025–26).
// `allocatedCr` is null where the portal row publishes no amount (pending revision).

export interface MpAllocationRow {
  mpName: string;
  state: string;
  constituency: string;
  allocatedCr: number | null;
}

export const MP_ALLOCATIONS: MpAllocationRow[] = [
"""

FOOTER = """];

export const MP_ALLOCATION_TOTAL_CR = {total};
export const MP_ALLOCATION_COUNT = {count};
"""


def main() -> None:
    rows, totals = load_allocations()
    lines = []
    for r in rows:
        amt = "null" if r["allocatedCr"] is None else f'{r["allocatedCr"]:.2f}'
        lines.append(
            '  {{ mpName: {mp}, state: {st}, constituency: {co}, allocatedCr: {amt} }},'.format(
                mp=repr(r["mpName"]),
                st=repr(r["state"]),
                co=repr(r["constituency"]),
                amt=amt,
            )
        )
    content = HEADER + "\n".join(lines) + "\n" + FOOTER.format(
        total=totals["totalCr"], count=totals["mpCount"]
    )
    OUT_PATH.write_text(content, encoding="utf-8")
    print(f"Wrote {OUT_PATH} — {totals['mpCount']} MPs, ₹{totals['totalCr']:.2f} Cr total")


if __name__ == "__main__":
    main()
