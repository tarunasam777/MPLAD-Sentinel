from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Case, ModuleScore, QuarantineQueue
from app.fusion import fusion, gate as gate_mod
from app.ledger.chain import append as append_ledger
from app.modules import (
    compliance,
    cost_delay,
    duplicate,
    payment,
    photo,
    predictive,
    trend,
)
from app.modules.common import ModuleContext

logger = logging.getLogger(__name__)


def validate_raw_case_schema(raw: dict[str, Any]) -> tuple[bool, str]:
    """Validates required structural fields of raw proposal payloads."""
    if not isinstance(raw, dict):
        return False, "Payload is not a JSON object/dictionary"

    title = raw.get("title")
    if not title or not isinstance(title, str) or len(title.strip()) < 3:
        return False, "Missing or invalid 'title' (minimum 3 characters required)"

    district = raw.get("district")
    if not district or not isinstance(district, str):
        return False, "Missing or invalid 'district'"

    category = raw.get("category")
    if not category or not isinstance(category, str):
        return False, "Missing or invalid 'category'"

    amt = raw.get("sanctionedAmountLakh") if "sanctionedAmountLakh" in raw else raw.get("sanctioned_amount_lakh")
    if amt is None:
        return False, "Missing 'sanctionedAmountLakh' / 'sanctioned_amount_lakh'"
    try:
        amt_val = float(amt)
        if amt_val <= 0:
            return False, f"Sanctioned amount must be positive, got {amt_val}"
    except (ValueError, TypeError):
        return False, f"Invalid sanctioned amount value: {amt}"

    facts = raw.get("facts")
    if facts is not None and not isinstance(facts, dict):
        return False, "'facts' attribute must be a dictionary if present"

    return True, ""


def run_case_pipeline(db: Session, case: Case) -> list:
    """Deterministically evaluates all 7 scoring modules, fuses them, and applies
    the gate. Pure function of the stored facts — idempotent rescorings.
    Returns the module results so callers can reason over scores without a
    second round-trip to re-read rows this function just persisted."""
    ctx = ModuleContext(db=db, case=case, facts=case.facts or {})

    results = [
        duplicate.evaluate(ctx),
        cost_delay.evaluate(ctx),
        compliance.evaluate(ctx),
        payment.evaluate(ctx),
        predictive.evaluate(ctx),
        photo.evaluate(ctx),
        trend.evaluate(ctx),
    ]

    db.query(ModuleScore).filter_by(case_id=case.id).delete()
    module_flags = {}
    for r in results:
        db.add(
            ModuleScore(
                case_id=case.id,
                module=r.module,
                sub_score=r.sub_score,
                description=r.description,
                triggered=r.triggered,
                evidence=r.evidence,
            )
        )
        if r.flags:
            module_flags[r.module] = r.flags

    db.flush()
    # Fuse over the in-memory ModuleResult rows directly and persist the
    # composite immediately (a DB round-trip to re-read what we just wrote
    # was a per-case query — 77k queries during a full real-register seed).
    case.composite_score, _ = fusion.fuse(results)
    fired, rule, detail = gate_mod.evaluate_gate(module_flags)
    case.gate_fired = fired
    case.gate_rule = rule
    case.gate_detail = detail
    case.gate_held_independent = fired
    return results


