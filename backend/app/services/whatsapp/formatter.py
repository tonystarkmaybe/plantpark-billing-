"""Bill → WhatsApp message formatter.

Pure functions over plain data (no DB, no network) so this is trivially unit
tested. The output reads like a real shop receipt — not a marketing blast — and
is used verbatim by both the wa.me link (URL-encoded) and the OpenWA send body.
"""
from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass, field
from decimal import Decimal
from zoneinfo import ZoneInfo

SHOP_TZ = ZoneInfo("Asia/Kolkata")


@dataclass(frozen=True)
class BillLine:
    name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class BillMessage:
    shop_name: str | None
    created_at: dt.datetime  # tz-aware (UTC); rendered in shop time
    bill_type: str  # "retail" | "wholesale"
    items: list[BillLine]
    subtotal: Decimal
    discount_type: str  # "flat" | "percent"
    discount_value: Decimal
    discount_amount: Decimal
    total: Decimal
    cash_amount: Decimal
    upi_amount: Decimal
    customer_name: str | None = None
    extra: dict = field(default_factory=dict)


def _inr(amount: Decimal) -> str:
    """Format money with Indian digit grouping, e.g. ₹1,23,456.00."""
    q = amount.quantize(Decimal("0.01"))
    negative = q < 0
    s = f"{abs(q):.2f}"
    intpart, dec = s.split(".")
    if len(intpart) > 3:
        last3 = intpart[-3:]
        rest = intpart[:-3]
        # Insert a comma every two digits in the remaining (left) portion.
        rest = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", rest)
        intpart = f"{rest},{last3}"
    return f"{'-' if negative else ''}₹{intpart}.{dec}"


def _payment_line(cash: Decimal, upi: Decimal) -> str:
    has_cash = cash > 0
    has_upi = upi > 0
    if has_cash and has_upi:
        return f"Paid: Cash {_inr(cash)} + UPI {_inr(upi)} (Split)"
    if has_upi:
        return f"Paid: UPI {_inr(upi)}"
    # Default / cash-only (also covers a ₹0 bill).
    return f"Paid: Cash {_inr(cash)}"


def format_bill_message(bill: BillMessage) -> str:
    """Render a clean, human, receipt-style WhatsApp message."""
    when = bill.created_at.astimezone(SHOP_TZ).strftime("%d %b %Y, %I:%M %p")
    shop = bill.shop_name or "Your shop"

    lines: list[str] = []
    lines.append(f"🪴 {shop}")
    lines.append("")
    greeting = f"Hello {bill.customer_name}, here's your bill." if bill.customer_name else "Here's your bill."
    lines.append(greeting)
    lines.append(when)
    if bill.bill_type == "wholesale":
        lines.append("(Wholesale)")
    lines.append("")

    for it in bill.items:
        lines.append(it.name)
        lines.append(f"  {_inr(it.unit_price)} × {it.quantity} = {_inr(it.line_total)}")
    lines.append("")

    lines.append(f"Subtotal: {_inr(bill.subtotal)}")
    if bill.discount_amount > 0:
        if bill.discount_type == "percent":
            # Trim a trailing ".00" from whole-number percentages for readability.
            pct = bill.discount_value.normalize()
            pct_str = format(pct, "f")
            lines.append(f"Discount ({pct_str}%): -{_inr(bill.discount_amount)}")
        else:
            lines.append(f"Discount: -{_inr(bill.discount_amount)}")
    lines.append(f"Total: {_inr(bill.total)}")
    lines.append("")

    lines.append(_payment_line(bill.cash_amount, bill.upi_amount))
    lines.append("")
    lines.append(f"Thank you for shopping with {shop}! 🌿")

    return "\n".join(lines)
