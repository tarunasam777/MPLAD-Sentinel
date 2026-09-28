"""Request-scoped observability: correlation ids, timing, and logs.

Production MPLADS Sentinel needs a request id that is visible end-to-end —
from the browser (``X-Request-ID`` it sent, if any) through every log line
to the response headers — plus a cheap latency signal per response. This is
pure metadata middleware: it changes no behavior and no user-visible status
codes except converting an unhandled exception into a structured 500.

The access log is emitted through the stdlib ``logging`` router named
``sentinel.http``; set ``LOG_LEVEL=DEBUG`` to see per-request lines.
"""

from __future__ import annotations

import logging
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("sentinel.http")

REQUEST_ID_HEADER = "X-Request-ID"
RESPONSE_TIME_HEADER = "X-Response-Time-Ms"

# Inbound ids are forwarded if they look safe (hex or a simple token); a
# non-conformant header is ignored rather than echoed back unsanitized.
_ALLOWED_REQUEST_ID = str.isalnum
_MAX_REQUEST_ID_LEN = 64


def _sanitize_request_id(value: str) -> str:
    value = (value or "").strip()
    if 1 <= len(value) <= _MAX_REQUEST_ID_LEN and all(
        _ALLOWED_REQUEST_ID(ch) for ch in value
    ):
        return value
    return uuid.uuid4().hex[:16]


class ObservabilityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = _sanitize_request_id(request.headers.get(REQUEST_ID_HEADER, ""))
        started_ns = time.perf_counter_ns()
        status_code: int | None = None
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:  # noqa: BLE001 — last line of defense; handlers above
            status_code = 500
            logger.exception(
                "unhandled exception request_id=%s method=%s path=%s",
                request_id,
                request.method,
                request.url.path,
            )
            response = JSONResponse({"detail": "Internal server error"}, status_code=500)
        elapsed_ms = round((time.perf_counter_ns() - started_ns) / 1_000_000, 1)
        response.headers.setdefault(REQUEST_ID_HEADER, request_id)
        response.headers.setdefault(RESPONSE_TIME_HEADER, str(elapsed_ms))
        logger.info(
            "req request_id=%s method=%s path=%s code=%s ms=%.1f",
            request_id,
            request.method,
            request.url.path,
            status_code,
            elapsed_ms,
        )
        return response