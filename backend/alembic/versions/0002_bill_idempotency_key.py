"""add idempotency_key to bills for safe checkout retries

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-12

Adds a nullable ``idempotency_key`` to ``bills`` plus a per-shop unique index, so
POST /bills can be made idempotent: a retry or double-tap carrying the same key
returns the original bill instead of creating a duplicate.

The unique index is on (shop_id, idempotency_key); multiple NULLs are allowed by
default, so historical/legacy rows without a key never conflict.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE bills ADD COLUMN idempotency_key TEXT;")
    op.execute(
        "CREATE UNIQUE INDEX ix_bills_shop_idempotency "
        "ON bills(shop_id, idempotency_key);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_bills_shop_idempotency;")
    op.execute("ALTER TABLE bills DROP COLUMN IF EXISTS idempotency_key;")
