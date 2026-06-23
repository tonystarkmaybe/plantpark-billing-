import pytest
from pydantic import ValidationError
from app.schemas.expense import ExpenseCreate
from decimal import Decimal

def test_expense_schema_validation():
    # Valid expense parameters
    valid_expenses = [
        {"amount": "150.00", "reason": "Watering cans"},
        {"amount": 10.50, "reason": "Soil organic compost"},
        {"amount": Decimal("1000"), "reason": "Nursery rent payment"},
        {"amount": "0.01", "reason": "Tiny pin"},
    ]
    for data in valid_expenses:
        exp = ExpenseCreate(**data)
        assert exp.amount == Decimal(str(data["amount"]))
        assert exp.reason == data["reason"]

    # Invalid expense parameters (should raise ValidationError)
    invalid_expenses = [
        {"amount": "0.00", "reason": "Free stuff"},  # amount must be > 0
        {"amount": "-15.00", "reason": "Refund?"},  # amount must be > 0
        {"amount": "100.00", "reason": ""},         # reason must be non-empty
        {"amount": "100.00", "reason": "   "},      # reason must be non-empty (stripped)
        {"amount": "abc", "reason": "Invalid amount"}, # invalid numeric format
    ]
    for data in invalid_expenses:
        with pytest.raises(ValidationError):
            ExpenseCreate(**data)

