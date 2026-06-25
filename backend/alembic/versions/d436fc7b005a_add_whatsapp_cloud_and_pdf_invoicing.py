"""add_whatsapp_cloud_and_pdf_invoicing

Revision ID: d436fc7b005a
Revises: bd62a08379e1
Create Date: 2026-06-25 02:45:15.387007+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd436fc7b005a'
down_revision: Union[str, None] = 'bd62a08379e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bills", sa.Column("invoice_url", sa.Text(), nullable=True))
    op.add_column("bills", sa.Column("whatsapp_status", sa.Text(), nullable=False, server_default=sa.text("'none'")))
    op.add_column("bills", sa.Column("whatsapp_message_id", sa.Text(), nullable=True))
    op.add_column("bills", sa.Column("whatsapp_error", sa.Text(), nullable=True))
    op.add_column("bills", sa.Column("retry_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("bills", sa.Column("last_retry_at", sa.DateTime(timezone=True), nullable=True))
    
    op.create_index("ix_bills_whatsapp_message_id", "bills", ["whatsapp_message_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bills_whatsapp_message_id", table_name="bills")
    op.drop_column("bills", "last_retry_at")
    op.drop_column("bills", "retry_count")
    op.drop_column("bills", "whatsapp_error")
    op.drop_column("bills", "whatsapp_message_id")
    op.drop_column("bills", "whatsapp_status")
    op.drop_column("bills", "invoice_url")
