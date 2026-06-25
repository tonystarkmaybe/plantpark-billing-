from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
import datetime as dt

# What happened when we tried to send a bill on WhatsApp.
#   sent_via_wati   — delivered through the Wati.io API.
#   fallback_wa_me  — no gateway send; a click-to-chat link is the way forward.
#   not_eligible    — no consenting, non-opted-out customer with a valid number.
#   disabled        — WhatsApp globally disabled; use the wa.me link if present.
#   failed          — unexpected problem; wa.me link offered when available.
class SendWhatsAppResult(BaseModel):
    status: str
    # Present whenever a manual click-to-chat link is the path forward.
    wa_me_url: str | None = None
    # Human-readable explanation for the UI / logs.
    detail: str


class WhatsAppStatusOut(BaseModel):
    status: str
    message_id: str | None = None
    error: str | None = None
    sent_at: dt.datetime | None = None
    last_retry_at: dt.datetime | None = None
    retry_count: int
    invoice_url: str | None = None

    model_config = {"from_attributes": True}
