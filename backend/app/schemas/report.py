from __future__ import annotations

import datetime as dt
import decimal
import uuid
from pydantic import BaseModel, field_serializer


class CategorySales(BaseModel):
    category: str | None
    quantity: int
    total_sales: decimal.Decimal

    @field_serializer("total_sales")
    def _ser_sales(self, v: decimal.Decimal) -> str:
        return f"{v:.2f}"


class ProductSales(BaseModel):
    product_name: str
    quantity: int
    total_sales: decimal.Decimal

    @field_serializer("total_sales")
    def _ser_sales(self, v: decimal.Decimal) -> str:
        return f"{v:.2f}"


class DetailedReportResponse(BaseModel):
    start_date: dt.date
    end_date: dt.date
    total_sales: decimal.Decimal
    bill_count: int
    cash_total: decimal.Decimal
    upi_total: decimal.Decimal
    due_total: decimal.Decimal
    average_bill_value: decimal.Decimal
    categories: list[CategorySales]
    top_products: list[ProductSales]

    @field_serializer("total_sales", "cash_total", "upi_total", "due_total", "average_bill_value")
    def _ser_money(self, v: decimal.Decimal) -> str:
        return f"{v:.2f}"


class SendReportWhatsAppRequest(BaseModel):
    phone: str
    date_from: dt.date | None = None
    date_to: dt.date | None = None
    created_by: uuid.UUID | None = None
    shop_id: uuid.UUID | None = None
