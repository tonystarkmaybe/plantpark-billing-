import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.bill import Bill
from app.config import get_settings

logger = logging.getLogger("plantora.whatsapp.webhook")
settings = get_settings()


def validate_verify_token(token_input: str, challenge: str, mode: str) -> str:
    """Validate Meta's Webhook verification challenge request.

    Meta sends a GET request to verify our endpoint.
    """
    verify_token = settings.WHATSAPP_VERIFY_TOKEN
    
    if mode != "subscribe":
        logger.warning("Webhook verification failed: hub.mode is not 'subscribe'")
        raise ValueError("Invalid hub.mode")
        
    if token_input != verify_token:
        logger.warning(
            "Webhook verification token mismatch. Expected '%s', got '%s'",
            verify_token,
            token_input
        )
        raise ValueError("Token mismatch")
        
    logger.info("Webhook verification challenge passed successfully.")
    return challenge


async def process_webhook_payload(payload: dict, db: Session) -> bool:
    """Parse Meta WhatsApp status callback payloads and update db entries.

    Meta sends status callbacks when a message is sent, delivered, read, or fails.
    """
    logger.debug("Received webhook payload: %s", payload)

    entries = payload.get("entry", [])
    if not entries:
        return False

    status_updated = False

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            statuses = value.get("statuses", [])
            
            for status_info in statuses:
                msg_id = status_info.get("id")
                status = status_info.get("status")  # sent, delivered, read, failed
                
                if not msg_id or not status:
                    continue

                # Find the bill matching the message ID
                bill = db.execute(
                    select(Bill).where(Bill.whatsapp_message_id == msg_id)
                ).scalar_one_or_none()

                if not bill:
                    # Message ID not in our database, ignore (might be customer replies)
                    continue

                # Allowed transitions logic (delivered can overwrite sent, read can overwrite delivered)
                status_hierarchy = {
                    "none": 0,
                    "failed": 1,
                    "queued": 2,
                    "sending": 3,
                    "sent": 4,
                    "delivered": 5,
                    "read": 6
                }

                current_rank = status_hierarchy.get(bill.whatsapp_status, 0)
                new_rank = status_hierarchy.get(status, 0)

                # Update if the status is an advancement or a failure update
                if new_rank > current_rank or status == "failed":
                    bill.whatsapp_status = status
                    
                    if status == "failed":
                        errors = status_info.get("errors", [])
                        err_text = "WhatsApp status callback failed."
                        if errors:
                            err_text = f"Meta API Error: {errors[0].get('title', 'Unknown')} - {errors[0].get('message', '')}"
                        bill.whatsapp_error = err_text
                        logger.warning("WhatsApp message %s failed callback: %s", msg_id, err_text)
                    else:
                        bill.whatsapp_error = None

                    db.flush()
                    status_updated = True
                    logger.info("Updated status of Bill %s to '%s' via webhook.", bill.id, status)

    if status_updated:
        db.commit()
        return True

    return False
