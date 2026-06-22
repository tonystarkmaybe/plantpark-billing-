from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded JWT claims used to build the per-request RLS context."""

    user_id: uuid.UUID
    role: str
    shop_id: uuid.UUID | None = None


class CurrentUser(BaseModel):
    """Public view of the authenticated user (returned by /auth/me)."""

    id: uuid.UUID
    email: EmailStr
    role: str
    shop_id: uuid.UUID | None = None
    is_active: bool

    model_config = {"from_attributes": True}
