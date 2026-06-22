"""Password hashing and JWT creation/decoding.

Passwords are hashed with bcrypt via passlib. Plaintext is never stored or
logged. JWT access tokens carry: sub (user id), role, shop_id, exp.
"""
from __future__ import annotations

import datetime as dt
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.schemas.auth import TokenData

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, password_hash: str) -> bool:
    return _pwd_context.verify(plain, password_hash)


def create_access_token(*, user_id: uuid.UUID, role: str, shop_id: uuid.UUID | None) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    claims = {
        "sub": str(user_id),
        "role": role,
        "shop_id": str(shop_id) if shop_id is not None else None,
        "exp": expire,
    }
    return jwt.encode(claims, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> TokenData:
    """Decode and validate a JWT, returning typed claims.

    Raises JWTError (or ValueError on malformed claims) for any invalid token.
    """
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    sub = payload.get("sub")
    role = payload.get("role")
    raw_shop = payload.get("shop_id")
    if sub is None or role is None:
        raise JWTError("token missing required claims")
    return TokenData(
        user_id=uuid.UUID(sub),
        role=role,
        shop_id=uuid.UUID(raw_shop) if raw_shop else None,
    )
