"""add_salesperson_role

Revision ID: 3d15831eb736
Revises: 0004
Create Date: 2026-06-23 05:15:39.146666+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d15831eb736'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing constraints
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_shop_consistency;")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
    
    # Recreate constraints including the salesperson role
    op.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'shop_owner', 'salesperson'));")
    op.execute("""
        ALTER TABLE users ADD CONSTRAINT users_role_shop_consistency CHECK (
            (role = 'admin' AND shop_id IS NULL) OR
            (role IN ('shop_owner', 'salesperson') AND shop_id IS NOT NULL)
        );
    """)


def downgrade() -> None:
    # Drop new constraints
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_shop_consistency;")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
    
    # Recreate original constraints
    op.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'shop_owner'));")
    op.execute("""
        ALTER TABLE users ADD CONSTRAINT users_role_shop_consistency CHECK (
            (role = 'admin' AND shop_id IS NULL) OR
            (role = 'shop_owner' AND shop_id IS NOT NULL)
        );
    """)
