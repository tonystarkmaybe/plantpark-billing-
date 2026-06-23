"""add due_amount to bills

Revision ID: c0f2508ff42d
Revises: 3d15831eb736
Create Date: 2026-06-23 06:11:32.261104+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0f2508ff42d'
down_revision: Union[str, None] = '3d15831eb736'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Add column due_amount
    op.add_column(
        "bills",
        sa.Column("due_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0")
    )
    # 2) Drop old check constraint and add updated check constraint
    op.drop_constraint("bills_non_negative", "bills", type_="check")
    op.create_check_constraint(
        "bills_non_negative",
        "bills",
        "discount_amount >= 0 AND cash_amount >= 0 AND upi_amount >= 0 AND due_amount >= 0 AND subtotal >= 0 AND total >= 0"
    )


def downgrade() -> None:
    # Drop constraint and add old check constraint
    op.drop_constraint("bills_non_negative", "bills", type_="check")
    op.create_check_constraint(
        "bills_non_negative",
        "bills",
        "discount_amount >= 0 AND cash_amount >= 0 AND upi_amount >= 0 AND subtotal >= 0 AND total >= 0"
    )
    # Remove column due_amount
    op.drop_column("bills", "due_amount")
