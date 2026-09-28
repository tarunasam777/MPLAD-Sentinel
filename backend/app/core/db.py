from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import (
    DATABASE_URL,
    ENABLE_POSTGIS_EXT,
    SQLITE_BUSY_TIMEOUT_MS,
    SQL_MAX_OVERFLOW,
    SQL_POOL_RECYCLE,
    SQL_POOL_SIZE,
)

connect_args = {}
engine_opts = {
    "pool_pre_ping": True,
    "pool_size": SQL_POOL_SIZE,
    "max_overflow": SQL_MAX_OVERFLOW,
    "pool_recycle": SQL_POOL_RECYCLE,
}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    # SQLite writes are single-writer; a long-running big transaction (the
    # background 77k-row real-register seed) must never bounce concurrent
    # reads with "database is locked". QueuePool is disabled for SQLite;
    # drop the pool tuning so SQLAlchemy picks its native SQLite pool.
    engine_opts.pop("pool_size")
    engine_opts.pop("max_overflow")

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_opts)

if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Foreign keys stay ON per connection (as before) ...
        cursor.execute("PRAGMA foreign_keys=ON")
        # ... and readers wait up to 30 s for a busy writer instead of failing.
        cursor.execute(f"PRAGMA busy_timeout={SQLITE_BUSY_TIMEOUT_MS}")
        # WAL allows concurrent readers during writes (the background seed);
        # NORMAL synchronous keeps WAL durability while avoiding a sync on
        # every transaction under high read concurrency.
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_schema() -> None:
    from app.db import models  # noqa: F401  (register tables)

    Base.metadata.create_all(bind=engine)
    _migrate_indexes()
    if ENABLE_POSTGIS_EXT:
        from sqlalchemy import text

        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))


def _migrate_indexes() -> None:
    """Idempotent index migration for hot dashboard/filter queries.

    create_all() adds indexes only when it creates the table; an existing DB
    (e.g. upgraded from String(24) case ids or pre-register deployments) never
    gains them. Composite score serves risk-band filters, state/status/MpStat
    the works register filters, district the case-list filter — all were full
    scans over 77k rows before. ``IF NOT EXISTS`` keeps this safe to run on
    every boot alongside a fresh create_all().
    """
    from sqlalchemy import text

    statements = [
        "CREATE INDEX IF NOT EXISTS ix_cases_composite_score ON cases (composite_score)",
        "CREATE INDEX IF NOT EXISTS ix_cases_mp_name ON cases (mp_name)",
        "CREATE INDEX IF NOT EXISTS ix_cases_category ON cases (category)",
        "CREATE INDEX IF NOT EXISTS ix_ledger_case_id ON ledger (case_id)",
    ]
    statements += [
        "CREATE INDEX IF NOT EXISTS ix_cases_district ON cases (district)",
        "CREATE INDEX IF NOT EXISTS ix_cases_status ON cases (status)",
        "CREATE INDEX IF NOT EXISTS ix_cases_state ON cases (state)",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))