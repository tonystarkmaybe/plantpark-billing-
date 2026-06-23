import datetime as dt
import decimal
from app.schemas.report import DetailedReportResponse, CategorySales, ProductSales
from app.routers.bills import _format_report_whatsapp


def test_format_report_whatsapp():
    report = DetailedReportResponse(
        start_date=dt.date(2026, 6, 20),
        end_date=dt.date(2026, 6, 23),
        total_sales=decimal.Decimal("15240.00"),
        bill_count=12,
        cash_total=decimal.Decimal("10000.00"),
        upi_total=decimal.Decimal("5240.00"),
        due_total=decimal.Decimal("0.00"),
        average_bill_value=decimal.Decimal("1270.00"),
        categories=[
            CategorySales(category="Plants", quantity=15, total_sales=decimal.Decimal("12000.00")),
            CategorySales(category="Pots", quantity=5, total_sales=decimal.Decimal("3240.00")),
        ],
        top_products=[
            ProductSales(product_name="Areca Palm", quantity=10, total_sales=decimal.Decimal("10000.00")),
            ProductSales(product_name="Rose Plant", quantity=5, total_sales=decimal.Decimal("2000.00")),
        ]
    )

    formatted = _format_report_whatsapp(report, "Green Thumb Nursery")
    assert "Green Thumb Nursery Sales Report" in formatted
    assert "*Period*: 2026-06-20 to 2026-06-23" in formatted
    assert "*Total Sales*: ₹15240.00" in formatted
    assert "*Cash Collected*: ₹10000.00" in formatted
    assert "*UPI Collected*: ₹5240.00" in formatted
    assert "Plants: 15 items" in formatted
    assert "Areca Palm: 10 items" in formatted