def ingest_and_evaluate_batch(
    db: Session,
    raw_cases: list[dict[str, Any]],
    source: str = "esakshi",
    record_ledger: bool = True,
) -> dict[str, Any]:
    """Ingests raw records, quarantines corrupted payloads, triggers modules 1-7,
    executes Fusion (M8) & Gate (M9), and transitions the initial case state."""
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    results = {
        "total": len(raw_cases),
        "ingested": 0,
        "quarantined": 0,
        "held": 0,
        "evaluating": 0,
        "skipped": 0,
        "real_would_hold": 0,
        "cases": [],
        "quarantined_ids": [],
    }

    for raw in raw_cases:
        is_valid, error_msg = validate_raw_case_schema(raw)
        if not is_valid:
            logger.warning("Corrupt payload detected during ingestion: %s", error_msg)
            quarantine_entry = QuarantineQueue(
                raw_payload=raw if isinstance(raw, dict) else {"raw": str(raw)},
                error_reason=error_msg,
                ingested_at=timestamp,
                source=source,
                resolved=False,
            )
            db.add(quarantine_entry)
            db.flush()
            results["quarantined"] += 1
            results["quarantined_ids"].append(quarantine_entry.id)
            continue

        # Data policy: demonstration records are tagged ``demo`` so the
        # workflow layer can enforce "no real person's name on a held row".
        # Real portal records (``record_kind: "real"``) carry real names and
        # are NOT tagged — and below they are kept out of flagged states
        # entirely, so the invariant holds from both directions.
        raw_facts = raw.get("facts") if isinstance(raw.get("facts"), dict) else {}
        is_real = raw_facts.get("record_kind") == "real"
        if not is_real:
            raw.setdefault("facts", {})["demo"] = True

        case_id = raw.get("id") or f"MPL-{datetime.now(timezone.utc).year}-{abs(hash(raw.get('title', ''))) % 9000 + 1000}"
        amt = float(raw.get("sanctionedAmountLakh") or raw.get("sanctioned_amount_lakh") or 10.0)

        case = db.query(Case).filter_by(id=case_id).first()
        # Unchanged real records skip re-evaluation entirely: re-running the
        # full module/ML pipeline on identical portal rows made every repeat
        # sync pay seconds of inference for zero new information — and would
        # even clobber an officer's retitled description with portal text.
        # Demo records and rows whose title changed always re-evaluate.
        if case is not None and is_real and case.title == (raw.get("title") or ""):
            results["skipped"] += 1
            results["cases"].append(case.id)
            continue

        # Each record is processed inside its own SAVEPOINT so a single
        # failing row (bad portal data, an ML edge case, an integrity error)
        # rolls back just that record and moves to quarantine — it can never
        # abort the rest of the batch or leave the transaction poisoned. The
        # batch still wires every surviving record into one commit.
        try:
            with db.begin_nested():
                if case is None:
                    case = Case(
                        id=case_id,
                        title=raw.get("title", ""),
                        hindi_title=raw.get("hindiTitle") or raw.get("hindi_title") or "",
                        category=raw.get("category", "General Community Assets"),
                        state=raw.get("state", "Telangana"),
                        district=raw.get("district", "Hyderabad"),
                        constituency=raw.get("constituency", raw.get("district", "Hyderabad")),
                        mp_name=raw.get("mpName") or raw.get("mp_name") or "Hon. MP",
                        dm_name=raw.get("dmName") or raw.get("dm_name") or "District Magistrate",
                        sanctioned_amount_lakh=round(amt, 2),
                        sanctioned_date=raw.get("sanctionedDate") or raw.get("sanctioned_date") or datetime.now(timezone.utc).strftime("%d %b %Y"),
                        status="evaluating",
                        status_since=datetime.now(timezone.utc).strftime("%d %b %Y"),
                        overview=raw.get("overview") or f"Sanctioned work {case_id} in {raw.get('district')}.",
                        mp_plain_status=raw.get("mpPlainStatus") or "Under Sentinel automated evaluation.",
                        path=["submitted", "evaluating"],
                        facts=raw.get("facts") or {},
                    )
                    db.add(case)
                else:
                    case.title = raw.get("title", case.title)
                    case.category = raw.get("category", case.category)
                    case.sanctioned_amount_lakh = round(amt, 2)
                    case.facts = raw.get("facts") or case.facts

                db.flush()
                module_results = run_case_pipeline(db, case)

                # State transition decision based on Gate and Fusion. Real
                # portal records are exempt: their computed risk scores and
                # gate flags are kept in full, but the workflow status stays
                # ``evaluating`` — a real person's name must never sit on a
                # held/escalated row (data policy, regression-tested). The
                # demo's holds live on demo records only.
                single_module_hold = fusion.module_level_hold_triggered(module_results)
                risk_hold = case.gate_fired or single_module_hold or case.composite_score >= 60
                if risk_hold and is_real:
                    case.status = "evaluating"
                    case.path = ["submitted", "evaluating"]
                    results["evaluating"] += 1
                    results["real_would_hold"] += 1
                    action = "REAL RECORD INGESTED"
                    body = (
                        f"Real portal record scored (Composite risk: {case.composite_score}/100; "
                        f"risk flag suppressed by data policy)."
                    )
                elif risk_hold:
                    case.status = "hold_active"
                    if "hold_active" not in case.path:
                        case.path = list(case.path) + ["hold_active"]
                    results["held"] += 1
                    action = "GATE HOLD FIRED" if case.gate_fired else "COMPOSITE RISK HOLD"
                    body = (
                        f"Gate rule: {case.gate_rule}"
                        if case.gate_fired
                        else f"Composite risk score: {case.composite_score}/100"
                    )
                else:
                    case.status = "evaluating"
                    results["evaluating"] += 1
                    action = "REAL RECORD INGESTED" if is_real else "PROPOSAL INGESTED"
                    body = f"Automated scoring complete (Composite risk: {case.composite_score}/100)."

                if record_ledger:
                    append_ledger(
                        db,
                        action=action,
                        category="ingestion",
                        actor="system",
                        actor_role="Sentinel Ingestion Engine",
                        body=body,
                        timestamp=timestamp,
                        case_id=case.id,
                        commit=False,
                    )
        except Exception:  # noqa: BLE001 — per-record isolation (see above)
            logger.exception(
                "Record failed ingestion and was quarantined (case_id=%s)", case_id
            )
            quarantine_entry = QuarantineQueue(
                raw_payload=raw if isinstance(raw, dict) else {"raw": str(raw)},
                error_reason="Pipeline evaluation failed for this record.",
                ingested_at=timestamp,
                source=source,
                resolved=False,
            )
            db.add(quarantine_entry)
            db.flush()
            results["quarantined"] += 1
            results["quarantined_ids"].append(quarantine_entry.id)
            continue

        results["ingested"] += 1
        results["cases"].append(case.id)

    db.commit()
    return results


def rescore_all(db: Session, batch_size: int = 100) -> int:
    """Rescore every case in bounded-memory batches (≤100 ORM rows live at
    once, keyset-paginated by id), committing per batch — the old version
    materialized all 77k rows into a single session/transaction. Returns the
    number of cases rescored."""
    done = 0
    last_id = ""
    while True:
        batch = (
            db.query(Case)
            .filter(Case.id > last_id)
            .order_by(Case.id.asc())
            .limit(batch_size)
            .all()
        )
        if not batch:
            break
        for case in batch:
            run_case_pipeline(db, case)
        db.commit()
        last_id = batch[-1].id
        done += len(batch)
    return done