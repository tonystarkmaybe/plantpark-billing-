"""Application configuration loaded from environment variables.

All configuration is sourced from the environment (or a local `.env` file during
development). Nothing is hardcoded. See `.env.example` for the full list.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Database connections (two distinct Postgres roles — see README).
    DATABASE_URL_ADMIN: str
    DATABASE_URL_APP: str

    # Name of the limited app role; the initial migration grants it privileges.
    APP_DB_ROLE: str = "plantora_app"

    # JWT / auth.
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    # Bootstrap admin (used only by scripts/create_admin.py).
    BOOTSTRAP_ADMIN_EMAIL: EmailStr
    BOOTSTRAP_ADMIN_PASSWORD: str

    # CORS — comma-separated list of allowed origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Media / image storage.
    # MEDIA_ROOT: directory where uploaded product images are stored on disk.
    #   Relative paths are resolved from the process working directory (backend/).
    #   On the VPS set this to an absolute path.
    # MEDIA_URL_PREFIX: URL prefix images are served under (locally a FastAPI
    #   static mount; on the VPS, Nginx serves MEDIA_ROOT at this prefix).
    MEDIA_ROOT: str = "./media"
    MEDIA_URL_PREFIX: str = "/media"

    # ── WhatsApp delivery ────────────────────────────────────────────────────
    # Global kill switch. When false, sending always degrades to a wa.me link.
    WHATSAPP_ENABLED: bool = False
    # OpenWA (self-hosted gateway) REST API base, e.g. http://localhost:2785/api.
    OPENWA_BASE_URL: str = ""
    # X-API-Key sent to OpenWA.
    OPENWA_API_KEY: str = ""
    # "openwa" → try OpenWA then fall back to wa.me; "wa_me" → force wa.me only.
    WHATSAPP_DEFAULT_BACKEND: str = "openwa"
    # Default country code used to normalize bare national numbers (India = 91).
    WHATSAPP_COUNTRY_CODE: str = "91"
    # Per-request timeout (seconds) for OpenWA HTTP calls.
    OPENWA_TIMEOUT_SECONDS: float = 8.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @field_validator("JWT_SECRET")
    @classmethod
    def _secret_not_placeholder(cls, v: str) -> str:
        if not v or "CHANGE_ME" in v:
            raise ValueError("JWT_SECRET must be set to a real secret value")
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()  # type: ignore[call-arg]
