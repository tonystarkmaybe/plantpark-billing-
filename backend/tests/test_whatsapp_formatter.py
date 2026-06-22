"""Unit tests for the bill → WhatsApp message formatter (no DB, no network)."""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from app.services.whatsapp.formatter import BillLine, BillMessage, format_bill_message

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
    assert "₹120.00 × 2 = ₹240.00" in msg
    assert "Subtotal: ₹240.00" in msg
    assert "Discount" not in msg  # no discount line when zero
    assert "Total: ₹240.00" in msg
    assert "Paid: Cash ₹240.00" in msg
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
    assert "Discount (10%): -₹24.00" in msg
    assert "Total: ₹216.00" in msg
    assert "Paid: Cash ₹100.00 + UPI ₹116.00 (Split)" in msg


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
    assert "Discount: -₹500.00" in msg
    assert "Total: ₹22,000.00" in msg  # Indian digit grouping
    assert "Paid: UPI ₹22,000.00" in msg
