"""Billing / checkout (shop_owner only).

The server is the source of truth for ALL money math. The client's amounts are
recomputed here: line totals, subtotal, discount, and the post-discount total.
The only hard payment rule is enforced in the app layer (not as a DB constraint,
to avoid rounding lockups): cash_amount + upi_amount must equal the total.

Idempotency: each request carries a client-generated idempotency_key. A repeat
of the same key (retry, double-tap, network replay) returns the original bill
instead of creating a duplicate — safe under concurrency via a per-shop unique
index plus a savepoint that rolls back the losing racer's work.
"""
from __future__ import annotations

import datetime as dt
import uuid
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_shop_owner
from app.config import get_settings
from app.models.bill import Bill, BillItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.shop import Shop
from app.models.user import User
from app.schemas.bill import (
    BillCreate,
    BillDetailOut,
    BillItemOut,
    BillListItem,
    BillListOut,
    BillOut,
    BillSummaryOut,
)
from app.schemas.whatsapp import SendWhatsAppResult
from app.services.whatsapp.eligibility import apply_phone_consent
from app.services.whatsapp.service import send_bill_whatsapp

router = APIRouter(prefix="/bills", tags=["bills"])

CENT = Decimal("0.01")
ZERO = Decimal("0.00")

# Shop timezone for "today" and date-range boundaries. India has no DST, so this
# is a fixed +05:30; kept as a named zone for future per-shop configurability.
SHOP_TZ = ZoneInfo("Asia/Kolkata")


def _payment_method(cash: Decimal, upi: Decimal) -> str:
    if cash > 0 and upi > 0:
        return "split"
    if upi > 0:
        return "upi"
    return "cash"


def _ist_day_bounds_utc(day: dt.date) -> tuple[dt.datetime, dt.datetime]:
    """[start, end) UTC instants spanning the given calendar day in shop time."""
    start_local = dt.datetime.combine(day, dt.time.min, tzinfo=SHOP_TZ)
    end_local = start_local + dt.timedelta(days=1)
    return start_local.astimezone(dt.timezone.utc), end_local.astimezone(dt.timezone.utc)


def _today_ist() -> dt.date:
    return dt.datetime.now(tz=SHOP_TZ).date()


