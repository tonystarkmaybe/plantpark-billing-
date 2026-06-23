from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, EmailStr, Field


class ShopCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_email: EmailStr
    owner_password: str = Field(min_length=8)


class OwnerInfo(BaseModel):
    """Owner user info — never includes the password or its hash."""

    id: uuid.UUID
    email: EmailStr
    role: str
    shop_id: uuid.UUID | None
    is_active: bool

    model_config = {"from_attributes": True}


class ShopSummary(BaseModel):
    id: uuid.UUID
    name: str
    owner_name: str | None
    owner_phone: str | None
    is_active: bool
    created_at: dt.datetime
    whatsapp_auto_send: bool
    business_name: str | None = None
    business_address: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_upi: str | None = None

    model_config = {"from_attributes": True}


class ShopCreateResponse(BaseModel):
    shop: ShopSummary
    owner: OwnerInfo


class ShopListRow(BaseModel):
    """A shop row for the admin dashboard, including the owner's login email."""

    id: uuid.UUID
    name: str
    owner_name: str | None
    owner_phone: str | None
    owner_email: EmailStr | None
    is_active: bool
    created_at: dt.datetime
    whatsapp_auto_send: bool
    business_name: str | None = None
    business_address: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_upi: str | None = None


class ShopUpdateRequest(BaseModel):
    is_active: bool | None = None
    whatsapp_auto_send: bool | None = None
    business_name: str | None = None
    business_address: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_upi: str | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class AdminCustomerRow(BaseModel):
    """A customer in the cross-shop directory, tagged with its owning shop."""

    id: uuid.UUID
    name: str
    phone: str | None
    shop_id: uuid.UUID
    shop_name: str
    created_at: dt.datetime


class AdminCustomerList(BaseModel):
    items: list[AdminCustomerRow]
    total: int
    limit: int
    offset: int
