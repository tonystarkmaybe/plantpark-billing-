from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, uuid_pk


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = uuid_pk()
    shop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("shops.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)

    # WhatsApp consent: a customer providing a phone number FOR receipts IS the
    # consent. Set true (and stamped) the first time a phone is provided; it
    # carries forward for repeat visits. See services.whatsapp.eligibility.
    whatsapp_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    whatsapp_consent_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Opt-out PERMANENTLY suppresses all WhatsApp sending, regardless of consent.
    whatsapp_opted_out: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    whatsapp_opted_out_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[dt.datetime] = created_at_col()

    @property
    def whatsapp_eligible(self) -> bool:
        """Convenience for serialization; delegates to the single source of truth."""
        # Local import avoids a model<->service import cycle.
        from app.services.whatsapp.eligibility import is_whatsapp_eligible

        return is_whatsapp_eligible(self)
