"""Receipt formatting and custom text template compilation for WhatsApp messages."""
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
    due_amount: Decimal = Decimal("0")
    customer_name: str | None = None
    remarks: str | None = None
    extra: dict = field(default_factory=dict)


def _inr(amount: Decimal) -> str:
    """Format money with Indian digit grouping, e.g. Rs. 1,23,456.00."""
    q = amount.quantize(Decimal("0.01"))
    negative = q < 0
    s = f"{abs(q):.2f}"
    intpart, dec = s.split(".")
    if len(intpart) > 3:
        last3 = intpart[-3:]
        rest = intpart[:-3]
        rest = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", rest)
        intpart = f"{rest},{last3}"
    return f"{'-' if negative else ''}Rs. {intpart}.{dec}"


def _payment_line(cash: Decimal, upi: Decimal, due: Decimal) -> str:
    parts = []
    if cash > 0:
        parts.append(f"Cash {_inr(cash)}")
    if upi > 0:
        parts.append(f"UPI {_inr(upi)}")
    if due > 0:
        parts.append(f"Due {_inr(due)}")

    if not parts:
        return f"Paid: Cash {_inr(cash)}"

    if due > 0 and cash == 0 and upi == 0:
        return f"Payment: Due {_inr(due)}"

    suffix = " (Split)" if len(parts) > 1 else ""
    return "Paid: " + " + ".join(parts) + suffix


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
            pct = bill.discount_value.normalize()
            pct_str = format(pct, "f")
            lines.append(f"Discount ({pct_str}%): -{_inr(bill.discount_amount)}")
        else:
            lines.append(f"Discount: -{_inr(bill.discount_amount)}")
    lines.append(f"Total: {_inr(bill.total)}")
    lines.append("")

    lines.append(_payment_line(bill.cash_amount, bill.upi_amount, bill.due_amount))
    if bill.remarks:
        lines.append("")
        lines.append(f"Remarks: {bill.remarks}")
    lines.append("")
    lines.append(f"Thank you for shopping with {shop}! 🌿")

    return "\n".join(lines)


def compile_whatsapp_template(template_str: str, bill: BillMessage, invoice_url_str: str | None = None) -> str:
    """Format a custom user template with bill values."""
    item_lines = []
    for it in bill.items:
        item_lines.append(f"{it.name} ({it.quantity} × {_inr(it.unit_price)}) = {_inr(it.line_total)}")
    items_str = "\n".join(item_lines)

    cust_name = bill.customer_name or "Valued Customer"
    shop = bill.shop_name or "Nursery"
    bill_id = bill.extra.get("bill_id") or ""
    if bill_id and "-" in bill_id:
        bill_id = bill_id.split("-")[0].upper()

    invoice_url = invoice_url_str or "Link not available"

    replacements = {
        "{{customer_name}}": cust_name,
        "{{shop_name}}": shop,
        "{{bill_total}}": _inr(bill.total),
        "{{cash_amount}}": _inr(bill.cash_amount),
        "{{upi_amount}}": _inr(bill.upi_amount),
        "{{due_amount}}": _inr(bill.due_amount),
        "{{bill_id}}": bill_id,
        "{{items}}": items_str,
        "{{invoice_url}}": invoice_url,
        "{{invoice_ninja_url}}": invoice_url,
    }

    res = template_str
    for placeholder, val in replacements.items():
        res = res.replace(placeholder, val)
    return res
