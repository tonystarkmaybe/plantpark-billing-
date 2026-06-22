"""initial schema, RLS policies, indexes and app-role grants

Revision ID: 0001
Revises:
Create Date: 2026-06-12

Creates the full Plantora schema and the Row Level Security policies that make
tenant isolation real. Reproducible from scratch on an empty database.

Tenant isolation model
-----------------------
Tables are accessed at runtime by a NON-superuser, NON-BYPASSRLS role. RLS
policies read two transaction-local settings the application sets per request:

    current_setting('app.user_role', true)        -> 'admin' | 'shop_owner'
    current_setting('app.current_shop_id', true)  -> the owner's shop UUID

For 'admin' the policies allow every row (the platform owner reads across all
shops). Otherwise rows are restricted to the caller's shop. The second argument
`true` to current_setting means "missing_ok": it returns NULL instead of erroring
when the setting is unset, so an unauthenticated/misconfigured context simply
sees nothing.
"""
from typing import Sequence, Union

from alembic import op

from app.config import get_settings

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The limited runtime role that needs DML privileges. Read from settings (which
# loads .env) so it stays in sync with DATABASE_URL_APP. Defaults to 'plantora_app'.
APP_DB_ROLE = get_settings().APP_DB_ROLE

TENANT_TABLES = ("products", "customers", "bills", "bill_items")
ALL_RLS_TABLES = ("shops", "users", *TENANT_TABLES)


def upgrade() -> None:
    # ── Tables ────────────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE shops (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name        TEXT NOT NULL,
            owner_name  TEXT,
            owner_phone TEXT,
            is_active   BOOLEAN NOT NULL DEFAULT true,
            settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE users (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_id       UUID REFERENCES shops(id) ON DELETE CASCADE,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL CHECK (role IN ('admin','shop_owner')),
            is_active     BOOLEAN NOT NULL DEFAULT true,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT users_role_shop_consistency CHECK (
                (role = 'admin'      AND shop_id IS NULL) OR
                (role = 'shop_owner' AND shop_id IS NOT NULL)
            )
        );
        """
    )

    op.execute(
        """
        CREATE TABLE products (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            name                 TEXT NOT NULL,
            category             TEXT,
            photo_path           TEXT,
            retail_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
            last_wholesale_price NUMERIC(12,2),
            stock                INTEGER NOT NULL DEFAULT 0,
            is_active            BOOLEAN NOT NULL DEFAULT true,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE customers (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            name       TEXT NOT NULL,
            phone      TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE bills (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
            customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
            bill_type       TEXT NOT NULL CHECK (bill_type IN ('retail','wholesale')),
            subtotal        NUMERIC(12,2) NOT NULL,
            discount_type   TEXT NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
            discount_value  NUMERIC(12,2) NOT NULL DEFAULT 0,
            discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
            total           NUMERIC(12,2) NOT NULL,
            cash_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
            upi_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT bills_non_negative CHECK (
                discount_amount >= 0 AND cash_amount >= 0 AND upi_amount >= 0
                AND subtotal >= 0 AND total >= 0
            )
        );
        """
    )

    op.execute(
        """
        CREATE TABLE bill_items (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bill_id      UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
            product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
            product_name TEXT NOT NULL,
            unit_price   NUMERIC(12,2) NOT NULL,
            quantity     INTEGER NOT NULL CHECK (quantity > 0),
            line_total   NUMERIC(12,2) NOT NULL
        );
        """
    )

    # ── Indexes ───────────────────────────────────────────────────────────────
    op.execute("CREATE INDEX ix_products_shop_id ON products(shop_id);")
    op.execute("CREATE INDEX ix_customers_shop_id ON customers(shop_id);")
    op.execute("CREATE INDEX ix_bills_shop_id_created_at ON bills(shop_id, created_at);")
    op.execute("CREATE INDEX ix_bill_items_bill_id ON bill_items(bill_id);")

    # ── Enable + FORCE RLS on every tenant-bearing table ─────────────────────—
    for tbl in ALL_RLS_TABLES:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")

    # ── Policies ──────────────────────────────────────────────────────────────
    # shops: admin sees all; a shop_owner sees only their own shop row.
    op.execute(
        """
        CREATE POLICY shops_isolation ON shops
            FOR ALL
            USING (
                current_setting('app.user_role', true) = 'admin'
                OR id = current_setting('app.current_shop_id', true)::uuid
            )
            WITH CHECK (
                current_setting('app.user_role', true) = 'admin'
                OR id = current_setting('app.current_shop_id', true)::uuid
            );
        """
    )

    # users: admin sees all; a shop_owner sees only users in their own shop
    # (admins have shop_id NULL, so they remain invisible to shop owners).
    op.execute(
        """
        CREATE POLICY users_isolation ON users
            FOR ALL
            USING (
                current_setting('app.user_role', true) = 'admin'
                OR shop_id = current_setting('app.current_shop_id', true)::uuid
            )
            WITH CHECK (
                current_setting('app.user_role', true) = 'admin'
                OR shop_id = current_setting('app.current_shop_id', true)::uuid
            );
        """
    )

    # products / customers / bills: direct shop_id match.
    for tbl in ("products", "customers", "bills"):
        op.execute(
            f"""
            CREATE POLICY {tbl}_isolation ON {tbl}
                FOR ALL
                USING (
                    current_setting('app.user_role', true) = 'admin'
                    OR shop_id = current_setting('app.current_shop_id', true)::uuid
                )
                WITH CHECK (
                    current_setting('app.user_role', true) = 'admin'
                    OR shop_id = current_setting('app.current_shop_id', true)::uuid
                );
            """
        )

    # bill_items has no shop_id of its own; isolate via the parent bill's shop.
    op.execute(
        """
        CREATE POLICY bill_items_isolation ON bill_items
            FOR ALL
            USING (
                current_setting('app.user_role', true) = 'admin'
                OR EXISTS (
                    SELECT 1 FROM bills b
                    WHERE b.id = bill_items.bill_id
                      AND b.shop_id = current_setting('app.current_shop_id', true)::uuid
                )
            )
            WITH CHECK (
                current_setting('app.user_role', true) = 'admin'
                OR EXISTS (
                    SELECT 1 FROM bills b
                    WHERE b.id = bill_items.bill_id
                      AND b.shop_id = current_setting('app.current_shop_id', true)::uuid
                )
            );
        """
    )

    # ── Grants to the limited app role ────────────────────────────────────────
    # Tables are owned by the migration (admin) role. The runtime app role needs
    # explicit DML privileges; RLS then constrains which rows it may touch.
    role = f'"{APP_DB_ROLE}"'
    op.execute(f"GRANT USAGE ON SCHEMA public TO {role};")
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {role};"
    )


def downgrade() -> None:
    role = f'"{APP_DB_ROLE}"'
    op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {role};")

    # Drop in dependency order (children first).
    for tbl in ("bill_items", "bills", "customers", "products", "users", "shops"):
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")
