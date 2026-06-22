"""Filesystem storage helpers for product images.

Images are stored under ``MEDIA_ROOT/products/`` with server-generated unique
filenames. The DB stores only the RELATIVE path (e.g. ``products/<uuid>.jpg``);
outward-facing URLs are built from ``MEDIA_URL_PREFIX``.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from app.config import get_settings

settings = get_settings()

# Allowed upload content types mapped to the extension we store them under.
IMAGE_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

_PRODUCTS_SUBDIR = "products"


def media_root() -> Path:
    return Path(settings.MEDIA_ROOT).resolve()


def products_dir() -> Path:
    return media_root() / _PRODUCTS_SUBDIR


def ensure_media_dirs() -> None:
    """Create MEDIA_ROOT and MEDIA_ROOT/products if missing. Idempotent."""
    products_dir().mkdir(parents=True, exist_ok=True)


def save_product_image_bytes(data: bytes, ext: str) -> str:
    """Persist image bytes and return the relative path stored in the DB."""
    ensure_media_dirs()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = products_dir() / filename
    dest.write_bytes(data)
    return f"{_PRODUCTS_SUBDIR}/{filename}"


def delete_relative(rel_path: str | None) -> None:
    """Best-effort delete of a stored media file. Safe if missing/None.

    Guards against path traversal by ensuring the resolved file stays within
    MEDIA_ROOT before unlinking.
    """
    if not rel_path:
        return
    target = (media_root() / rel_path).resolve()
    try:
        target.relative_to(media_root())
    except ValueError:
        return  # outside MEDIA_ROOT — refuse to touch it
    target.unlink(missing_ok=True)


def build_media_url(rel_path: str | None) -> str | None:
    """Turn a stored relative path into a URL the frontend can use directly.

    e.g. ('products/abc.jpg') -> '/media/products/abc.jpg'. None -> None.
    """
    if not rel_path:
        return None
    prefix = settings.MEDIA_URL_PREFIX.rstrip("/")
    return f"{prefix}/{rel_path.lstrip('/')}"
