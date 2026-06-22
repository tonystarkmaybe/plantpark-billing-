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


class OpenWAClient:
    """Thin async client for an existing OpenWA session.

    Only consumes a session here (status check + send text). Session creation /
    QR pairing is the admin flow in prompt 10B. The base URL already includes
    the '/api' path (e.g. http://localhost:2785/api).
    """

    def __init__(self, base_url: str, api_key: str, *, timeout: float = 8.0) -> None:
        self._base = base_url.rstrip("/")
        self._headers = {"X-API-Key": api_key}
        self._timeout = timeout

    async def is_session_connected(self, session_id: str) -> bool:
        """True only if the gateway confirms this session is connected.

        Any error (unreachable, timeout, non-2xx, unexpected body) → False, so
        the caller falls back to wa.me.
        """
        if not self._base or not session_id:
            return False
        url = f"{self._base}/sessions/{session_id}/status"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(url, headers=self._headers)
            if resp.status_code != 200:
                return False
            data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:  # network or JSON errors
            logger.warning("OpenWA status check failed for %s: %s", session_id, exc)
            return False
        # Be lenient about the gateway's status shape.
        if isinstance(data, dict):
            if data.get("connected") is True:
                return True
            state = str(data.get("status") or data.get("state") or "").lower()
            return state in {"connected", "online", "ready", "authenticated"}
        return False

    async def send_text(self, session_id: str, chat_id: str, text: str) -> bool:
        """Send a text message. Returns True on a 2xx, False on any failure."""
        if not self._base or not session_id:
            return False
        url = f"{self._base}/sessions/{session_id}/messages/send-text"
        payload = {"chatId": chat_id, "text": text}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(url, headers=self._headers, json=payload)
            if 200 <= resp.status_code < 300:
                return True
            logger.warning(
                "OpenWA send failed (%s) for %s -> %s", resp.status_code, session_id, chat_id
            )
            return False
        except httpx.HTTPError as exc:
            logger.warning("OpenWA send errored for %s -> %s: %s", session_id, chat_id, exc)
            return False
