from __future__ import annotations

import datetime as dt
import uuid
from typing import Annotated

from pydantic import BaseModel, StringConstraints

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class CustomerCreate(BaseModel):
    name: NonEmptyStr
    phone: str | None = None


class CustomerOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    # WhatsApp consent state so the frontend can reflect eligibility (10B).
    whatsapp_consent: bool = False
    whatsapp_opted_out: bool = False
    # True iff phone present AND consent AND not opted out (mirrors the helper).
    whatsapp_eligible: bool = False
    created_at: dt.datetime

    model_config = {"from_attributes": True}
