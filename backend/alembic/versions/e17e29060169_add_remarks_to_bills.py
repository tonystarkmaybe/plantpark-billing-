"""add remarks to bills

Revision ID: e17e29060169
Revises: c0f2508ff42d
Create Date: 2026-06-23 06:33:47.710049+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e17e29060169'
down_revision: Union[str, None] = 'c0f2508ff42d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bills", sa.Column("remarks", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("bills", "remarks")
