"""add business details to shops

Revision ID: d708e032b301
Revises: e27ee1c10dff
Create Date: 2026-06-23 11:12:01.055859+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd708e032b301'
down_revision: Union[str, None] = 'e27ee1c10dff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shops", sa.Column("business_name", sa.Text(), nullable=True))
    op.add_column("shops", sa.Column("business_address", sa.Text(), nullable=True))
    op.add_column("shops", sa.Column("business_phone", sa.Text(), nullable=True))
    op.add_column("shops", sa.Column("business_email", sa.Text(), nullable=True))
    op.add_column("shops", sa.Column("business_upi", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("shops", "business_name")
    op.drop_column("shops", "business_address")
    op.drop_column("shops", "business_phone")
    op.drop_column("shops", "business_email")
    op.drop_column("shops", "business_upi")
