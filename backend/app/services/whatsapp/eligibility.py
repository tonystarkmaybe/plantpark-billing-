"""Single source of truth for WhatsApp eligibility and consent stamping."""
from __future__ import annotations

import datetime as dt

from app.models.customer import Customer


def is_whatsapp_eligible(customer: Customer | None) -> bool:
    """A customer is eligible IFF they have a phone, have consented, and have
    NOT opted out. Opt-out always wins. This is the only place the rule lives."""
    if customer is None:
        return False
    if not (customer.phone and customer.phone.strip()):
        return False
    if customer.whatsapp_opted_out:
        return False
    return bool(customer.whatsapp_consent)


def apply_phone_consent(customer: Customer, phone: str | None, *, now: dt.datetime | None = None) -> None:
    """Set the customer's phone and record consent when a phone is provided.

    Providing a phone number for receipts IS the consent. Consent is stamped the
    first time it becomes true and carries forward (never re-asked, never auto-
    revoked). Opt-out is independent and is never changed here.
    """
    customer.phone = phone
    if phone and phone.strip() and not customer.whatsapp_consent:
        customer.whatsapp_consent = True
        customer.whatsapp_consent_at = now or dt.datetime.now(tz=dt.timezone.utc)
