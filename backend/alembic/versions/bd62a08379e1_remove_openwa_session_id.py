"""remove_openwa_session_id

Revision ID: bd62a08379e1
Revises: cad259389edc
Create Date: 2026-06-24 14:38:26.807784+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd62a08379e1'
down_revision: Union[str, None] = 'cad259389edc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('shops', 'openwa_session_id')


def downgrade() -> None:
    op.add_column('shops', sa.Column('openwa_session_id', sa.TEXT(), autoincrement=False, nullable=True))
