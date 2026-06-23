from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, EmailStr, Field


class SalespersonCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class SalespersonOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class SalespersonActivateRequest(BaseModel):
    is_active: bool


class SalespersonResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)
