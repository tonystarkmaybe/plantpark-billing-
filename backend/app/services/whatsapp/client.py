import logging
import httpx
from app.config import get_settings
from app.services.whatsapp.exceptions import WhatsAppAPIError, WhatsAppConfigError

logger = logging.getLogger("plantora.whatsapp.client")
settings = get_settings()


class WhatsAppCloudClient:
    """Async client for Meta WhatsApp Business Platform (Cloud API)."""

    def __init__(self) -> None:
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_version = settings.WHATSAPP_API_VERSION or "v20.0"
        self.timeout = settings.WHATSAPP_TIMEOUT_SECONDS or 8.0

        if not self.access_token or not self.phone_number_id:
            logger.warning("WhatsApp Cloud API credentials or Phone Number ID are missing.")

        self.base_url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

    def _check_config(self) -> None:
        if not self.access_token or not self.phone_number_id:
            raise WhatsAppConfigError("WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.")

    async def upload_media(self, file_bytes: bytes, file_name: str, mime_type: str = "application/pdf") -> str:
        """Upload media bytes to Meta's media endpoint.

        Returns:
            str: The uploaded media ID.
        """
        self._check_config()
        url = f"{self.base_url}/media"
        
        files = {
            "file": (file_name, file_bytes, mime_type),
        }
        data = {
            "messaging_product": "whatsapp",
            "type": "document",
        }

        logger.info(
            "Meta Request Started | URL: %s | Method: POST | Payload (messaging_product: %s, type: %s, file_name: %s)",
            url, data["messaging_product"], data["type"], file_name
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, data=data, files=files)
            
            logger.info(
                "Meta Response Received | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )
            
            if resp.status_code < 200 or resp.status_code >= 300:
                raise WhatsAppAPIError(
                    f"Media upload failed with status code {resp.status_code}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )
            
            res_data = resp.json()
            media_id = res_data.get("id")
            if not media_id:
                raise WhatsAppAPIError("Meta response did not contain media id", status_code=resp.status_code, response_body=resp.text)
            
            logger.info("Successfully uploaded media %s to WhatsApp Cloud API. ID: %s", file_name, media_id)
            return str(media_id)

        except httpx.HTTPError as e:
            logger.error("HTTP connection error during media upload: %s", e)
            raise WhatsAppAPIError(f"HTTP connection error during media upload: {e}")

    async def send_document_message(self, to_phone: str, media_id: str, file_name: str, caption: str | None = None) -> str:
        """Send a direct PDF document message to the customer (requires active 24h window).

        Returns:
            str: The message ID.
        """
        self._check_config()
        url = f"{self.base_url}/messages"
        
        clean_phone = to_phone.lstrip("+").strip()
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "document",
            "document": {
                "id": media_id,
                "filename": file_name,
            }
        }
        if caption:
            payload["document"]["caption"] = caption

        logger.info(
            "Meta Request Started | URL: %s | Method: POST | Payload: %s",
            url, payload
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, json=payload)

            logger.info(
                "Meta Response Received | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )

            if resp.status_code < 200 or resp.status_code >= 300:
                raise WhatsAppAPIError(
                    f"Document message send failed with status code {resp.status_code}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )

            res_data = resp.json()
            messages = res_data.get("messages", [])
            if not messages:
                raise WhatsAppAPIError("Meta response did not contain message details", status_code=resp.status_code, response_body=resp.text)

            msg_id = messages[0].get("id")
            logger.info("Successfully sent document to %s. Message ID: %s", clean_phone, msg_id)
            return str(msg_id)

        except httpx.HTTPError as e:
            logger.error("HTTP connection error during document send: %s", e)
            raise WhatsAppAPIError(f"HTTP connection error during document send: {e}")

    async def send_template_document(
        self,
        to_phone: str,
        template_name: str,
        lang_code: str,
        media_id: str,
        file_name: str,
        body_parameters: list[str] | None = None
    ) -> str:
        """Send a WhatsApp Template document message.

        Returns:
            str: The message ID.
        """
        self._check_config()
        url = f"{self.base_url}/messages"
        
        clean_phone = to_phone.lstrip("+").strip()
        components = [
            {
                "type": "header",
                "parameters": [
                    {
                        "type": "document",
                        "document": {
                            "id": media_id,
                            "filename": file_name,
                        }
                    }
                ]
            }
        ]

        if body_parameters:
            components.append({
                "type": "body",
                "parameters": [
                    {"type": "text", "text": param}
                    for param in body_parameters
                ]
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": lang_code,
                },
                "components": components,
            }
        }

        logger.info(
            "Meta Request Started | URL: %s | Method: POST | Payload: %s",
            url, payload
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, json=payload)

            logger.info(
                "Meta Response Received | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )

            if resp.status_code < 200 or resp.status_code >= 300:
                raise WhatsAppAPIError(
                    f"Template send failed with status code {resp.status_code}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )

            res_data = resp.json()
            messages = res_data.get("messages", [])
            if not messages:
                raise WhatsAppAPIError("Meta response did not contain message details", status_code=resp.status_code, response_body=resp.text)

            msg_id = messages[0].get("id")
            logger.info("Successfully sent template message to %s. Message ID: %s", clean_phone, msg_id)
            return str(msg_id)

        except httpx.HTTPError as e:
            logger.error("HTTP connection error during template send: %s", e)
            raise WhatsAppAPIError(f"HTTP connection error during template send: {e}")


class WatiClient:
    """Async client for WATI (WhatsApp Team Inbox) Platform."""

    def __init__(self, api_url: str | None = None, api_key: str | None = None, timeout: float | None = None) -> None:
        self.api_url = (api_url or settings.WATI_API_ENDPOINT).rstrip("/")
        self.api_key = api_key or settings.WATI_API_KEY
        self.timeout = timeout or settings.WATI_TIMEOUT_SECONDS or 15.0
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "accept": "application/json",
        }

    async def send_text(self, to_phone: str, text: str) -> bool:
        """Send a session text message via WATI."""
        if not self.api_url or not self.api_key:
            logger.warning("WATI API credentials or Base URL are missing.")
            return False

        clean_phone = to_phone.lstrip("+").strip()
        url = f"{self.api_url}/api/v1/sendSessionMessage/{clean_phone}"
        payload = {"messageText": text}

        logger.info(
            "WATI Send Text Started | URL: %s | Phone: %s | Payload: %s",
            url, clean_phone, payload
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, json=payload)

            logger.info(
                "WATI Send Text Response | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )

            if 200 <= resp.status_code < 300:
                res_data = resp.json()
                return res_data.get("result") is True or res_data.get("result") == "success" or res_data.get("validWhatsAppNumber") is True
            return False
        except Exception as e:
            logger.error("Error sending text via WATI: %s", e)
            return False

    async def send_document_message(self, to_phone: str, pdf_bytes: bytes, file_name: str, caption: str | None = None) -> str:
        """Send a direct PDF document message to the customer (requires active 24h window).

        Returns:
            str: The message ID or response indicator.
        """
        clean_phone = to_phone.lstrip("+").strip()
        url = f"{self.api_url}/api/v1/sendSessionFile/{clean_phone}"

        files = {
            "file": (file_name, pdf_bytes, "application/pdf")
        }
        data = {}
        if caption:
            data["caption"] = caption

        logger.info(
            "WATI Send Session File Started | URL: %s | Phone: %s | File Name: %s",
            url, clean_phone, file_name
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, files=files, data=data)

            logger.info(
                "WATI Send Session File Response | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )

            if resp.status_code < 200 or resp.status_code >= 300:
                raise WhatsAppAPIError(
                    f"WATI Document message send failed with status code {resp.status_code}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )

            res_data = resp.json()
            if res_data.get("result") is False or res_data.get("status") == "error":
                raise WhatsAppAPIError(
                    f"WATI Document message rejected: {res_data.get('message') or res_data}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )
            return str(res_data.get("id") or res_data.get("message") or "sent")
        except httpx.HTTPError as e:
            logger.error("HTTP connection error during WATI document send: %s", e)
            raise WhatsAppAPIError(f"HTTP connection error during WATI document send: {e}")

    async def send_template_document(
        self,
        to_phone: str,
        template_name: str,
        pdf_url: str,
        body_parameters: list[str] | None = None,
        broadcast_name: str = "Invoice"
    ) -> str:
        """Send a WhatsApp Template document message via WATI.

        Returns:
            str: The message ID.
        """
        clean_phone = to_phone.lstrip("+").strip()
        url = f"{self.api_url}/api/v2/sendTemplateMessage"
        params = {"whatsappNumber": clean_phone}

        # Build parameters
        wati_params = []
        if body_parameters:
            for idx, val in enumerate(body_parameters):
                wati_params.append({"name": str(idx + 1), "value": val})
                # Add robust named parameter aliases to support various templates
                if idx == 0:
                    wati_params.append({"name": "name", "value": val})
                    wati_params.append({"name": "customer_name", "value": val})
                    wati_params.append({"name": "customer", "value": val})
                elif idx == 1:
                    wati_params.append({"name": "bill_id", "value": val})
                    wati_params.append({"name": "invoice_id", "value": val})
                    wati_params.append({"name": "order_id", "value": val})
                    wati_params.append({"name": "id", "value": val})
                elif idx == 2:
                    wati_params.append({"name": "total", "value": val})
                    wati_params.append({"name": "amount", "value": val})
                    wati_params.append({"name": "bill_total", "value": val})

        wati_params.append({"name": "pdfLink", "value": pdf_url})
        wati_params.append({"name": "invoice_url", "value": pdf_url})
        wati_params.append({"name": "link", "value": pdf_url})

        payload = {
            "template_name": template_name,
            "broadcast_name": broadcast_name,
            "parameters": wati_params
        }

        logger.info(
            "WATI Send Template Document Started | URL: %s | Phone: %s | Payload: %s",
            url, clean_phone, payload
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, headers=self.headers, params=params, json=payload)

            logger.info(
                "WATI Send Template Document Response | URL: %s | Status: %s | Body: %s",
                url, resp.status_code, resp.text
            )

            if resp.status_code < 200 or resp.status_code >= 300:
                raise WhatsAppAPIError(
                    f"WATI Template send failed with status code {resp.status_code}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )

            res_data = resp.json()
            if res_data.get("result") is False or res_data.get("status") == "error":
                raise WhatsAppAPIError(
                    f"WATI Template send rejected: {res_data.get('message') or res_data}",
                    status_code=resp.status_code,
                    response_body=resp.text,
                )
            return str(res_data.get("id") or res_data.get("message") or "sent")
        except httpx.HTTPError as e:
            logger.error("HTTP connection error during WATI template send: %s", e)
            raise WhatsAppAPIError(f"HTTP connection error during WATI template send: {e}")

