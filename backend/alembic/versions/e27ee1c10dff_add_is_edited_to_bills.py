"""add is_edited to bills

Revision ID: e27ee1c10dff
Revises: e17e29060169
Create Date: 2026-06-23 10:58:08.070408+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e27ee1c10dff'
down_revision: Union[str, None] = 'e17e29060169'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bills", sa.Column("is_edited", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("bills", "is_edited")
