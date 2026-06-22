"""End-to-end proof that Row Level Security isolates tenants.

Run AFTER `alembic upgrade head`:

    cd backend
    python -m scripts.rls_check

It connects as the limited app role (DATABASE_URL_APP) and exercises the real
RLS policies by switching the per-transaction application context — exactly the
way the API does at runtime. Product endpoints are out of scope for this prompt,
so this script writes the two products directly under the admin context; the
*reads* it asserts are what prove isolation.

Expected result:
    * shop A's owner sees ONLY shop A's product (cannot read shop B's),
    * shop B's owner sees ONLY shop B's product,
    * admin sees BOTH.
"""
from __future__ import annotations

import sys

from sqlalchemy import select, text

from app.database import SessionLocal
from app.models import Product, Shop


def _ctx_session(role: str, shop_id=None):
    """Open an app-role session with the given RLS context applied."""
    s = SessionLocal()
    s.execute(text("SELECT set_config('app.user_role', :r, true)"), {"r": role})
    if shop_id is not None:
        s.execute(
            text("SELECT set_config('app.current_shop_id', :s, true)"),
            {"s": str(shop_id)},
        )
    return s


def main() -> int:
    failures: list[str] = []

    # 1) Seed two shops + one product each, under the admin context.
    with _ctx_session("admin") as db:
        shop_a = Shop(name="RLS Test Shop A")
        shop_b = Shop(name="RLS Test Shop B")
        db.add_all([shop_a, shop_b])
        db.flush()
        prod_a = Product(shop_id=shop_a.id, name="Shop A Money Plant", retail_price=120)
        prod_b = Product(shop_id=shop_b.id, name="Shop B Snake Plant", retail_price=250)
        db.add_all([prod_a, prod_b])
        db.commit()
        a_id, b_id = shop_a.id, shop_b.id
        prod_a_id, prod_b_id = prod_a.id, prod_b.id

    try:
        # 2) Shop A owner context: must see only product A.
        with _ctx_session("shop_owner", a_id) as db:
            names = sorted(p.name for p in db.execute(select(Product)).scalars())
            if names != ["Shop A Money Plant"]:
                failures.append(f"Shop A owner saw {names}, expected only Shop A's product")
            leaked = db.execute(
                select(Product).where(Product.id == prod_b_id)
            ).scalar_one_or_none()
            if leaked is not None:
                failures.append("Shop A owner could read Shop B's product by id (LEAK!)")

        # 3) Shop B owner context: must see only product B.
        with _ctx_session("shop_owner", b_id) as db:
            names = sorted(p.name for p in db.execute(select(Product)).scalars())
            if names != ["Shop B Snake Plant"]:
                failures.append(f"Shop B owner saw {names}, expected only Shop B's product")
            leaked = db.execute(
                select(Product).where(Product.id == prod_a_id)
            ).scalar_one_or_none()
            if leaked is not None:
                failures.append("Shop B owner could read Shop A's product by id (LEAK!)")

        # 4) Admin context: must see both.
        with _ctx_session("admin") as db:
            names = sorted(p.name for p in db.execute(select(Product)).scalars())
            if not {"Shop A Money Plant", "Shop B Snake Plant"}.issubset(set(names)):
                failures.append(f"Admin saw {names}, expected to see both products")
    finally:
        # Cleanup (cascade removes products) under admin context.
        with _ctx_session("admin") as db:
            for sid in (a_id, b_id):
                shop = db.execute(select(Shop).where(Shop.id == sid)).scalar_one_or_none()
                if shop is not None:
                    db.delete(shop)
            db.commit()

    if failures:
        print("RLS CHECK FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("RLS CHECK PASSED:")
    print("  - shop A owner read only shop A's product")
    print("  - shop B owner read only shop B's product")
    print("  - admin read both products")
    return 0


if __name__ == "__main__":
    sys.exit(main())
