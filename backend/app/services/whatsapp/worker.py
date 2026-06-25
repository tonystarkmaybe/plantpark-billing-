import asyncio
import datetime as dt
import logging
from sqlalchemy import select, or_, and_
from app.database import SessionLocal
from app.models.bill import Bill
from app.services.whatsapp.sender import send_whatsapp_invoice_process

logger = logging.getLogger("plantora.whatsapp.worker")

_running = True
_worker_task = None


async def process_queued_whatsapp_jobs() -> None:
    """Query the DB for pending or failed WhatsApp invoice jobs and process them.

    Applies exponential backoff rules to retried failed jobs.
    """
    db = SessionLocal()
    try:
        now_utc = dt.datetime.now(dt.timezone.utc)
        
        # 1. Fetch pending and failed bills that are retryable (retry_count < 3)
        stmt = (
            select(Bill)
            .where(
                or_(
                    Bill.whatsapp_status == "queued",
                    and_(
                        Bill.whatsapp_status == "failed",
                        Bill.retry_count < 3
                    )
                )
            )
            .order_by(Bill.created_at.asc())
            .limit(5)
        )
        
        bills = list(db.execute(stmt).scalars().all())
        
        for bill in bills:
            # 2. Check retry backoff if failed previously
            if bill.whatsapp_status == "failed" and bill.last_retry_at:
                # 1 min for first retry, 5 mins for second retry, 15 mins for third
                backoff_minutes = 1 if bill.retry_count == 1 else (5 if bill.retry_count == 2 else 15)
                # Ensure tzinfo is set on last_retry_at if not present (PostgreSQL TIMESTAMPTZ loads it as tz-aware)
                last_retry = bill.last_retry_at
                if last_retry.tzinfo is None:
                    last_retry = last_retry.replace(tzinfo=dt.timezone.utc)
                    
                time_passed = (now_utc - last_retry).total_seconds()
                if time_passed < (backoff_minutes * 60):
                    # Backoff has not expired yet, skip
                    continue
            
            # 3. Process job
            logger.info("Background worker picking up WhatsApp send job for Bill %s", bill.id)
            await send_whatsapp_invoice_process(db, bill)
            
    except Exception as e:
        logger.exception("Error during WhatsApp jobs batch processing: %s", e)
    finally:
        db.close()


async def whatsapp_worker_loop() -> None:
    """Continuous worker loop checking for jobs every 10 seconds."""
    global _running
    logger.info("WhatsApp background worker loop started.")
    
    # Small delay on boot to allow server initialization
    await asyncio.sleep(5)
    
    while _running:
        try:
            await process_queued_whatsapp_jobs()
        except Exception as e:
            logger.exception("Exception in background worker execution: %s", e)
        
        # Poll every 10 seconds
        await asyncio.sleep(10)
        
    logger.info("WhatsApp background worker loop stopped.")


def start_whatsapp_worker() -> asyncio.Task:
    """Launch the background async worker loop."""
    global _running, _worker_task
    _running = True
    _worker_task = asyncio.create_task(whatsapp_worker_loop())
    return _worker_task


async def stop_whatsapp_worker(task: asyncio.Task | None = None) -> None:
    """Shutdown the background async worker loop and wait for it to join."""
    global _running
    _running = False
    logger.info("Signaled WhatsApp worker thread shutdown...")
    
    target_task = task or _worker_task
    if target_task:
        # Give it a short window to terminate or cancel it
        try:
            await asyncio.wait_for(target_task, timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("Worker task did not stop in time, canceling it...")
            target_task.cancel()
        except Exception:
            pass
