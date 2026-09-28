"""Harvest the pre-login MPLADS eSAKSHI dashboard API into CSVs.

Source: https://mplads.mospi.gov.in/digigov/dashboard.html (public, pre-login).
The page is a JS app; its REST layer was extracted from the page's own scripts:

  POST /rest/PreLoginDashboardData/getStateData          {} -> [{STATE_NAME, STATE_ID}]
  POST /rest/PreLoginDashboardData/getConstituencyData   {"id": state_id} -> [{ID, CAPTION}]
  POST /rest/PreLoginDashboardData/getMpAndConstCombo    {"const_combo": "0"} -> [{ID, CAPTION}]  (full MP master list)
  POST /rest/PreLoginDashboardData/getTilesData          {"uname": "S,C,M,2"} -> tile metrics

uname is "state,const,mp,tenure"; 0 = "all", tenure 2 = 18th Lok Sabha.
Amounts come back as rupee strings ("Rs 83,41,87,02,273.80" with a mangled
currency glyph); we parse the digits only and keep both raw and parsed.

Outputs (backend/app/data/live/):
  live_states.csv, live_constituencies.csv, live_mps.csv,
  live_tiles_state.csv, live_tiles_constituency.csv, live_tiles_mp.csv

Read-only, polite (0.3 s delay), resumable per file.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData"
OUT = Path(__file__).resolve().parents[1] / "app" / "data" / "live"
DELAY = 0.3
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json",
    "Referer": "https://mplads.mospi.gov.in/digigov/dashboard.html",
    "X-Requested-With": "XMLHttpRequest",
}
TENURE = 2  # 18th Lok Sabha

def call(endpoint: str, payload: dict, retries: int = 6):
    body = json.dumps(payload).encode("utf-8")
    last: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(
            f"{BASE}/{endpoint}", data=body, method="POST",
            headers={**HEADERS, "Content-Length": str(len(body))},
        )
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                ctype = resp.headers.get("content-type", "")
                if resp.status == 200 and "json" in ctype:
                    return json.loads(resp.read().decode("utf-8"))
                last = RuntimeError(f"{endpoint}: HTTP {resp.status} ({ctype or 'no type'})")
        except (urllib.error.URLError, OSError, TimeoutError, ValueError) as exc:
            last = exc
        time.sleep(min(2.0 * (attempt + 1), 10.0))
    raise RuntimeError(f"{endpoint} {payload} failed after {retries} attempts: {last}")


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def harvest_tiles(level: str, entities: list[dict], out_path: Path, uname_fn) -> list[dict]:
    """Fetch tiles per entity, checkpointing every row (append + flush).

    Survives being killed mid-run: already-fetched entity IDs are skipped
    on restart.
    """
    fields = list(tile_row(level, 0, 0, 0, {}).keys())
    key_field = {"mp": "mp_id", "constituency": "const_id", "state": "state_id"}[level]
    done: set[str] = set()
    rows: list[dict] = []
    if out_path.exists():
        rows = read_csv(out_path)
        done = {r[key_field] for r in rows}
        print(f"  resuming: {len(rows)} already fetched", flush=True)
    new_file = not out_path.exists()
    with out_path.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            w.writeheader()
        for i, e in enumerate(entities, 1):
            key = str(e["id"])
            if key in done:
                continue
            row = tile_row(level, e.get("state_id", 0), e.get("const_id", 0), e.get("mp_id", 0), call("getTilesData", {"uname": uname_fn(e)}))
            w.writerow(row)
            f.flush()
            rows.append(row)
            time.sleep(DELAY)
            if i % 50 == 0:
                print(f"  {i}/{len(entities)}", flush=True)
    return rows


def parse_amount(raw: str) -> float:
    digits = re.sub(r"[^\d.]", "", raw or "")
    return float(digits) if digits else 0.0


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"  wrote {path.name}: {len(rows)} rows")


def tile_row(level: str, sid, cid, mid, tiles: dict) -> dict:
    def amt(key, idx=0):
        v = tiles.get(key)
        if isinstance(v, list) and v:
            return parse_amount(str(v[idx]))
        return 0.0

    def cnt(key):
        v = tiles.get(key)
        return int(v[0]) if isinstance(v, list) and v else 0

    return {
        "level": level,
        "state_id": sid,
        "const_id": cid,
        "mp_id": mid,
        "tenure": TENURE,
        "allocated_limit_rupees": amt("Allocated Limit for Hon'ble MPs"),
        "expenditure_rupees": amt("Expenditure on Completed and On-going Works as on Date"),
        "works_recommended_count": cnt("Works Recommended"),
        "works_recommended_rupees": amt("Works Recommended", 1),
        "works_sanctioned_count": cnt("Works Sanctioned"),
        "works_sanctioned_rupees": amt("Works Sanctioned", 1),
        "works_completed_count": cnt("Works Completed"),
        "works_completed_rupees": amt("Works Completed", 1),
        "raw": tiles,
    }


def harvest() -> None:
    print("1/5 states…", flush=True)
    p_states = OUT / "live_states.csv"
    if p_states.exists():
        states = [{"STATE_ID": int(r["STATE_ID"]), "STATE_NAME": r["STATE_NAME"]} for r in read_csv(p_states)]
        print(f"  cached: {len(states)} states")
    else:
        states = call("getStateData", {})
        write_csv(p_states, ["STATE_ID", "STATE_NAME"], states)

    print("2/5 constituencies…", flush=True)
    p_consts = OUT / "live_constituencies.csv"
    if p_consts.exists():
        consts = [{"STATE_ID": int(r["STATE_ID"]), "CONST_ID": int(r["CONST_ID"]), "CONST_NAME": r["CONST_NAME"]} for r in read_csv(p_consts)]
        print(f"  cached: {len(consts)} constituencies")
    else:
        consts = []
        for s in states:
            for c in call("getConstituencyData", {"id": str(s["STATE_ID"])}):
                consts.append({"STATE_ID": s["STATE_ID"], "CONST_ID": c["ID"], "CONST_NAME": c["CAPTION"]})
            time.sleep(DELAY)
        write_csv(p_consts, ["STATE_ID", "CONST_ID", "CONST_NAME"], consts)

    print("3/5 MP master list…", flush=True)
    p_mps = OUT / "live_mps.csv"
    if p_mps.exists():
        mps = [{"ID": int(r["MP_ID"]), "CAPTION": r["MP_NAME"]} for r in read_csv(p_mps)]
        print(f"  cached: {len(mps)} MPs")
    else:
        mps = call("getMpAndConstCombo", {"const_combo": "0"})
        write_csv(p_mps, ["MP_ID", "MP_NAME"], [{"MP_ID": m["ID"], "MP_NAME": m["CAPTION"]} for m in mps])

    print("4/5 state + national tiles…", flush=True)
    p_state_tiles = OUT / "live_tiles_state.csv"
    if p_state_tiles.exists():
        rows = read_csv(p_state_tiles)
        print(f"  cached: {len(rows)} rows")
    else:
        rows = [tile_row("national", 0, 0, 0, call("getTilesData", {"uname": f"0,0,0,{TENURE}"}))]
        for s in states:
            sid = str(s["STATE_ID"])
            rows.append(tile_row("state", sid, 0, 0, call("getTilesData", {"uname": f"{sid},0,0,{TENURE}"})))
            time.sleep(DELAY)
        write_csv(p_state_tiles, list(rows[0]), rows)

    print("5/5 constituency tiles…", flush=True)
    p_const_tiles = OUT / "live_tiles_constituency.csv"
    crows = harvest_tiles(
        "constituency",
        [{"id": c["CONST_ID"], "state_id": c["STATE_ID"], "const_id": c["CONST_ID"]} for c in consts],
        p_const_tiles,
        lambda c: f"{c['state_id']},{c['id']},0,{TENURE}",
    )
    print(f"  total: {len(crows)} constituency rows", flush=True)

    print("6/6 MP tiles…", flush=True)
    p_mp_tiles = OUT / "live_tiles_mp.csv"
    mrows = harvest_tiles(
        "mp",
        [{"id": m["ID"], "mp_id": m["ID"]} for m in mps],
        p_mp_tiles,
        lambda m: f"0,0,{m['id']},{TENURE}",
    )
    print(f"  total: {len(mrows)} MP rows", flush=True)

    nat = next(r for r in rows if str(r.get("level")) == "national")
    total = float(nat["allocated_limit_rupees"])
    print(f"\nNational allocated limit: Rs {total:,.2f}  (expect ~8,341.87 Cr)", flush=True)


if __name__ == "__main__":
    try:
        harvest()
    except KeyboardInterrupt:
        sys.exit("\ninterrupted — rerun to resume")
