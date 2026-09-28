"""0002_align_models

Bring a database created from the 0001 migration in line with the current
ORM models:

* ``cases.id`` and every FK back to it are String(48) — the eSAKSHI
  sync-normalized ids ("MPL-WS/…") run 25–29 characters, which overflowed
  the original String(24) and forced the app to run on ``create_all``
  instead of real migrations.
* ``mp_allocations`` is created — the official MoSPI allocation table that
  was never part of the 0001 schema (the app seeds it on every boot, but
  migrations should own the durable schema).
* The hot filter/search indexes the runtime relies on are added
  idempotently (composite score bands, works-register filters, ledger
  case-id lookups).

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str | None, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ID_COLUMNS = [
    ("cases", "id", True),
    ("module_scores", "case_id", False),
    ("ledger", "case_id", False),
    ("overrides", "case_id", False),
]

_ID_INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_cases_cls_district ON cases (district)",
    "CREATE INDEX IF NOT EXISTS ix_cases_status ON cases (status)",
    "CREATE INDEX IF NOT EXISTS ix_cases_state ON cases (state)",
    "CREATE INDEX IF NOT EXISTS ix_cases_mp_name ON cases (mp_name)",
    "CREATE INDEX IF NOT EXISTS ix_cases_category ON cases (category)",
    "CREATE INDEX IF NOT EXISTS ix_cases_composite_score ON cases (composite_score)",
    "CREATE INDEX IF NOT EXISTS ix_ledger_case_id ON ledger (case_id)",
]


def _current_col_length(inspector, table: str, column: str) -> Union[int, None]:
    for col in inspector.get_columns(table):
        if col["name"] == column:
            return getattr(col["type"], "length", None)
    return None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    for table, column, is_pk in _ID_COLUMNS:
        if not inspector.has_table(table):
            continue
        if _current_col_length(inspector, table, column) == 48:
            continue
        with op.batch_alter_table(table) as batch:
            batch.alter_column(column, type_=sa.String(length=48), existing_type=sa.String(length=24))

    # mp_allocations — official MoSPI allocation table (see app.db.models.MpAllocation).
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS mp_allocations (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            mp_name VARCHAR(120) NOT NULL,
            state VARCHAR(64) NOT NULL,
            constituency VARCHAR(96),
            allocated_cr FLOAT,
            source VARCHAR(32) DEFAULT 'mospi-csv'
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_mp_allocations_mp_name ON mp_allocations (mp_name)"
    )

    # Hot filter/search indexes (idempotent — safe on fresh create_all DBs).
    for stmt in _ID_INDEXES:
        op.execute(stmt)


def downgrade() -> None:
    # Column widening is a forward-only data-compat change: ids created under
    # String(48) may exceed 24 chars, so shrinking back would truncate/lose
    # rows. Leave columns widened; drop only the additive index on the
    # registration table this revision created.
    op.execute("DROP INDEX IF EXISTS ix_mp_allocations_mp_name")