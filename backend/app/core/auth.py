"""Lightweight demo authorization for state-mutating endpoints.

Design: header-based bearer check against a documented demo token
(``DEMO_AUTH_TOKEN``, default ``sentinel-demo-2026``). This is *not* real
identity verification — it exists so the demo can show an auth gate with
an honest label ("demo bypass mode") instead of leaving decision endpoints
wide open with no acknowledgement. A production deployment must replace
this module with NIC SSO / OAuth2.

Accepted credentials (either one):
* ``Authorization: Bearer <token>``
* ``X-Demo-Token: <token>``
"""

from __future__ import annotations

import os
import secrets

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

DEMO_AUTH_TOKEN = os.getenv("DEMO_AUTH_TOKEN", "sentinel-demo-2026")

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    x_demo_token: str | None = Header(default=None, alias="X-Demo-Token"),
) -> dict:
    """Gate for decision/override/mutation endpoints. Returns the demo
    actor descriptor on success, 401 otherwise."""
    presented = (credentials.credentials if credentials else None) or x_demo_token
    if not presented or not secrets.compare_digest(presented, DEMO_AUTH_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Missing or invalid demo token. Provide 'Authorization: Bearer "
                "<DEMO_AUTH_TOKEN>' or the 'X-Demo-Token' header."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "role": "district_magistrate",
        "auth": "demo-token",
        "note": "Demo bypass mode — token accepted, no real identity verification performed.",
    }
