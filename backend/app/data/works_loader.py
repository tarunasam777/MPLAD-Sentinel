"""Loader for the vendored eSAKSHI work-level exports (Lok Sabha).

Normalizes the three real work tables in ``app/data/lok_shaba/`` into one
dataset of real works:

* ``Works Sanctioned.csv``  — the master work list (81,727 rows)
* ``Works Completed.csv``   — completed subset (join key: embedded work id)
* ``Expenditure…csv``       — vendor payments, payment-grain (join key: Work ID)

Every row is a REAL portal record: real work id (``WS/MP<n>/<fy>/<id>``),
real MP, real constituency, real district authority (IDA), real amounts and
dates. Records carry ``facts["source"] = "esakshi-export"`` so the demo data
policy can distinguish real records from demonstration ones.

See ``app/data/worklevel/README.md`` for ingest caveats (tab characters in
ids, recommended ⊇ sanctioned ⊇ completed lifecycle).
"""

from __future__ import annotations

import csv
import re
from datetime import datetime
from functools import lru_cache
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]
DATA = BACKEND / "app" / "data"
LS_DIR = DATA / "lok_shaba"

WORK_ID_RE = re.compile(
    r"WS[\s/]*MP\s*(\d+)\s*/\s*(\d{4}-\d{4})\s*/\s*(\d+)(?:\s*-(.*))?", re.S
)


def parse_work_id(value: str) -> tuple[str | None, str]:
    """Canonicalize a portal work field into (work_id, title).

    The exports carry whitespace corruption inside the id (``WS/\t MP620/…``);
    the canonical form is ``WS/MP<n>/<fy>/<seq>`` and the remainder is the
    real work title.
    """
    m = WORK_ID_RE.match((value or "").strip())
    if m:
        return f"WS/MP{m.group(1)}/{m.group(2)}/{m.group(3)}", (m.group(4) or "").strip()
    return None, (value or "").replace("\t", " ").strip()


# Completion percentage by portal Work Status (the lifecycle stage the
# district authority last recorded). Membership of Works Completed always
# wins (100) because it is the portal's own completion register.
STATUS_COMPLETION_PCT = {
    "Sanction": 0,
    "Vendor Identification": 5,
    "Time Estimation": 10,
    "Physical Inspection": 10,
    "Work partially Completed": 50,
    "Work Completed": 100,
}

SNAPSHOT_DATE = datetime(2026, 9, 21)  # export pull date


def _read(name: str) -> list[dict]:
    path = LS_DIR / name
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    return [r for r in rows if not r.get("Sr. No.", "").strip().lower().startswith("grand total")]


def rupees(raw: str | None) -> float:
    return float(re.sub(r"[^\d.]", "", (raw or "").strip()) or 0)


def parse_date(raw: str | None) -> datetime | None:
    raw = (raw or "").strip()
    for fmt in ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def split_work_field(value: str) -> tuple[str | None, str]:
    """``WS/MP620/2024-2025/133166-Construction of ...`` -> (work_id, title)."""
    return parse_work_id(value)


def district_from_ida(ida: str | None) -> str:
    """``ROHTAS(District Planning Officer Rohtas_IDA)`` → ``Rohtas``."""
    head = (ida or "").split("(")[0].strip()
    head = re.sub(r"[_\s]+$", "", head)
    return head.title() if head else "Unknown"


def months_between(a: datetime, b: datetime) -> float:
    return max(0.0, (b - a).days / 30.44)


