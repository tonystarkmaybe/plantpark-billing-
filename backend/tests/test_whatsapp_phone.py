"""Unit tests for the phone normalizer (no DB, no network)."""
from __future__ import annotations

import pytest

from app.services.whatsapp.phone import normalize_indian_phone


@pytest.mark.parametrize(
    "raw",
    [
        "9876543210",
        "+91 98765 43210",
        "098765-43210",
        "919876543210",
        "+919876543210",
        "0091 98765 43210",
    ],
)
def test_valid_numbers_normalize_to_same_canonical_form(raw):
    norm = normalize_indian_phone(raw)
    assert norm is not None
    assert norm.digits == "919876543210"
    assert norm.chat_id == "919876543210@c.us"
    assert norm.wa_me == "919876543210"


@pytest.mark.parametrize(
    "raw",
    [
        None,
        "",
        "   ",
        "12345",            # too short
        "5876543210",       # starts with 5 — not an Indian mobile
        "98765",            # too short
        "98765432101234",   # too long
        "abcd",             # no digits
    ],
)
def test_invalid_numbers_return_none(raw):
    assert normalize_indian_phone(raw) is None


def test_custom_country_code():
    norm = normalize_indian_phone("9876543210", country_code="971")
    assert norm is not None
    assert norm.digits == "9719876543210"
    assert norm.chat_id == "9719876543210@c.us"
