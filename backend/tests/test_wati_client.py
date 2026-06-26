import pytest
from unittest.mock import AsyncMock, patch
import httpx
from app.services.whatsapp.client import WatiClient
from app.services.whatsapp.exceptions import WhatsAppAPIError

@pytest.mark.anyio
async def test_wati_client_send_text_success():
    client = WatiClient(api_url="https://test.wati.io", api_key="test_token")
    
    mock_resp = httpx.Response(
        status_code=200,
        json={"result": True, "message": "Success"}
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.send_text("919876543210", "Hello World")
        assert res is True
        mock_post.assert_called_once()

@pytest.mark.anyio
async def test_wati_client_send_text_failure():
    client = WatiClient(api_url="https://test.wati.io", api_key="test_token")
    
    mock_resp = httpx.Response(
        status_code=400,
        json={"result": False, "message": "Failed"}
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.send_text("919876543210", "Hello World")
        assert res is False

@pytest.mark.anyio
async def test_wati_client_send_document_success():
    client = WatiClient(api_url="https://test.wati.io", api_key="test_token")
    
    mock_resp = httpx.Response(
        status_code=200,
        json={"id": "msg_12345", "result": True}
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        msg_id = await client.send_document_message("919876543210", b"PDFBYTES", "invoice.pdf", "Caption")
        assert msg_id == "msg_12345"

@pytest.mark.anyio
async def test_wati_client_send_template_document_success():
    client = WatiClient(api_url="https://test.wati.io", api_key="test_token")
    
    mock_resp = httpx.Response(
        status_code=200,
        json={"id": "msg_99999", "result": True}
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        msg_id = await client.send_template_document(
            to_phone="919876543210",
            template_name="invoice_template",
            pdf_url="https://hosted.pdf",
            body_parameters=["Thanki", "B-12", "Rs. 100.00"]
        )
        assert msg_id == "msg_99999"
