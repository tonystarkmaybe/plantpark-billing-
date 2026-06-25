from __future__ import annotations
import uuid
from pydantic import BaseModel


class ShopSettingsOut(BaseModel):
    id: uuid.UUID
    name: str
    owner_name: str | None = None
    owner_phone: str | None = None
    is_active: bool
    business_name: str | None = None
    business_address: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_upi: str | None = None
    whatsapp_auto_send: bool
    whatsapp_enable_pdf: bool
    whatsapp_message_template: str | None = None
    whatsapp_footer_message: str | None = None
    whatsapp_language: str
    
    model_config = {"from_attributes": True}


class ShopSettingsUpdate(BaseModel):
    business_name: str | None = None
    business_address: str | None = None
    business_phone: str | None = None
    business_email: str | None = None
    business_upi: str | None = None
    whatsapp_auto_send: bool | None = None
    whatsapp_enable_pdf: bool | None = None
    whatsapp_message_template: str | None = None
    whatsapp_footer_message: str | None = None
    whatsapp_language: str | None = None
