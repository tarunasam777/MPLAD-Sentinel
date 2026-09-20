"""0001_initial_schema

Revision ID: 0001
Revises: 
Create Date: 2026-09-19 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Cases Table
    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=24), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("hindi_title", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("state", sa.String(length=64), nullable=False),
        sa.Column("district", sa.String(length=64), nullable=False),
        sa.Column("constituency", sa.String(length=64), nullable=False),
        sa.Column("mp_name", sa.String(length=80), nullable=False),
        sa.Column("dm_name", sa.String(length=80), nullable=False),
        sa.Column("sanctioned_amount_lakh", sa.Float(), nullable=False),
        sa.Column("sanctioned_date", sa.String(length=24), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("status_since", sa.String(length=32), nullable=False),
        sa.Column("overview", sa.Text(), nullable=False, server_default=""),
        sa.Column("mp_plain_status", sa.Text(), nullable=False, server_default=""),
        sa.Column("composite_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("gate_fired", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("gate_rule", sa.Text(), nullable=True),
        sa.Column("gate_detail", sa.Text(), nullable=True),
        sa.Column("gate_held_independent", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("path", sa.JSON(), nullable=False),
        sa.Column("facts", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cases_district"), "cases", ["district"], unique=False)
    op.create_index(op.f("ix_cases_status"), "cases", ["status"], unique=False)

    # 2. Module Scores Table
    op.create_table(
        "module_scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("case_id", sa.String(length=24), nullable=False),
        sa.Column("module", sa.String(length=24), nullable=False),
        sa.Column("sub_score", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("triggered", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_module_scores_case_id"), "module_scores", ["case_id"], unique=False)
    op.create_index(op.f("ix_module_scores_module"), "module_scores", ["module"], unique=False)

    # 3. Officials Table
    op.create_table(
        "officials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("role", sa.String(length=48), nullable=False, server_default="District Magistrate"),
        sa.Column("district", sa.String(length=64), nullable=False),
        sa.Column("state", sa.String(length=64), nullable=False),
        sa.Column("high_risk_decisions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("gate_overrides", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("threshold_overrides", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("flagged_note", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # 4. Ledger Entries Table
    op.create_table(
        "ledger",
        sa.Column("index", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=48), nullable=False),
        sa.Column("category", sa.String(length=24), nullable=False),
        sa.Column("actor", sa.String(length=80), nullable=False),
        sa.Column("actor_role", sa.String(length=120), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.String(length=32), nullable=False),
        sa.Column("case_id", sa.String(length=24), nullable=True),
        sa.Column("prev_hash", sa.String(length=64), nullable=False),
        sa.Column("hash", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("index"),
    )
    op.create_index(op.f("ix_ledger_category"), "ledger", ["category"], unique=False)
    op.create_index(op.f("ix_ledger_hash"), "ledger", ["hash"], unique=False)

    # 5. Overrides Table
    op.create_table(
        "overrides",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("case_id", sa.String(length=24), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("official_name", sa.String(length=80), nullable=False),
        sa.Column("official_district", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=48), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.String(length=32), nullable=False),
        sa.Column("ledger_index", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_overrides_case_id"), "overrides", ["case_id"], unique=False)

    # 6. Meta Key Table
    op.create_table(
        "meta",
        sa.Column("key", sa.String(length=96), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    # 7. Cost Baselines Table
    op.create_table(
        "cost_baselines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("district", sa.String(length=64), nullable=False),
        sa.Column("terrain", sa.String(length=32), nullable=False, server_default="plain"),
        sa.Column("mean_log_cost", sa.Float(), nullable=False),
        sa.Column("mad_log_cost", sa.Float(), nullable=False),
        sa.Column("median_lakh", sa.Float(), nullable=False),
        sa.Column("low_lakh", sa.Float(), nullable=False),
        sa.Column("high_lakh", sa.Float(), nullable=False),
        sa.Column("n_records", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cost_baselines_category"), "cost_baselines", ["category"], unique=False)
    op.create_index(op.f("ix_cost_baselines_district"), "cost_baselines", ["district"], unique=False)

    # 8. District Quarterly Table
    op.create_table(
        "district_quarterly",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("district", sa.String(length=64), nullable=False),
        sa.Column("q1", sa.Integer(), nullable=False),
        sa.Column("q2", sa.Integer(), nullable=False),
        sa.Column("q3", sa.Integer(), nullable=False),
        sa.Column("q4", sa.Integer(), nullable=False),
        sa.Column("ytd", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_district_quarterly_district"), "district_quarterly", ["district"], unique=False)

    # 9. Monthly Trend Table
    op.create_table(
        "monthly_trend",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("month", sa.String(length=8), nullable=False),
        sa.Column("district", sa.String(length=64), nullable=False),
        sa.Column("release_pct", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_monthly_trend_district"), "monthly_trend", ["district"], unique=False)
    op.create_index(op.f("ix_monthly_trend_month"), "monthly_trend", ["month"], unique=False)

    # 10. State Stats Table
    op.create_table(
        "state_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("state", sa.String(length=64), nullable=False),
        sa.Column("utilization", sa.Integer(), nullable=False),
        sa.Column("cases_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("state"),
    )

    # 11. Category Stats Table
    op.create_table(
        "category_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("sanctions_cr", sa.Float(), nullable=False),
        sa.Column("releases_cr", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category"),
    )

    # 12. MP Stats Table
    op.create_table(
        "mp_stats",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("mp_name", sa.String(length=80), nullable=False),
        sa.Column("used_cr", sa.Float(), nullable=False),
        sa.Column("breakdown", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mp_name"),
    )

    # 13. Quarantine Queue Table
    op.create_table(
        "quarantine_queue",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column("error_reason", sa.Text(), nullable=False),
        sa.Column("ingested_at", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="esakshi"),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("quarantine_queue")
    op.drop_table("mp_stats")
    op.drop_table("category_stats")
    op.drop_table("state_stats")
    op.drop_table("monthly_trend")
    op.drop_table("district_quarterly")
    op.drop_table("cost_baselines")
    op.drop_table("meta")
    op.drop_table("overrides")
    op.drop_table("ledger")
    op.drop_table("officials")
    op.drop_table("module_scores")
    op.drop_table("cases")
