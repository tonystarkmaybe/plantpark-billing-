from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import Boolean, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, uuid_pk


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    
    business_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_upi: Mapped[str | None] = mapped_column(Text, nullable=True)

    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # OpenWA gateway session id/name for this shop (one session per shop on a
    # dedicated number). NULL until the admin connects a session in prompt 10B;
    # when NULL/unconnected, WhatsApp sends degrade to a wa.me link.
    openwa_session_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = created_at_col()

    @property
    def whatsapp_auto_send(self) -> bool:
        return self.settings.get("whatsapp_auto_send", False)

    @whatsapp_auto_send.setter
    def whatsapp_auto_send(self, value: bool) -> None:
        if self.settings is None:
            self.settings = {}
        new_settings = dict(self.settings)
        new_settings["whatsapp_auto_send"] = value
        self.settings = new_settings

