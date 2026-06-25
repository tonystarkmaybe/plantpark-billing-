"""Send-a-bill-on-WhatsApp orchestration — the single entry point for callers.

RELIABILITY PRINCIPLE: sending is fully decoupled from saving the bill. The bill
is already saved before this runs. No WhatsApp failure (gateway down, session
disconnected, not eligible, disabled) may ever raise to the caller or undo the
sale. Whenever the customer's number is eligible, a wa.me link is offered as a
guaranteed fallback.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models.bill import Bill, BillItem
from app.models.customer import Customer
from app.models.shop import Shop
from app.schemas.whatsapp import SendWhatsAppResult
from app.services.whatsapp.backends import WatiClient, WaMeLinkBuilder
from app.services.whatsapp.eligibility import is_whatsapp_eligible
from app.services.whatsapp.formatter import BillLine, BillMessage, format_bill_message, compile_whatsapp_template
from app.services.whatsapp.phone import normalize_indian_phone


def _build_message(bill: Bill, items: list[BillItem], shop: Shop | None, customer: Customer | None) -> str:
    return format_bill_message(
        BillMessage(
            shop_name=shop.name if shop else None,
            created_at=bill.created_at,
            bill_type=bill.bill_type,
            items=[
                BillLine(
                    name=it.product_name,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    line_total=it.line_total,
                )
                for it in items
            ],
            subtotal=bill.subtotal,
            discount_type=bill.discount_type,
            discount_value=bill.discount_value,
            discount_amount=bill.discount_amount,
            total=bill.total,
            cash_amount=bill.cash_amount,
            upi_amount=bill.upi_amount,
            due_amount=bill.due_amount,
            customer_name=customer.name if customer else None,
            remarks=bill.remarks,
        )
    )


def _record(bill: Bill, status: str, *, sent: bool) -> None:
    """Best-effort bookkeeping of the last send outcome (never gates anything)."""
    bill.whatsapp_last_status = status
    if sent:
        bill.whatsapp_sent_at = dt.datetime.now(tz=dt.timezone.utc)


async def send_bill_whatsapp(
    db: Session,
    bill: Bill,
    shop: Shop | None,
    settings: Settings,
) -> SendWhatsAppResult:
    """Attempt to deliver `bill` to its customer on WhatsApp; never raises.

    Caller has already resolved + RLS-scoped the bill. Returns a result object
    telling the frontend exactly what to do (show "Sent ✓" or open wa.me).
    """
    # Resolve the customer (RLS-scoped) and gate on eligibility first.
    customer: Customer | None = None
    if bill.customer_id is not None:
        customer = db.execute(
            select(Customer).where(Customer.id == bill.customer_id)
        ).scalar_one_or_none()

    if not is_whatsapp_eligible(customer):
        _record(bill, "not_eligible", sent=False)
        return SendWhatsAppResult(
            status="not_eligible",
            wa_me_url=None,
            detail="No WhatsApp-eligible customer (needs a phone given for receipts and no opt-out).",
        )

    norm = normalize_indian_phone(customer.phone, settings.WHATSAPP_COUNTRY_CODE)  # type: ignore[union-attr]
    if norm is None:
        _record(bill, "not_eligible", sent=False)
        return SendWhatsAppResult(
            status="not_eligible",
            wa_me_url=None,
            detail="The customer's phone number doesn't look like a valid mobile number.",
        )

    # We have a valid, eligible number → build the message + guaranteed fallback.
    items = list(
        db.execute(select(BillItem).where(BillItem.bill_id == bill.id).order_by(BillItem.id.asc())).scalars()
    )

    # Construct the native public invoice sharing URL
    invoice_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/public/share/bill/{bill.id}"

    # Compile the WhatsApp message: use custom template if configured
    if shop is not None and shop.whatsapp_message_template:
        bill_msg = BillMessage(
            shop_name=shop.name if shop else None,
            created_at=bill.created_at,
            bill_type=bill.bill_type,
            items=[
                BillLine(
                    name=it.product_name,
                    quantity=it.quantity,
                    unit_price=it.unit_price,
                    line_total=it.line_total,
                )
                for it in items
            ],
            subtotal=bill.subtotal,
            discount_type=bill.discount_type,
            discount_value=bill.discount_value,
            discount_amount=bill.discount_amount,
            total=bill.total,
            cash_amount=bill.cash_amount,
            upi_amount=bill.upi_amount,
            due_amount=bill.due_amount,
            customer_name=customer.name if customer else None,
            remarks=bill.remarks,
            extra={"bill_id": str(bill.id)},
        )
        message = compile_whatsapp_template(shop.whatsapp_message_template, bill_msg, invoice_url)
    else:
        message = _build_message(bill, items, shop, customer)
        if invoice_url:
            message += f"\n\nDownload detailed PDF invoice here: {invoice_url}"

    wa_me_url = WaMeLinkBuilder.build(norm.wa_me, message)

    # Global kill switch → manual link only.
    if not settings.WHATSAPP_ENABLED:
        _record(bill, "disabled", sent=False)
        return SendWhatsAppResult(
            status="disabled",
            wa_me_url=wa_me_url,
            detail="WhatsApp sending is turned off. Use the link to share manually.",
        )

    # Try Wati only when configured.
    if settings.WHATSAPP_DEFAULT_BACKEND == "wati" and settings.WATI_API_KEY:
        client = WatiClient(
            settings.WATI_API_ENDPOINT,
            settings.WATI_API_KEY,
            timeout=settings.WATI_TIMEOUT_SECONDS,
        )
        if await client.send_text(norm.wa_me, message):
            _record(bill, "sent_via_wati", sent=True)
            return SendWhatsAppResult(
                status="sent_via_wati",
                wa_me_url=None,
                detail="Sent on WhatsApp.",
            )

    # Fallback: the wa.me link is always available for an eligible number.
    _record(bill, "fallback_wa_me", sent=False)
    return SendWhatsAppResult(
        status="fallback_wa_me",
        wa_me_url=wa_me_url,
        detail="Tap to send this bill on WhatsApp.",
    )
