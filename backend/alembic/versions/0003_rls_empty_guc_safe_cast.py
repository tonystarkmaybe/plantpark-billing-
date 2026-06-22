"""Make RLS shop_id casts safe when the GUC is an empty string.

PostgreSQL custom GUCs ("placeholders" like app.current_shop_id) behave
surprisingly with transaction-local set_config: once the GUC has been set on a
connection and the transaction commits, current_setting('app.current_shop_id',
true) returns '' (empty string) rather than NULL. Because connections are
pooled, a later request (e.g. login, which runs under the admin context and does
NOT set a shop id) can land on such a connection. The policy expression

    ... OR shop_id = current_setting('app.current_shop_id', true)::uuid

then evaluates ''::uuid and raises "invalid input syntax for type uuid". The OR
with the admin check does not reliably short-circuit this cast during planning,
so even admin/login queries can fail intermittently.

Fix: coerce '' -> NULL before the cast with NULLIF(...). A NULL shop id compares
as NULL (never matches a row), which is the correct, safe behaviour for an
absent tenant context. This is purely a hardening of existing policies; the
isolation semantics are unchanged.
"""
from __future__ import annotations

from typing import Union

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels = None
depends_on = None

# Safe expression: empty-string GUC becomes NULL instead of a failing cast.
_SHOP = "NULLIF(current_setting('app.current_shop_id', true), '')::uuid"
# Original (unsafe) expression, restored on downgrade.
_SHOP_OLD = "current_setting('app.current_shop_id', true)::uuid"
_ROLE = "current_setting('app.user_role', true) = 'admin'"


def _recreate(shop_expr: str) -> None:
    op.execute("DROP POLICY IF EXISTS shops_isolation ON shops;")
    op.execute(
        f"""
        CREATE POLICY shops_isolation ON shops
            FOR ALL
            USING ({_ROLE} OR id = {shop_expr})
            WITH CHECK ({_ROLE} OR id = {shop_expr});
        """
    )

    op.execute("DROP POLICY IF EXISTS users_isolation ON users;")
    op.execute(
        f"""
        CREATE POLICY users_isolation ON users
            FOR ALL
            USING ({_ROLE} OR shop_id = {shop_expr})
            WITH CHECK ({_ROLE} OR shop_id = {shop_expr});
        """
    )

    for tbl in ("products", "customers", "bills"):
        op.execute(f"DROP POLICY IF EXISTS {tbl}_isolation ON {tbl};")
        op.execute(
            f"""
            CREATE POLICY {tbl}_isolation ON {tbl}
                FOR ALL
                USING ({_ROLE} OR shop_id = {shop_expr})
                WITH CHECK ({_ROLE} OR shop_id = {shop_expr});
            """
        )

    op.execute("DROP POLICY IF EXISTS bill_items_isolation ON bill_items;")
    op.execute(
        f"""
        CREATE POLICY bill_items_isolation ON bill_items
            FOR ALL
            USING (
                {_ROLE}
                OR EXISTS (
                    SELECT 1 FROM bills b
                    WHERE b.id = bill_items.bill_id
                      AND b.shop_id = {shop_expr}
                )
            )
            WITH CHECK (
                {_ROLE}
                OR EXISTS (
                    SELECT 1 FROM bills b
                    WHERE b.id = bill_items.bill_id
                      AND b.shop_id = {shop_expr}
                )
            );
        """
    )


def upgrade() -> None:
    _recreate(_SHOP)


def downgrade() -> None:
    _recreate(_SHOP_OLD)
