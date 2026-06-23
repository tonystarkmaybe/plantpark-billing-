from decimal import Decimal
from app.routers.bills import _payment_method

def test_payment_method():
    # Single payment types
    assert _payment_method(Decimal("100.00"), Decimal("0.00"), Decimal("0.00")) == "cash"
    assert _payment_method(Decimal("0.00"), Decimal("150.50"), Decimal("0.00")) == "upi"
    assert _payment_method(Decimal("0.00"), Decimal("0.00"), Decimal("200.00")) == "due"
    
    # Split payment types
    assert _payment_method(Decimal("50.00"), Decimal("50.00"), Decimal("0.00")) == "split"
    assert _payment_method(Decimal("100.00"), Decimal("0.00"), Decimal("50.00")) == "split"
    assert _payment_method(Decimal("0.00"), Decimal("100.00"), Decimal("50.00")) == "split"
    assert _payment_method(Decimal("50.00"), Decimal("30.00"), Decimal("20.00")) == "split"
    
    # Fallback to cash if all are zero
    assert _payment_method(Decimal("0.00"), Decimal("0.00"), Decimal("0.00")) == "cash"
