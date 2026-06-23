from __future__ import annotations

import datetime as dt
import uuid
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.money import MoneyIn, MoneyOut

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ExpenseCreate(BaseModel):
    amount: MoneyIn = Field(..., gt=0, description="Expense amount, e.g. 150.00")
    reason: NonEmptyStr


class ExpenseUpdate(BaseModel):
    amount: MoneyIn | None = Field(default=None, gt=0, description="Expense amount, e.g. 150.00")
    reason: NonEmptyStr | None = None


class ExpenseOut(BaseModel):
    id: uuid.UUID
    shop_id: uuid.UUID
    amount: MoneyOut
    reason: str
    created_by: uuid.UUID | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}

