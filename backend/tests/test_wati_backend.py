from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.whatsapp.backends import WatiClient


@pytest.mark.anyio
async def test_wati_client_send_success():
    client = WatiClient("https://api.wati.io", "test_key")

    mock_resp = httpx.Response(200, json={"result": True, "status": "success"})

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        success = await client.send_text("919876543210", "Hello world")

        assert success is True
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["Authorization"] == "Bearer test_key"
        assert kwargs["data"] == {"messageText": "Hello world"}


@pytest.mark.anyio
async def test_wati_client_send_failure_json():
    client = WatiClient("https://api.wati.io", "test_key")

    mock_resp = httpx.Response(200, json={"result": False, "errors": ["Session expired"]})

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        success = await client.send_text("919876543210", "Hello world")

        assert success is False


@pytest.mark.anyio
async def test_wati_client_send_http_error():
    client = WatiClient("https://api.wati.io", "test_key")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.HTTPError("Connection failed")

        success = await client.send_text("919876543210", "Hello world")

        assert success is False
