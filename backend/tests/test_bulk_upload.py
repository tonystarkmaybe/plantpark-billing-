import pytest
import decimal
from fastapi import HTTPException
from app.routers.products import parse_bulk_file

def test_parse_bulk_csv():
    csv_data = (
        "Product Name,Category,Retail Price,Wholesale Price,Stock\n"
        "Rose Plant,Flowering Plants,150.00,120.00,50\n"
        "Ceramic Pot 6 inch,Pots & Planters,180.00,,100\n"
    )
    products = parse_bulk_file(csv_data.encode("utf-8"), "test.csv")
    assert len(products) == 2
    
    assert products[0]["name"] == "Rose Plant"
    assert products[0]["category"] == "Flowering Plants"
    assert products[0]["retail_price"] == decimal.Decimal("150.00")
    assert products[0]["last_wholesale_price"] == decimal.Decimal("120.00")
    assert products[0]["stock"] == 50

    assert products[1]["name"] == "Ceramic Pot 6 inch"
    assert products[1]["category"] == "Pots & Planters"
    assert products[1]["retail_price"] == decimal.Decimal("180.00")
    assert products[1]["last_wholesale_price"] is None
    assert products[1]["stock"] == 100

def test_parse_bulk_csv_flexible_headers():
    csv_data = (
        "product,cat,price,wholesale,qty\n"
        "Areca Palm,Indoor,350.00,280.00,20\n"
    )
    products = parse_bulk_file(csv_data.encode("utf-8"), "test.csv")
    assert len(products) == 1
    assert products[0]["name"] == "Areca Palm"
    assert products[0]["category"] == "Indoor"
    assert products[0]["retail_price"] == decimal.Decimal("350.00")
    assert products[0]["last_wholesale_price"] == decimal.Decimal("280.00")
    assert products[0]["stock"] == 20

def test_parse_bulk_csv_missing_name():
    csv_data = (
        "Product Name,Category,Retail Price,Wholesale Price,Stock\n"
        ",Flowering Plants,150.00,120.00,50\n"
    )
    with pytest.raises(HTTPException) as exc:
        parse_bulk_file(csv_data.encode("utf-8"), "test.csv")
    assert exc.value.status_code == 422
    assert "Product Name is required" in exc.value.detail
