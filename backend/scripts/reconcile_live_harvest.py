"""Reconcile live eSAKSHI dashboard harvests against the official MoSPI CSV.

Compares:
  1. National allocated-limit tile vs the CSV Grand Total row.
  2. Per-state allocated tiles vs CSV state sums.
  3. Per-MP allocated tiles vs CSV rows, matched by name via
     app.data.mp_loader.find_official_match (the same conservative matcher
     used to enforce the demo data policy).

Writes backend/app/data/live/RECONCILIATION.md with the tables and verdict.
"""

from __future__ import annotations

import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.data.mp_loader import find_official_match  # noqa: E402

LIVE = BACKEND / "app" / "data" / "live"
OFFICIAL = BACKEND / "app" / "data" / "mp_allocations_2025.csv"
TOL = 1.0  # rupees


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def rupees(raw: str) -> float:
    return float(re.sub(r"[^\d.]", "", raw or "") or 0)


def main() -> None:
    official = read_csv(OFFICIAL)
    official = [r for r in official if r["Sr. No."].strip().lower() != "grand total"]
    for r in official:
        r["_amt"] = rupees(r["Allocated AMOUNT ( ₹ )"])
    csv_total = sum(r["_amt"] for r in official)
    print(f"official CSV: {len(official)} MPs, total Rs {csv_total:,.2f}")

    lines: list[str] = [
        "# Live eSAKSHI harvest — reconciliation vs official MoSPI CSV",
        "",
        f"- Official CSV: {len(official)} MPs, grand total Rs {csv_total:,.2f}",
        f"- Harvest dir: `backend/app/data/live/` (fetched {__import__('time').strftime('%Y-%m-%d %H:%M')})",
        "",
    ]

    # 1. national tile
    st_tiles = read_csv(LIVE / "live_tiles_state.csv")
    nat = next(r for r in st_tiles if r["level"] == "national")
    nat_total = float(nat["allocated_limit_rupees"])
    diff = nat_total - csv_total
    lines += [
        "## 1. National tile vs CSV grand total",
        "",
        f"- Live tile: Rs {nat_total:,.2f}",
        f"- CSV total: Rs {csv_total:,.2f}",
        f"- Difference: Rs {diff:,.2f} ({abs(diff) / csv_total * 100:.4f}%)",
        f"- Verdict: {'MATCH (within rounding)' if abs(diff) < csv_total * 1e-5 else 'MISMATCH — investigate'}",
        "",
    ]

    # 2. per-state
    states = {int(r["STATE_ID"]): r["STATE_NAME"] for r in read_csv(LIVE / "live_states.csv")}
    csv_by_state: dict[str, float] = defaultdict(float)
    for r in official:
        csv_by_state[r["State"].strip().lower()] += r["_amt"]

    def norm(s: str) -> str:
        return re.sub(r"[^a-z]", "", s.lower())

    csv_norm = {norm(k): v for k, v in csv_by_state.items()}
    rows2, matched2, ok2 = [], 0, 0
    for t in st_tiles:
        if t["level"] != "state":
            continue
        name = states[int(t["state_id"])]
        live_amt = float(t["allocated_limit_rupees"])
        csv_amt = csv_norm.get(norm(name))
        if csv_amt is None:
            rows2.append((name, live_amt, None, None))
            continue
        matched2 += 1
        d = live_amt - csv_amt
        if abs(d) < max(TOL, csv_amt * 1e-6):
            ok2 += 1
        rows2.append((name, live_amt, csv_amt, d))
    lines += [
        "## 2. Per-state allocated tiles vs CSV state sums",
        "",
        f"- {matched2}/{len(rows2)} states matched by name; {ok2} within tolerance",
        "",
        "| State | Live tile (Rs) | CSV sum (Rs) | Diff (Rs) |",
        "|---|---:|---:|---:|",
    ]
    for name, live_amt, csv_amt, d in sorted(rows2, key=lambda x: -(x[1])):
        csv_s = f"{csv_amt:,.2f}" if csv_amt is not None else "—"
        d_s = f"{d:,.2f}" if d is not None else "—"
        lines.append(f"| {name} | {live_amt:,.2f} | {csv_s} | {d_s} |")
    lines.append("")

    # 2b. constituency-tile sums vs state tiles (internal consistency)
    p_const_tiles = LIVE / "live_tiles_constituency.csv"
    if p_const_tiles.exists():
        crows = read_csv(p_const_tiles)
        sum_by_state: dict[str, float] = defaultdict(float)
        for c in crows:
            sum_by_state[c["state_id"]] += float(c["allocated_limit_rupees"])
        tile_by_state = {t["state_id"]: float(t["allocated_limit_rupees"]) for t in st_tiles if t["level"] == "state"}
        diffs = {sid: sum_by_state[sid] - tile_by_state[sid] for sid in sum_by_state if sid in tile_by_state}
        worst = max(diffs.items(), key=lambda kv: abs(kv[1]), default=("", 0.0))
        # direct CSV cross-check: (state, constituency) -> amount
        state_name_by_id = {str(sid): norm(n) for sid, n in states.items()}
        const_name = {r["CONST_ID"]: r["CONST_NAME"] for r in read_csv(LIVE / "live_constituencies.csv")}
        csv_by_sc = {(norm(r["State"]), norm(r["Constituency"])): r["_amt"] for r in official}
        m_exact, m_off, m_miss = 0, 0, 0
        row_diffs = []
        for c in crows:
            key = (state_name_by_id.get(c["state_id"], ""), norm(const_name.get(c["const_id"], "")))
            amt = csv_by_sc.get(key)
            if amt is None:
                m_miss += 1
                continue
            d = float(c["allocated_limit_rupees"]) - amt
            row_diffs.append(abs(d))
            if abs(d) < TOL:
                m_exact += 1
            else:
                m_off += 1
        med = sorted(row_diffs)[len(row_diffs) // 2] if row_diffs else 0.0
        lines += [
            "## 2b. Constituency-tile sums vs state tiles (internal consistency)",
            "",
            f"- Constituencies harvested: {len(crows)} covering {len(sum_by_state)} states",
            f"- States checked: {len(diffs)}; worst abs diff: Rs {abs(worst[1]):,.2f} (state {worst[0]})",
            f"- Verdict: {'CONSISTENT' if abs(worst[1]) < 1.0 else 'CHECK'}",
            "",
            "### Constituency tiles vs official CSV rows",
            "",
            f"- Matched: {m_exact + m_off}/{len(crows)} (exact: {m_exact}, off: {m_off}, unmatched: {m_miss})",
            f"- Median abs diff: Rs {med:,.2f}",
            f"- Verdict: {'ROW-LEVEL MATCH' if m_exact + m_off and m_exact / (m_exact + m_off) > 0.95 else 'CHECK'}",
            "",
        ]

    # 3. per-MP (only if the MP tile harvest exists)
    p_mp = LIVE / "live_tiles_mp.csv"
    if not p_mp.exists():
        lines += ["## 3. Per-MP tiles", "", "_live_tiles_mp.csv not present yet — rerun after harvest completes._", ""]
    else:
        mp_tiles = read_csv(p_mp)
        mp_names = {str(m["MP_ID"]): m["MP_NAME"] for m in read_csv(LIVE / "live_mps.csv")}
        csv_by_name = {norm(r["Hon'ble Members of Parliaments"]): r for r in official}
        exact, fuzzy, unmatched = 0, 0, []
        sum_diffs = []
        for t in mp_tiles:
            live_amt = float(t["allocated_limit_rupees"])
            name = mp_names.get(t["mp_id"], "")
            row = csv_by_name.get(norm(name))
            if row is None:
                # conservative matcher returns loader rows (crore-rounded);
                # re-lookup the exact CSV row via the matched official name
                m = find_official_match(name)
                if isinstance(m, dict):
                    row = csv_by_name.get(norm(m.get("mp", "")))
            if row is None:
                unmatched.append((name, live_amt))
                continue
            d = live_amt - row["_amt"]
            sum_diffs.append(abs(d))
            if abs(d) < TOL:
                exact += 1
            else:
                fuzzy += 1
        lines += [
            "## 3. Per-MP allocated tiles vs CSV rows",
            "",
            f"- MP tiles harvested: {len(mp_tiles)}",
            f"- Matched to CSV: {exact + fuzzy}  (exact: {exact}, off: {fuzzy})",
            f"- Unmatched: {len(unmatched)}",
            f"- Median abs diff: Rs {sorted(sum_diffs)[len(sum_diffs)//2]:,.2f}" if sum_diffs else "- no diffs",
            "",
            "Unmatched sample (first 15):",
            "",
        ] + [f"- {n!r} (live Rs {a:,.2f})" for n, a in unmatched[:15]] + [""]

    out = LIVE / "RECONCILIATION.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out}")
    print("\n".join(lines[:14]))


if __name__ == "__main__":
    main()
