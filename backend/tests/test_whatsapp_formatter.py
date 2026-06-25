"""Unit tests for the bill → WhatsApp message formatter (no DB, no network)."""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from app.services.whatsapp.templates import BillLine, BillMessage, format_bill_message, compile_whatsapp_template

# A fixed instant: 2026-06-13 17:28 UTC == 2026-06-13 10:58 PM IST.
WHEN = dt.datetime(2026, 6, 13, 17, 28, tzinfo=dt.timezone.utc)


def _money(s: str) -> Decimal:
    return Decimal(s)


def test_retail_cash_no_discount():
    msg = format_bill_message(
        BillMessage(
            shop_name="Green Leaf Nursery",
            created_at=WHEN,
            bill_type="retail",
            items=[BillLine("Money Plant", 2, _money("120.00"), _money("240.00"))],
            subtotal=_money("240.00"),
            discount_type="flat",
            discount_value=_money("0.00"),
            discount_amount=_money("0.00"),
            total=_money("240.00"),
            cash_amount=_money("240.00"),
            upi_amount=_money("0.00"),
            customer_name="Sita",
        )
    )
    assert "🪴 Green Leaf Nursery" in msg
    assert "Hello Sita, here's your bill." in msg
    assert "13 Jun 2026, 10:58 PM" in msg
    assert "Money Plant" in msg
    assert "Rs. 120.00 × 2 = Rs. 240.00" in msg
    assert "Subtotal: Rs. 240.00" in msg
    assert "Discount" not in msg  # no discount line when zero
    assert "Total: Rs. 240.00" in msg
    assert "Paid: Cash Rs. 240.00" in msg
    assert "Thank you for shopping with Green Leaf Nursery!" in msg


def test_percent_discount_and_split_payment():
    msg = format_bill_message(
        BillMessage(
            shop_name="Green Leaf Nursery",
            created_at=WHEN,
            bill_type="retail",
            items=[BillLine("Money Plant", 2, _money("120.00"), _money("240.00"))],
            subtotal=_money("240.00"),
            discount_type="percent",
            discount_value=_money("10.00"),
            discount_amount=_money("24.00"),
            total=_money("216.00"),
            cash_amount=_money("100.00"),
            upi_amount=_money("116.00"),
            customer_name="Sita",
        )
    )
    assert "Discount (10%): -Rs. 24.00" in msg
    assert "Total: Rs. 216.00" in msg
    assert "Paid: Cash Rs. 100.00 + UPI Rs. 116.00 (Split)" in msg


def test_wholesale_upi_only_and_indian_grouping_no_customer():
    msg = format_bill_message(
        BillMessage(
            shop_name="City Plant Bazaar",
            created_at=WHEN,
            bill_type="wholesale",
            items=[BillLine("Areca Palm", 50, _money("450.00"), _money("22500.00"))],
            subtotal=_money("22500.00"),
            discount_type="flat",
            discount_value=_money("500.00"),
            discount_amount=_money("500.00"),
            total=_money("22000.00"),
            cash_amount=_money("0.00"),
            upi_amount=_money("22000.00"),
            customer_name=None,
        )
    )
    assert "(Wholesale)" in msg
    assert "Here's your bill." in msg  # generic greeting without a name
    assert "Discount: -Rs. 500.00" in msg
    assert "Total: Rs. 22,000.00" in msg  # Indian digit grouping
    assert "Paid: UPI Rs. 22,000.00" in msg


def test_due_payment_formatting():
    msg = format_bill_message(
        BillMessage(
            shop_name="Green Leaf Nursery",
            created_at=WHEN,
            bill_type="retail",
            items=[BillLine("Money Plant", 2, _money("120.00"), _money("240.00"))],
            subtotal=_money("240.00"),
            discount_type="flat",
            discount_value=_money("0.00"),
            discount_amount=_money("0.00"),
            total=_money("240.00"),
            cash_amount=_money("0.00"),
            upi_amount=_money("0.00"),
            due_amount=_money("240.00"),
            customer_name="Sita",
        )
    )
    assert "Total: Rs. 240.00" in msg
    assert "Payment: Due Rs. 240.00" in msg


def test_split_due_payment_formatting():
    msg = format_bill_message(
        BillMessage(
            shop_name="Green Leaf Nursery",
            created_at=WHEN,
            bill_type="retail",
            items=[BillLine("Money Plant", 2, _money("120.00"), _money("240.00"))],
            subtotal=_money("240.00"),
            discount_type="flat",
            discount_value=_money("0.00"),
            discount_amount=_money("0.00"),
            total=_money("240.00"),
            cash_amount=_money("100.00"),
            upi_amount=_money("50.00"),
            due_amount=_money("90.00"),
            customer_name="Sita",
        )
    )
    assert "Total: Rs. 240.00" in msg
    assert "Paid: Cash Rs. 100.00 + UPI Rs. 50.00 + Due Rs. 90.00 (Split)" in msg


def test_remarks_formatting():
    msg = format_bill_message(
        BillMessage(
            shop_name="Green Leaf Nursery",
            created_at=WHEN,
            bill_type="retail",
            items=[BillLine("Money Plant", 2, _money("120.00"), _money("240.00"))],
            subtotal=_money("240.00"),
            discount_type="flat",
            discount_value=_money("0.00"),
            discount_amount=_money("0.00"),
            total=_money("240.00"),
            cash_amount=_money("240.00"),
            upi_amount=_money("0.00"),
            customer_name="Sita",
            remarks="Deliver on Monday",
        )
    )
    assert "Remarks: Deliver on Monday" in msg


def test_compile_whatsapp_template():
    bill = BillMessage(
        shop_name="Nursery",
        created_at=dt.datetime.now(dt.timezone.utc),
        bill_type="retail",
        items=[
            BillLine(
                name="Rose",
                quantity=2,
                unit_price=Decimal("100.00"),
                line_total=Decimal("200.00"),
            )
        ],
        subtotal=Decimal("200.00"),
        discount_type="flat",
        discount_value=Decimal("10.00"),
        discount_amount=Decimal("10.00"),
        total=Decimal("190.00"),
        cash_amount=Decimal("190.00"),
        upi_amount=Decimal("0.00"),
        due_amount=Decimal("0.00"),
        customer_name="John Doe",
        remarks="Test remark",
        extra={"bill_id": "test-bill-id-12345"},
    )

    template = "Hey {{customer_name}}, thank you for shopping at {{shop_name}}. Total is {{bill_total}}. Invoice: {{invoice_ninja_url}}. Items: {{items}}."
    res = compile_whatsapp_template(template, bill, "https://invoice/ninja/pdf")

    assert "Hey John Doe" in res
    assert "at Nursery" in res
    assert "Total is Rs. 190.00" in res
    assert "Invoice: https://invoice/ninja/pdf" in res
    assert "Items: Rose (2 × Rs. 100.00) = Rs. 200.00" in res


