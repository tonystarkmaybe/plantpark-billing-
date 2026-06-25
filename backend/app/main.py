"""Plantora FastAPI application entrypoint.

Wires up CORS, the health check, and the auth + admin routers. Business
endpoints (products, billing, printing, image upload) are intentionally NOT
present yet — this is the backend foundation only.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth.router import router as auth_router
from app.config import get_settings
from app.media import ensure_media_dirs, media_root
from app.routers.admin import router as admin_router
from app.routers.bills import router as bills_router
from app.routers.customers import router as customers_router
from app.routers.products import router as products_router
from app.routers.shop import router as shop_router
from app.routers.shop_users import router as shop_users_router
from app.routers.expenses import router as expenses_router
from app.services.whatsapp.worker import start_whatsapp_worker, stop_whatsapp_worker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the async background WhatsApp worker loop on boot
    worker_task = start_whatsapp_worker()
    yield
    # Safely stop worker thread on shutdown
    await stop_whatsapp_worker(worker_task)


app = FastAPI(
    title="Plantora API",
    version="0.1.0",
    description="Billing backend for plant shops with official WhatsApp Cloud API and PDF invoicing.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# Ensure the media directories exist before mounting static files.
# Local dev: FastAPI serves uploaded images at MEDIA_URL_PREFIX.
# Production: Nginx serves MEDIA_ROOT at this prefix directly (see README); this
# mount stays harmless/unused behind the reverse proxy.
ensure_media_dirs()
app.mount(
    settings.MEDIA_URL_PREFIX,
    StaticFiles(directory=str(media_root())),
    name="media",
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(products_router)
app.include_router(customers_router)
app.include_router(bills_router)
app.include_router(shop_router)
app.include_router(shop_users_router)
app.include_router(expenses_router)
