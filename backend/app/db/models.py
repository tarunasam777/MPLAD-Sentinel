from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Case(Base):
    __tablename__ = "cases"

    # 48 chars: real eSAKSHI work ids ("WS/MP138/2025-2026/205446") and their
    # sync-normalized forms ("MPL-WS/…") run 25–29 chars — String(24) held on
    # SQLite but would truncate/reject on Postgres.
    id: Mapped[str] = mapped_column(String(48), primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    hindi_title: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(64), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    constituency: Mapped[str] = mapped_column(String(64))
    mp_name: Mapped[str] = mapped_column(String(80))
    dm_name: Mapped[str] = mapped_column(String(80))
    sanctioned_amount_lakh: Mapped[float] = mapped_column(Float)
    sanctioned_date: Mapped[str] = mapped_column(String(24), default="")
    status: Mapped[str] = mapped_column(String(40), index=True)
    status_since: Mapped[str] = mapped_column(String(32))
    overview: Mapped[str] = mapped_column(Text, default="")
    mp_plain_status: Mapped[str] = mapped_column(Text, default="")
    composite_score: Mapped[int] = mapped_column(Integer, default=0)
    gate_fired: Mapped[bool] = mapped_column(Boolean, default=False)
    gate_rule: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    gate_held_independent: Mapped[bool] = mapped_column(Boolean, default=False)
    path: Mapped[list] = mapped_column(JSON, default=list)
    facts: Mapped[dict] = mapped_column(JSON, default=dict)

    module_scores: Mapped[list["ModuleScore"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class ModuleScore(Base):
    __tablename__ = "module_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    module: Mapped[str] = mapped_column(String(24), index=True)
    sub_score: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text, default="")
    triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    case: Mapped[Case] = relationship(back_populates="module_scores")


class OfficialStat(Base):
    __tablename__ = "officials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    role: Mapped[str] = mapped_column(String(48), default="District Magistrate")
    district: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(64))
    high_risk_decisions: Mapped[int] = mapped_column(Integer, default=0)
    gate_overrides: Mapped[int] = mapped_column(Integer, default=0)
    threshold_overrides: Mapped[int] = mapped_column(Integer, default=0)
    flagged_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class LedgerEntry(Base):
    __tablename__ = "ledger"

    index: Mapped[int] = mapped_column(Integer, primary_key=True)
    action: Mapped[str] = mapped_column(String(48))
    category: Mapped[str] = mapped_column(String(24), index=True)
    actor: Mapped[str] = mapped_column(String(80))
    actor_role: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[str] = mapped_column(String(32))
    case_id: Mapped[str | None] = mapped_column(String(48), nullable=True)
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64), index=True)


class OverrideRecord(Base):
    __tablename__ = "overrides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(String(48), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # "gate" | "threshold"
    official_name: Mapped[str] = mapped_column(String(80))
    official_district: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(48))
    body: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[str] = mapped_column(String(32))
    ledger_index: Mapped[int] = mapped_column(Integer)


class MetaKey(Base):
    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String(96), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)


class CostBaseline(Base):
    __tablename__ = "cost_baselines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    terrain: Mapped[str] = mapped_column(String(32), default="plain")
    mean_log_cost: Mapped[float] = mapped_column(Float)
    mad_log_cost: Mapped[float] = mapped_column(Float)
    median_lakh: Mapped[float] = mapped_column(Float)
    low_lakh: Mapped[float] = mapped_column(Float)
    high_lakh: Mapped[float] = mapped_column(Float)
    n_records: Mapped[int] = mapped_column(Integer)


class DistrictQuarterly(Base):
    __tablename__ = "district_quarterly"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    q1: Mapped[int] = mapped_column(Integer)
    q2: Mapped[int] = mapped_column(Integer)
    q3: Mapped[int] = mapped_column(Integer)
    q4: Mapped[int] = mapped_column(Integer)
    ytd: Mapped[int] = mapped_column(Integer)


class MonthlyTrend(Base):
    __tablename__ = "monthly_trend"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    month: Mapped[str] = mapped_column(String(8), index=True)
    district: Mapped[str] = mapped_column(String(64), index=True)
    release_pct: Mapped[int] = mapped_column(Integer)


class StateStat(Base):
    __tablename__ = "state_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    state: Mapped[str] = mapped_column(String(64), unique=True)
    utilization: Mapped[int] = mapped_column(Integer)
    cases_count: Mapped[int] = mapped_column(Integer)


class CategoryStat(Base):
    __tablename__ = "category_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(64), unique=True)
    sanctions_cr: Mapped[float] = mapped_column(Float)
    releases_cr: Mapped[float] = mapped_column(Float)


class MpStat(Base):
    __tablename__ = "mp_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mp_name: Mapped[str] = mapped_column(String(80), unique=True)
    used_cr: Mapped[float] = mapped_column(Float)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)


class MpAllocation(Base):
    """Official MoSPI allocation limit per Hon'ble MP, loaded verbatim from
    the vendored “Allocated Limit for Hon'ble MPs” table (all Lok Sabha
    MPs). ``allocated_cr`` is None where the portal row publishes no
    amount — displayed as pending revision, never coerced to zero."""

    __tablename__ = "mp_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mp_name: Mapped[str] = mapped_column(String(120), unique=True)
    state: Mapped[str] = mapped_column(String(64), index=True)
    constituency: Mapped[str] = mapped_column(String(96))
    allocated_cr: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="mospi-csv")


class QuarantineQueue(Base):
    __tablename__ = "quarantine_queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    error_reason: Mapped[str] = mapped_column(Text)
    ingested_at: Mapped[str] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(64), default="esakshi")
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


__all__ = [
    "Case",
    "ModuleScore",
    "OfficialStat",
    "LedgerEntry",
    "OverrideRecord",
    "MetaKey",
    "CostBaseline",
    "DistrictQuarterly",
    "MonthlyTrend",
    "StateStat",
    "CategoryStat",
    "MpStat",
    "MpAllocation",
    "QuarantineQueue",
]