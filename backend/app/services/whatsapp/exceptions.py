class WhatsAppError(Exception):
    """Base exception for all WhatsApp-related operations."""
    pass


class WhatsAppConfigError(WhatsAppError):
    """Raised when the WhatsApp credentials or configuration parameters are invalid/missing."""
    pass


class WhatsAppAPIError(WhatsAppError):
    """Raised when Meta's Graph API returns a non-2xx status code or a failure response."""
    
    def __init__(self, message: str, status_code: int | None = None, response_body: str | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class PDFGenerationError(WhatsAppError):
    """Raised when PDF generation using ReportLab fails."""
    pass
