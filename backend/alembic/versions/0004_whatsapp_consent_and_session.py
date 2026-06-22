"""WhatsApp delivery: customer consent/opt-out, shop OpenWA session, bill send status.

Adds the consent model (providing a phone for receipts = consent), a permanent
opt-out flag, the per-shop OpenWA session id, and optional last-send bookkeeping
on bills. None of these gate the saved sale — sending is fully decoupled.
"""
from __future__ import annotations

from typing import Union

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # customers: consent + opt-out
    op.execute(
        "ALTER TABLE customers "
        "ADD COLUMN whatsapp_consent BOOLEAN NOT NULL DEFAULT false, "
        "ADD COLUMN whatsapp_consent_at TIMESTAMPTZ NULL, "
        "ADD COLUMN whatsapp_opted_out BOOLEAN NOT NULL DEFAULT false, "
        "ADD COLUMN whatsapp_opted_out_at TIMESTAMPTZ NULL;"
    )
    # Existing customers that already have a phone gave it for receipts → consent.
    # Tables FORCE row level security, and the policies grant full visibility only
    # to the 'admin' role context. Migrations run as the table owner WITHOUT that
    # GUC set, so without this the UPDATE would match zero rows. Assert the admin
    # context (transaction-local) so the backfill actually sees every shop's rows.
    op.execute("SELECT set_config('app.user_role', 'admin', true);")
    op.execute(
        "UPDATE customers "
        "SET whatsapp_consent = true, whatsapp_consent_at = now() "
        "WHERE phone IS NOT NULL AND btrim(phone) <> '';"
    )

    # shops: one OpenWA session per shop (NULL until connected in 10B).
    op.execute("ALTER TABLE shops ADD COLUMN openwa_session_id TEXT NULL;")

    # bills: last WhatsApp send bookkeeping (debugging/admin; never blocks).
    op.execute(
        "ALTER TABLE bills "
        "ADD COLUMN whatsapp_last_status TEXT NULL, "
        "ADD COLUMN whatsapp_sent_at TIMESTAMPTZ NULL;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE bills "
        "DROP COLUMN IF EXISTS whatsapp_sent_at, "
        "DROP COLUMN IF EXISTS whatsapp_last_status;"
    )
    op.execute("ALTER TABLE shops DROP COLUMN IF EXISTS openwa_session_id;")
    op.execute(
        "ALTER TABLE customers "
        "DROP COLUMN IF EXISTS whatsapp_opted_out_at, "
        "DROP COLUMN IF EXISTS whatsapp_opted_out, "
        "DROP COLUMN IF EXISTS whatsapp_consent_at, "
        "DROP COLUMN IF EXISTS whatsapp_consent;"
    )
