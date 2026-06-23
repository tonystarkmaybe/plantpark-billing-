import pytest
from pydantic import ValidationError
from app.schemas.admin import ShopUpdateRequest

def test_upi_validation():
    # Valid UPIs should parse successfully (whitespace trimmed, empty values converted to None)
    valid_upis = [
        "john.doe@okaxis",
        "merchant@ybl",
        "someone-else_123.test@upi",
        "ab@cd",
        None,
        "",
        "   "
    ]
    for upi in valid_upis:
        req = ShopUpdateRequest(business_upi=upi)
        if upi is None or not upi.strip():
            assert req.business_upi is None
        else:
            assert req.business_upi == upi.strip()

    # Invalid UPIs should raise a ValidationError
    invalid_upis = [
        "invalidvpa",
        "invalid@vpa@bank",
        "@bank",
        "user@",
        "a@b",                 # username and bank too short (< 2 characters)
        "john.doe@o",          # bank too short (< 2 chars)
        "x" * 257 + "@bank",   # username too long (> 256 chars)
        "john.doe@" + "x" * 65, # bank too long (> 64 chars)
    ]
    for upi in invalid_upis:
        with pytest.raises(ValidationError):
            ShopUpdateRequest(business_upi=upi)
