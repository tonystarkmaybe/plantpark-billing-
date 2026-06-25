import uuid
import datetime as dt
from decimal import Decimal
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.bill import Bill, BillItem
from app.models.shop import Shop

client = TestClient(app)

def test_get_public_bill_success():
    bill_id = uuid.uuid4()
    shop_id = uuid.uuid4()
    
    # Create mock database objects
    mock_bill = Bill(
        id=bill_id,
        shop_id=shop_id,
        bill_type="retail",
        subtotal=Decimal("200.00"),
        discount_type="flat",
        discount_value=Decimal("10.00"),
        discount_amount=Decimal("10.00"),
        total=Decimal("190.00"),
        cash_amount=Decimal("190.00"),
        upi_amount=Decimal("0.00"),
        due_amount=Decimal("0.00"),
        customer_id=None,
        remarks="Thanks",
        is_edited=False,
        created_at=dt.datetime.now(dt.timezone.utc),
        idempotency_key="key-123"
    )
    
    mock_item = BillItem(
        id=1,
        bill_id=bill_id,
        product_id=uuid.uuid4(),
        product_name="Rose",
        unit_price=Decimal("100.00"),
        quantity=2,
        line_total=Decimal("200.00")
    )
    
    mock_shop = Shop(
        id=shop_id,
        name="Test Nursery",
        business_name="Test Nursery Business",
        business_address="123 Green Rd",
        business_phone="9876543210"
    )

    # Mock the database execute/scalars flow
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_db.execute = mock_execute
    
    mock_bill_result = MagicMock()
    mock_bill_result.scalar_one_or_none.return_value = mock_bill
    
    mock_items_result = MagicMock()
    mock_items_result.scalars.return_value = [mock_item]
    
    mock_shop_result = MagicMock()
    mock_shop_result.scalar_one_or_none.return_value = mock_shop
    
    # Set side_effect to match the execute calls in order:
    # 1. Bill query
    # 2. BillItem query
    # 3. Shop query
    mock_execute.side_effect = [
        mock_bill_result,   # Bill lookup
        mock_items_result,  # Bill items lookup
        mock_shop_result,   # Shop lookup
    ]
    
    mock_privileged_session = MagicMock()
    mock_privileged_session.__enter__.return_value = mock_db
    
    with patch("app.routers.bills.privileged_session", return_value=mock_privileged_session):
        response = client.get(f"/bills/public/{bill_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(bill_id)
        assert data["shop_name"] == "Test Nursery"
        assert data["business_name"] == "Test Nursery Business"
        assert data["total"] == "190.00"
        assert len(data["items"]) == 1
        assert data["items"][0]["product_name"] == "Rose"
        assert data["items"][0]["quantity"] == 2

def test_get_public_bill_not_found():
    bill_id = uuid.uuid4()
    
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_db.execute = mock_execute
    
    mock_bill_result = MagicMock()
    mock_bill_result.scalar_one_or_none.return_value = None
    mock_execute.return_value = mock_bill_result
    
    mock_privileged_session = MagicMock()
    mock_privileged_session.__enter__.return_value = mock_db
    
    with patch("app.routers.bills.privileged_session", return_value=mock_privileged_session):
        response = client.get(f"/bills/public/{bill_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Bill not found"
