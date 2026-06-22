"""Idempotently create the bootstrap admin user.

Reads BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD from the environment.
Run this once after migrations:

    python -m app.scripts.create_admin

If an admin with that email already exists, the script does nothing. Runs under
the privileged (admin) RLS context so it may write to the users table.
"""
from __future__ import annotations

from sqlalchemy import select

from app.auth.security import hash_password
from app.config import get_settings
from app.database import privileged_session
from app.models.user import ROLE_ADMIN, User


def main() -> None:
    settings = get_settings()
    email = str(settings.BOOTSTRAP_ADMIN_EMAIL)

    with privileged_session() as db:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            print(f"[create_admin] Admin '{email}' already exists (id={existing.id}); nothing to do.")
            return

        admin = User(
            shop_id=None,
            email=email,
            password_hash=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
            role=ROLE_ADMIN,
        )
        db.add(admin)
        db.flush()
        print(f"[create_admin] Created bootstrap admin '{email}' (id={admin.id}).")


if __name__ == "__main__":
    main()
