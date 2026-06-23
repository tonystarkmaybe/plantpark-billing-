"""Pydantic request/response schemas for product management.

Money is NUMERIC(12,2) in the DB and is returned in API responses as strings
with exactly 2 decimals (e.g. "120.00"), consistent with the project-wide money
convention. Inbound money accepts up to 12 digits / 2 decimal places and must be
>= 0.
"""
from __future__ import annotations

import datetime as dt
import decimal
import uuid
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_serializer

# Inbound money: non-negative, NUMERIC(12,2)-compatible.
MoneyIn = Annotated[decimal.Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ProductCreate(BaseModel):
    name: NonEmptyStr
    category: str | None = None
    retail_price: MoneyIn
    last_wholesale_price: MoneyIn | None = None


class ProductUpdate(BaseModel):
    """Partial update. Only fields explicitly present are applied.

    `last_wholesale_price` may be explicitly set to null to clear it; `name`
    and `retail_price` are non-nullable and rejected if sent as null (enforced
    in the router, which inspects the set fields).
    """

    name: NonEmptyStr | None = None
    category: str | None = None
    retail_price: MoneyIn | None = None
    last_wholesale_price: MoneyIn | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None
    retail_price: decimal.Decimal
    last_wholesale_price: decimal.Decimal | None
    # Full URL usable directly in an <img src>; null when there is no image.
    photo_url: str | None
    is_active: bool
    created_at: dt.datetime

    @field_serializer("retail_price")
    def _ser_retail(self, v: decimal.Decimal) -> str:
        return f"{v:.2f}"

    @field_serializer("last_wholesale_price")
    def _ser_wholesale(self, v: decimal.Decimal | None) -> str | None:
        return f"{v:.2f}" if v is not None else None


class ProductDeleteResponse(BaseModel):
    id: uuid.UUID
    hard_deleted: bool
    detail: str


class BulkDeleteRequest(BaseModel):
    product_ids: list[uuid.UUID]


class BulkDeleteResponse(BaseModel):
    detail: str
    hard_deleted: int
    soft_deleted: int


class BulkPhotosResponse(BaseModel):
    detail: str
    matched: int
    errors: list[str]


