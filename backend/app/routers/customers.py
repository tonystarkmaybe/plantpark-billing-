"""Customer management (shop_owner only), used by billing.

RLS scopes every query to the owner's shop. On insert, shop_id comes from the
authenticated user's JWT — never the request body.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_shop_owner
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerOut
from app.services.whatsapp.eligibility import apply_phone_consent

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    q: str | None = Query(default=None, description="Case-insensitive name/phone search"),
) -> list[Customer]:
    stmt = select(Customer)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.phone.ilike(like)))
    stmt = stmt.order_by(Customer.name.asc())
    return list(db.execute(stmt).scalars())


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_shop_owner),
) -> Customer:
    customer = Customer(
        shop_id=owner.shop_id,  # from JWT, not the request body
        name=payload.name,
    )
    # Providing a phone for receipts IS the consent — stamp it here.
    apply_phone_consent(customer, payload.phone)
    db.add(customer)
    db.flush()
    db.refresh(customer)
    return customer


@router.post("/{customer_id}/whatsapp-optout", response_model=CustomerOut)
def whatsapp_optout(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
) -> Customer:
    """Permanently suppress WhatsApp sending to this customer ("stop sending me these").

    Once set, opt-out always wins over consent — sending will always refuse.
    RLS scopes this to the owner's shop; another shop's customer reads as 404.
    """
    customer = db.execute(
        select(Customer).where(Customer.id == customer_id)
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if not customer.whatsapp_opted_out:
        customer.whatsapp_opted_out = True
        customer.whatsapp_opted_out_at = dt.datetime.now(tz=dt.timezone.utc)
        db.flush()
        db.refresh(customer)
    return customer
