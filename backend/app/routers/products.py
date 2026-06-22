"""Product management API (shop_owner only).

Tenant isolation is automatic: every route uses the RLS-aware session, so the
shop owner only ever sees/touches their own shop's rows. We NEVER filter by
shop_id manually, and on insert we take shop_id from the authenticated user's
JWT (owner.shop_id) — never from the request body.
"""
from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_shop_owner
from app.media import (
    IMAGE_CONTENT_TYPES,
    MAX_IMAGE_BYTES,
    build_media_url,
    delete_relative,
    save_product_image_bytes,
)
from app.models.bill import BillItem
from app.models.product import Product
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductDeleteResponse,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])


def _out(product: Product) -> ProductOut:
    """Serialize a Product model into the outward-facing schema (URL for image)."""
    return ProductOut(
        id=product.id,
        name=product.name,
        category=product.category,
        retail_price=product.retail_price,
        last_wholesale_price=product.last_wholesale_price,
        photo_url=build_media_url(product.photo_path),
        is_active=product.is_active,
        created_at=product.created_at,
    )


def _get_owned_product_or_404(db: Session, product_id: uuid.UUID) -> Product:
    """Fetch a product visible under the current RLS context, else 404.

    RLS makes another shop's product invisible, so 'not found' and 'belongs to
    another shop' are indistinguishable here — both correctly become 404.
    """
    product = db.execute(
        select(Product).where(Product.id == product_id)
    ).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_shop_owner),
) -> ProductOut:
    product = Product(
        shop_id=owner.shop_id,  # from JWT, not the request body
        name=payload.name,
        category=payload.category,
        retail_price=payload.retail_price,
        last_wholesale_price=payload.last_wholesale_price,
    )
    db.add(product)
    db.flush()
    db.refresh(product)
    return _out(product)


@router.get("", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    q: str | None = Query(default=None, description="Case-insensitive name search"),
    category: str | None = Query(default=None, description="Exact category filter"),
    active: str = Query(
        default="true",
        description="'true' (default) only active, 'all' include inactive, 'false' only inactive",
    ),
) -> list[ProductOut]:
    stmt = select(Product)
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q}%"))
    if category:
        stmt = stmt.where(Product.category == category)

    active_norm = active.lower()
    if active_norm == "true":
        stmt = stmt.where(Product.is_active.is_(True))
    elif active_norm == "false":
        stmt = stmt.where(Product.is_active.is_(False))
    elif active_norm != "all":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="active must be one of: true, false, all",
        )

    # Active first, then name A–Z.
    stmt = stmt.order_by(Product.is_active.desc(), Product.name.asc())
    return [_out(p) for p in db.execute(stmt).scalars()]


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
) -> ProductOut:
    return _out(_get_owned_product_or_404(db, product_id))


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
) -> ProductOut:
    product = _get_owned_product_or_404(db, product_id)

    data = payload.model_dump(exclude_unset=True)

    # Reject explicit nulls for non-nullable fields.
    for field in ("name", "retail_price", "is_active"):
        if field in data and data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null",
            )

    for field, value in data.items():
        setattr(product, field, value)

    db.flush()
    db.refresh(product)
    return _out(product)


@router.delete("/{product_id}", response_model=ProductDeleteResponse)
def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    hard: bool = Query(default=False, description="Permanently delete (only if no sales history)"),
) -> ProductDeleteResponse:
    product = _get_owned_product_or_404(db, product_id)

    if not hard:
        product.is_active = False
        db.flush()
        return ProductDeleteResponse(
            id=product.id, hard_deleted=False, detail="Product deactivated (soft delete)."
        )

    # Hard delete only if it has no sales history.
    ref_count = db.execute(
        select(func.count()).select_from(BillItem).where(BillItem.product_id == product_id)
    ).scalar_one()
    if ref_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This product has sales history and cannot be permanently deleted. "
                "Deactivate it instead (soft delete)."
            ),
        )

    delete_relative(product.photo_path)
    db.delete(product)
    db.flush()
    return ProductDeleteResponse(
        id=product_id, hard_deleted=True, detail="Product permanently deleted."
    )


@router.post("/{product_id}/image", response_model=ProductOut)
async def upload_product_image(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
    file: UploadFile = File(...),
) -> ProductOut:
    product = _get_owned_product_or_404(db, product_id)

    ext = IMAGE_CONTENT_TYPES.get((file.content_type or "").lower())
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported image type. Allowed: JPEG, PNG, WebP.",
        )

    # Read with a hard size cap (reject before buffering the whole oversized file).
    data = bytearray()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image is too large. Maximum size is 5 MB.",
            )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    old_path = product.photo_path
    new_rel = save_product_image_bytes(bytes(data), ext)
    product.photo_path = new_rel
    db.flush()

    # Remove the previous image only after the new one is committed to disk + DB.
    if old_path and old_path != new_rel:
        delete_relative(old_path)

    db.refresh(product)
    return _out(product)


@router.delete("/{product_id}/image", response_model=ProductOut)
def delete_product_image(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    _owner: User = Depends(require_shop_owner),
) -> ProductOut:
    product = _get_owned_product_or_404(db, product_id)
    if product.photo_path:
        delete_relative(product.photo_path)
        product.photo_path = None
        db.flush()
        db.refresh(product)
    return _out(product)
