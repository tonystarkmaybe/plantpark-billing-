"""Phone-number normalization for WhatsApp / OpenWA.

Produces the two forms callers need from a single, validated result:
  * chat_id — OpenWA's "<countrycode><number>@c.us" (e.g. "919876543210@c.us")
  * wa_me   — international number without '+' (e.g. "919876543210") for wa.me

Invalid / implausible numbers return None so callers can refuse clearly rather
than send to a malformed address.
"""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class NormalizedPhone:
    digits: str  # full international, digits only: "919876543210"
    chat_id: str  # OpenWA chatId: "919876543210@c.us"
    wa_me: str  # wa.me number (== digits): "919876543210"


def normalize_indian_phone(raw: str | None, country_code: str = "91") -> NormalizedPhone | None:
    """Normalize a (possibly messy) Indian mobile number.

    Accepts inputs like "+91 98765 43210", "098765-43210", "9876543210",
    "919876543210". Strips spaces, '+', '-', and leading domestic/international
    zeros. Validates a 10-digit national part beginning 6–9 (Indian mobile).
    Returns None for anything that doesn't look like a real mobile number.
    """
    if not raw:
        return None

    digits = re.sub(r"\D", "", raw)
    digits = digits.lstrip("0")  # drop 0 (domestic) / 00 (intl) prefixes
    if not digits:
        return None

    cc = re.sub(r"\D", "", country_code) or "91"

    if digits.startswith(cc) and len(digits) == len(cc) + 10:
        national = digits[len(cc):]
    elif len(digits) == 10:
        national = digits
    else:
        return None

    if national[0] not in "6789":
        return None

    full = cc + national
    return NormalizedPhone(digits=full, chat_id=f"{full}@c.us", wa_me=full)
