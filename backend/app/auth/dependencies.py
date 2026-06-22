"""FastAPI auth dependencies.

Chain:
    get_token_data   -> decode & validate the bearer JWT (no DB)
    get_db           -> open a session whose transaction has the RLS context
                        derived from the token's (role, shop_id)
    get_current_user -> load the user under RLS, reject inactive user/shop
    require_admin / require_shop_owner -> role guards
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_rls_session
from app.auth.security import decode_access_token
from app.models.shop import Shop
from app.models.user import ROLE_ADMIN, ROLE_SHOP_OWNER, User
from app.schemas.auth import TokenData

_bearer = HTTPBearer(auto_error=True)

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_token_data(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> TokenData:
    try:
        return decode_access_token(creds.credentials)
    except (JWTError, ValueError):
        raise _credentials_exc


def get_db(token: TokenData = Depends(get_token_data)) -> Session:
    """Standard authenticated DB session with RLS context applied.

    Yielded from a generator so the request transaction is committed on success
    and rolled back on error.
    """
    shop_id = str(token.shop_id) if token.shop_id is not None else None
    yield from get_rls_session(role=token.role, shop_id=shop_id)


def get_current_user(
    token: TokenData = Depends(get_token_data),
    db: Session = Depends(get_db),
) -> User:
    user = db.execute(select(User).where(User.id == token.user_id)).scalar_one_or_none()
    if user is None or not user.is_active:
        raise _credentials_exc

    # Reject shop owners whose shop has been deactivated.
    if user.role == ROLE_SHOP_OWNER:
        shop = db.execute(select(Shop).where(Shop.id == user.shop_id)).scalar_one_or_none()
        if shop is None or not shop.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Shop is inactive",
            )
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user


def require_shop_owner(user: User = Depends(get_current_user)) -> User:
    if user.role != ROLE_SHOP_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Shop owner privileges required",
        )
    return user
