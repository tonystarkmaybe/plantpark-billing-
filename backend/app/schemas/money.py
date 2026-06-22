"""Shared money types.

Project-wide convention: money is NUMERIC(12,2) in the DB and is returned in API
responses as strings with exactly 2 decimals (e.g. "120.00"). Inbound money is
non-negative with at most 2 decimal places.
"""
from __future__ import annotations

import decimal
from typing import Annotated, Optional

from pydantic import Field, PlainSerializer

# Inbound: non-negative, NUMERIC(12,2)-compatible.
MoneyIn = Annotated[decimal.Decimal, Field(ge=0, max_digits=12, decimal_places=2)]

# Outbound: always rendered as a 2-decimal string.
MoneyOut = Annotated[
    decimal.Decimal,
    PlainSerializer(lambda v: f"{v:.2f}", return_type=str),
]
MoneyOutOpt = Annotated[
    Optional[decimal.Decimal],
    PlainSerializer(lambda v: f"{v:.2f}" if v is not None else None, return_type=Optional[str]),
]
