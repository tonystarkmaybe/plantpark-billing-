from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

# What happened when we tried to send a bill on WhatsApp.
#   sent_via_openwa — delivered through the shop's OpenWA session.
#   fallback_wa_me  — no gateway send; a click-to-chat link is the way forward.
#   not_eligible    — no consenting, non-opted-out customer with a valid number.
#   disabled        — WhatsApp globally disabled; use the wa.me link if present.
#   failed          — unexpected problem; wa.me link offered when available.
SendStatus = Literal[
    "sent_via_openwa",
    "fallback_wa_me",
    "not_eligible",
    "disabled",
    "failed",
]


class SendWhatsAppResult(BaseModel):
    status: SendStatus
    # Present whenever a manual click-to-chat link is the path forward.
    wa_me_url: str | None = None
    # Human-readable explanation for the UI / logs.
    detail: str
