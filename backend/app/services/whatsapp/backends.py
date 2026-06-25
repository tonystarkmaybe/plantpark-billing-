"""WhatsApp delivery backends.

Two implementations behind a tiny common shape so a future official WhatsApp
Cloud API backend can be added as a third WITHOUT changing callers:

  * OpenWAClient   — self-hosted gateway over HTTP (async httpx). Every failure
                     path returns a value; it NEVER raises to the caller, so a
                     gateway outage can never affect a saved bill.
  * WaMeLinkBuilder — pure click-to-chat link builder. No network, always works.

The send-orchestration that chooses between them lives in service.py.
"""
from __future__ import annotations

import logging
from urllib.parse import quote

import httpx

logger = logging.getLogger("plantora.whatsapp")


class WaMeLinkBuilder:
    """Builds https://wa.me/<intl-number>?text=<urlencoded> — a pure function."""

    @staticmethod
    def build(wa_me_number: str, text: str) -> str:
        return f"https://wa.me/{wa_me_number}?text={quote(text)}"


class WatiClient:
    """Thin async client for Wati.io API.

    Consumes Wati Bearer token inside HTTP Header (Authorization: Bearer <token>)
    and calls Wati.io API: POST {base_url}/api/v1/sendSessionMessage/{whatsappNumber}.
    """

    def __init__(self, endpoint: str, api_key: str, *, timeout: float = 8.0) -> None:
        self._endpoint = endpoint.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
        }
        self._timeout = timeout

    async def send_text(self, phone_number: str, text: str) -> bool:
        """Send a text message via Wati's sendSessionMessage API.

        Returns True on a 2xx and successful response body, False on any failure.
        """
        if not self._endpoint or not phone_number:
            logger.warning("Wati.io send_text skipped: endpoint or phone_number is missing")
            return False

        # Clean phone number (strip leading '+' if any)
        clean_phone = phone_number.lstrip("+")

        # WATI endpoint format: POST {URL}/api/v1/sendSessionMessage/{whatsappNumber}
        base = self._endpoint
        if "/api/v1" in base:
            base = base.split("/api/v1")[0]

        url = f"{base}/api/v1/sendSessionMessage/{clean_phone}"
        payload = {"messageText": text}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(url, headers=self._headers, data=payload)

            if 200 <= resp.status_code < 300:
                try:
                    data = resp.json()
                    if isinstance(data, dict):
                        res = data.get("result")
                        if res is False or str(res).lower() == "false":
                            logger.warning("Wati API returned failure result: %s", data)
                            return False
                        return True
                except (ValueError, KeyError):
                    pass
                return True

            logger.warning(
                "Wati send failed with HTTP status %s -> %s", resp.status_code, clean_phone
            )
            return False
        except httpx.HTTPError as exc:
            logger.warning("Wati send errored -> %s: %s", clean_phone, exc)
            return False

