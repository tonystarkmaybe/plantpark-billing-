"""create_expenses_table

Revision ID: cad259389edc
Revises: d708e032b301
Create Date: 2026-06-23 16:58:55.333059+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = 'cad259389edc'
down_revision: Union[str, None] = 'd708e032b301'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

APP_DB_ROLE = get_settings().APP_DB_ROLE
_SHOP = "NULLIF(current_setting('app.current_shop_id', true), '')::uuid"
_ROLE = "current_setting('app.user_role', true) = 'admin'"


def upgrade() -> None:
    # 1. Create table
    op.execute(
        """
        CREATE TABLE expenses (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            amount     NUMERIC(12,2) NOT NULL,
            reason     TEXT NOT NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT expenses_amount_positive CHECK (amount > 0)
        );
        """
    )

    # 2. Indexes
    op.execute("CREATE INDEX ix_expenses_shop_id_created_at ON expenses(shop_id, created_at);")

    # 3. Enable + FORCE RLS
    op.execute("ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE expenses FORCE ROW LEVEL SECURITY;")

    # 4. RLS Policy
    op.execute(
        f"""
        CREATE POLICY expenses_isolation ON expenses
            FOR ALL
            USING ({_ROLE} OR shop_id = {_SHOP})
            WITH CHECK ({_ROLE} OR shop_id = {_SHOP});
        """
    )

    # 5. Grant permissions to limited runtime role
    role = f'"{APP_DB_ROLE}"'
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO {role};"
    )


def downgrade() -> None:
    role = f'"{APP_DB_ROLE}"'
    op.execute(f"REVOKE ALL ON expenses FROM {role};")
    op.execute("DROP TABLE IF EXISTS expenses CASCADE;")