def q2(value: Decimal | int) -> Decimal:
    """Quantize to 2 decimal places, rounding half up."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def _http422(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)


def _serialize(bill: Bill, items: list[BillItem], *, replay: bool, customer_name: str | None) -> BillOut:
    return BillOut(
        id=bill.id,
        bill_type=bill.bill_type,
        subtotal=bill.subtotal,
        discount_type=bill.discount_type,
        discount_value=bill.discount_value,
        discount_amount=bill.discount_amount,
        total=bill.total,
        cash_amount=bill.cash_amount,
        upi_amount=bill.upi_amount,
        customer_id=bill.customer_id,
        customer_name=customer_name,
        created_by=bill.created_by,
        created_at=bill.created_at,
        items=[BillItemOut.model_validate(it) for it in items],
        idempotent_replay=replay,
        idempotency_key=bill.idempotency_key,
    )


def _customer_name(db: Session, customer_id) -> str | None:
    if customer_id is None:
        return None
    c = db.execute(select(Customer).where(Customer.id == customer_id)).scalar_one_or_none()
    return c.name if c else None


@router.post("", response_model=BillOut)
def create_bill(
    payload: BillCreate,
    response: Response,
    db: Session = Depends(get_db),
    owner: User = Depends(require_shop_owner),
) -> BillOut:
    # 1) Idempotent replay: if this key already produced a bill, return it as-is.
    existing = db.execute(
        select(Bill).where(Bill.idempotency_key == payload.idempotency_key)
    ).scalar_one_or_none()
    if existing is not None:
        items = list(
            db.execute(select(BillItem).where(BillItem.bill_id == existing.id)).scalars()
        )
        response.status_code = status.HTTP_200_OK
        return _serialize(existing, items, replay=True, customer_name=_customer_name(db, existing.customer_id))

    # 2) Resolve products (RLS-scoped to this shop) and recompute line totals.
    product_ids = [it.product_id for it in payload.items]
    products = {
        p.id: p
        for p in db.execute(select(Product).where(Product.id.in_(product_ids))).scalars()
    }

    computed_items: list[dict] = []
    subtotal = Decimal("0.00")
    for it in payload.items:
        product = products.get(it.product_id)
        if product is None:
            # Missing or another shop's product (RLS-hidden) — treat the same.
            raise _http422("One of the products is unavailable. Please remove it and try again.")
        if not product.is_active:
            raise _http422(f"“{product.name}” is no longer available. Please remove it and try again.")

        # Single billing mode: the price is editable per line (pre-filled from the
        # product's saved price on the client). The server still recomputes totals.
        unit_price = q2(it.unit_price)
        if unit_price < ZERO:
            raise _http422(f"Enter a valid price for “{product.name}”.")

        line_total = q2(unit_price * it.quantity)
        subtotal += line_total
        computed_items.append(
            {"product": product, "unit_price": unit_price, "quantity": it.quantity, "line_total": line_total}
        )
    subtotal = q2(subtotal)

    # 3) Discount (validated server-side; client validates too for instant feedback).
    discount_value = q2(payload.discount_value)
    if payload.discount_type == "percent":
        if discount_value > Decimal("100"):
            raise _http422("Discount percentage cannot be more than 100%.")
        discount_amount = q2(subtotal * discount_value / Decimal("100"))
    else:  # flat ₹ amount
        if discount_value > subtotal:
            raise _http422("Discount cannot be more than the subtotal.")
        discount_amount = discount_value

    total = q2(subtotal - discount_amount)
    if total < 0:
        raise _http422("The total cannot be negative.")

    # 4) Payment must balance exactly to the total.
    cash_amount = q2(payload.cash_amount)
    upi_amount = q2(payload.upi_amount)
    if cash_amount + upi_amount != total:
        raise _http422(
            f"Cash + UPI (₹{cash_amount + upi_amount:.2f}) must equal the total (₹{total:.2f})."
        )

    # 5) Persist customer (if entered) + bill + items inside ONE savepoint, so a
    #    concurrent duplicate-key race rolls the whole unit back cleanly (no
    #    orphan customer) and we replay the winner's bill instead.
    #    bill_type is retained in the schema for historical bills but is no longer
    #    a user choice — single billing mode always records 'retail'.
    bill = Bill(
        shop_id=owner.shop_id,
        bill_type="retail",
        subtotal=subtotal,
        discount_type=payload.discount_type,
        discount_value=discount_value,
        discount_amount=discount_amount,
        total=total,
        cash_amount=cash_amount,
        upi_amount=upi_amount,
        created_by=owner.id,
        idempotency_key=payload.idempotency_key,
    )
    bill_items: list[BillItem] = []
    customer_name: str | None = None
    try:
        with db.begin_nested():
            if payload.new_customer is not None:
                new_c = Customer(
                    shop_id=owner.shop_id,
                    name=payload.new_customer.name,
                )
                # Phone given for receipts at checkout = WhatsApp consent.
                apply_phone_consent(new_c, payload.new_customer.phone)
                db.add(new_c)
                db.flush()
                bill.customer_id = new_c.id
                customer_name = new_c.name

            db.add(bill)
            db.flush()  # assign bill.id
            for ci in computed_items:
                product: Product = ci["product"]
                item = BillItem(
                    bill_id=bill.id,
                    product_id=product.id,
                    product_name=product.name,  # denormalized snapshot
                    unit_price=ci["unit_price"],
                    quantity=ci["quantity"],
                    line_total=ci["line_total"],
                )
                db.add(item)
                bill_items.append(item)
                # Note: the product's saved price is owner-controlled in the
                # Products tab; per-line sale edits are intentionally NOT written
                # back, so the catalog default stays stable.
            db.flush()
    except IntegrityError:
        # A concurrent request with the same key won the race. The savepoint (and
        # its customer insert) was rolled back automatically, leaving the outer
        # transaction — and its RLS context — intact, so we can read the winner.
        winner = db.execute(
            select(Bill).where(Bill.idempotency_key == payload.idempotency_key)
        ).scalar_one()
        win_items = list(
            db.execute(select(BillItem).where(BillItem.bill_id == winner.id)).scalars()
        )
        response.status_code = status.HTTP_200_OK
        return _serialize(winner, win_items, replay=True, customer_name=_customer_name(db, winner.customer_id))

    # If an existing customer was attached, fetch its name for the response.
    if customer_name is None and bill.customer_id is not None:
        customer_name = _customer_name(db, bill.customer_id)

    response.status_code = status.HTTP_201_CREATED
    return _serialize(bill, bill_items, replay=False, customer_name=customer_name)


# ── Reads: today's summary, history list, detail ─────────────────────────────
@router.get("/summary/today", response_model=BillSummaryOut)
def summary_for_day(
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    date: dt.date | None = Query(default=None, description="Day in shop time (YYYY-MM-DD); defaults to today"),
) -> BillSummaryOut:
    day = date or _today_ist()
    start, end = _ist_day_bounds_utc(day)

    rows = db.execute(
        select(Bill.total, Bill.cash_amount, Bill.upi_amount).where(
            Bill.created_at >= start, Bill.created_at < end
        )
    ).all()

    total_sales = ZERO
    cash_total = ZERO
    upi_total = ZERO
    for total, cash, upi in rows:
        total_sales += total
        cash_total += cash
        upi_total += upi

    return BillSummaryOut(
        date=day,
        total_sales=q2(total_sales),
        bill_count=len(rows),
        cash_total=q2(cash_total),
        upi_total=q2(upi_total),
    )


@router.get("", response_model=BillListOut)
def list_bills(
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    date_from: dt.date | None = Query(default=None, description="Inclusive start day (shop time)"),
    date_to: dt.date | None = Query(default=None, description="Inclusive end day (shop time)"),
    bill_type: str | None = Query(default=None, description="'retail' or 'wholesale'"),
    customer_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> BillListOut:
    if bill_type is not None and bill_type not in ("retail", "wholesale"):
        raise _http422("bill_type must be 'retail' or 'wholesale'.")

    stmt = (
        select(
            Bill.id,
            Bill.created_at,
            Bill.bill_type,
            Bill.total,
            Bill.cash_amount,
            Bill.upi_amount,
            Customer.name.label("customer_name"),
        )
        .outerjoin(Customer, Customer.id == Bill.customer_id)
        .order_by(Bill.created_at.desc(), Bill.id.desc())
    )
    if date_from is not None:
        stmt = stmt.where(Bill.created_at >= _ist_day_bounds_utc(date_from)[0])
    if date_to is not None:
        stmt = stmt.where(Bill.created_at < _ist_day_bounds_utc(date_to)[1])
    if bill_type is not None:
        stmt = stmt.where(Bill.bill_type == bill_type)
    if customer_id is not None:
        stmt = stmt.where(Bill.customer_id == customer_id)

    # Fetch one extra row to know whether there's another page.
    rows = db.execute(stmt.limit(limit + 1).offset(offset)).all()
    has_more = len(rows) > limit
    page = rows[:limit]

    ids = [r.id for r in page]
    counts: dict[uuid.UUID, int] = {}
    if ids:
        counts = dict(
            db.execute(
                select(BillItem.bill_id, func.count())
                .where(BillItem.bill_id.in_(ids))
                .group_by(BillItem.bill_id)
            ).all()
        )

    items = [
        BillListItem(
            id=r.id,
            created_at=r.created_at,
            bill_type=r.bill_type,
            total=r.total,
            customer_name=r.customer_name,
            item_count=counts.get(r.id, 0),
            payment_method=_payment_method(r.cash_amount, r.upi_amount),
        )
        for r in page
    ]
    return BillListOut(items=items, limit=limit, offset=offset, has_more=has_more)


@router.get("/{bill_id}", response_model=BillDetailOut)
def get_bill(
    bill_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner: User = Depends(require_shop_owner),
) -> BillDetailOut:
    # RLS makes another shop's bill invisible, so 'not found' and 'not yours'
    # both correctly collapse to 404.
    bill = db.execute(select(Bill).where(Bill.id == bill_id)).scalar_one_or_none()
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    items = list(
        db.execute(
            select(BillItem).where(BillItem.bill_id == bill.id).order_by(BillItem.id.asc())
        ).scalars()
    )

    customer_name: str | None = None
    customer_phone: str | None = None
    if bill.customer_id is not None:
        c = db.execute(
            select(Customer).where(Customer.id == bill.customer_id)
        ).scalar_one_or_none()
        if c is not None:
            customer_name, customer_phone = c.name, c.phone

    shop = db.execute(select(Shop).where(Shop.id == owner.shop_id)).scalar_one_or_none()

    return BillDetailOut(
        id=bill.id,
        shop_name=shop.name if shop else None,
        bill_type=bill.bill_type,
        subtotal=bill.subtotal,
        discount_type=bill.discount_type,
        discount_value=bill.discount_value,
        discount_amount=bill.discount_amount,
        total=bill.total,
        cash_amount=bill.cash_amount,
        upi_amount=bill.upi_amount,
        payment_method=_payment_method(bill.cash_amount, bill.upi_amount),
        customer_id=bill.customer_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        created_at=bill.created_at,
        items=[BillItemOut.model_validate(it) for it in items],
    )


@router.post("/{bill_id}/send-whatsapp", response_model=SendWhatsAppResult)
async def send_whatsapp(
    bill_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner: User = Depends(require_shop_owner),
) -> SendWhatsAppResult:
    """Send (or produce a wa.me link for) this bill on WhatsApp.

    The bill is already saved; this is fully decoupled and never fails the sale.
    Re-sending is always safe. Returns a result the frontend acts on directly:
    show "Sent ✓" or open the wa.me link.
    """
    bill = db.execute(select(Bill).where(Bill.id == bill_id)).scalar_one_or_none()
    if bill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    shop = db.execute(select(Shop).where(Shop.id == owner.shop_id)).scalar_one_or_none()
    return await send_bill_whatsapp(db, bill, shop, get_settings())