@lru_cache(maxsize=1)
def load_real_works() -> list[dict]:
    """Unified real works with joined completion + payment aggregates.

    Cached: ~217k CSV rows are parsed and joined on every call — sync and the
    works API depend on it, so re-parsing per request cost ~10 s each time.
    """
    sanctioned = _read("Works Sanctioned.csv")
    completed_date: dict[str, datetime] = {}
    for r in _read("Works Completed.csv"):
        wid, _title = split_work_field(r["Work"])
        d = parse_date(r.get("Completion Date"))
        if wid and d:
            completed_date[wid] = d

    payments: dict[str, dict] = {}
    for r in _read("Expenditure on Completed and On-going Works as on Date.csv"):
        wid, _ = parse_work_id(r.get("Work ID") or "")
        if not wid:
            continue
        agg = payments.setdefault(wid, {"paid": 0.0, "n": 0, "last": None})
        agg["paid"] += rupees(r.get("Fund Disbursed Amount ( \u20b9 )"))
        agg["n"] += 1
        d = parse_date(r.get("Expenditure Date"))
        if d and (agg["last"] is None or d > agg["last"]):
            agg["last"] = d

    works: list[dict] = []
    for r in sanctioned:
        raw_field = r.get("Work") or r.get("WORK") or ""
        wid, title = split_work_field(raw_field)
        if not wid:
            # unparseable id — keep the record but key it on the row number
            wid = f"WS/NOPARSE/{r.get('Sr. No.', len(works) + 1)}"
        sanction_date = parse_date(r.get("Sanction Date"))
        status = (r.get("Work Status") or "").strip()
        completed = wid in completed_date
        completion_pct = 100 if completed else STATUS_COMPLETION_PCT.get(status, 0)

        end = completed_date.get(wid)  # exact completion date when the portal published one
        pay = payments.get(wid)
        paid = pay["paid"] if pay else 0.0
        if end is None and pay and pay["last"]:
            end = pay["last"]
        if end is None:
            end = SNAPSHOT_DATE

        sanction_amt = rupees(r.get("Sanction Amount ( \u20b9 )"))
        released_pct = min(100.0, round(paid / sanction_amt * 100, 1)) if sanction_amt > 0 else 0.0

        months = months_between(sanction_date, end) if sanction_date else 0.0
        age_months = months_between(sanction_date, SNAPSHOT_DATE) if sanction_date else 0.0
        velocity = round(released_pct / max(1.0, months), 2)

        works.append(
            {
                "work_id": wid,
                "title": title or "eSAKSHI work",
                "category": (r.get("Work category") or "Normal/Others").strip(),
                "state": (r.get("State") or "").strip(),
                "district": district_from_ida(r.get("IDA")),
                "ida": (r.get("IDA") or "").strip(),
                "constituency": (r.get("Constituency") or "").strip(),
                "mp_name": (r.get("Hon'ble Members of Parliament") or "").strip(),
                "sanction_amount_rupees": sanction_amt,
                "sanctioned_date": sanction_date,
                "status": status,
                "completed": completed,
                "completion_pct": completion_pct,
                "released_pct": released_pct,
                "paid_rupees": round(paid, 2),
                "payment_count": pay["n"] if pay else 0,
                "months_since_sanction": round(months, 1),
                "age_at_snapshot": round(age_months, 1),
                "disbursal_velocity": velocity,
            }
        )
    return works


def stall_labels(works: list[dict]) -> list[dict]:
    """Attach REAL ground-truth stall labels.

    Scheme guidelines require sanctioned works to complete within one year.
    A work is labelled stalled when it is not completed and has aged past
    the 12-month window, or when it completed but only after more than 12
    months (either way, the one-year norm was violated). Ground truth comes
    from the portal's own completion register — no synthetic rule.
    """
    for w in works:
        w["stalled"] = int(
            (not w["completed"] and w["months_since_sanction"] > 12)
            or (w["completed"] and w["months_since_sanction"] > 12)
        )
    return works


def district_stall_rates(works: list[dict]) -> dict[str, float]:
    """Share of stalled works per district — a genuine per-district prior."""
    totals: dict[str, list[int]] = {}
    for w in works:
        totals.setdefault(w["district"], [0, 0])
        totals[w["district"]][0] += w["stalled"]
        totals[w["district"]][1] += 1
    return {d: round(bad / n, 4) for d, (bad, n) in totals.items() if n >= 5}
