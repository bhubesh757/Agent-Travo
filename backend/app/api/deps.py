"""Shared route dependencies."""

from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.security import SESSION_COOKIE, InvalidCredentialError, read_session_token
from app.models.auth import AuthUser

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_current_user(settings: SettingsDep, session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None) -> AuthUser:
    """Return the signed-in user from the session cookie, or respond 401."""
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    try:
        return read_session_token(session, settings.secret_key)
    except InvalidCredentialError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session is invalid or expired") from None


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


def require_trusted_origin(settings: SettingsDep, origin: Annotated[str | None, Header()] = None) -> None:
    """Reject browser requests that come from a site other than the TravelForge frontend.

    Browsers attach `Origin` to cross-site POSTs, so this stops another site from
    signing a visitor in or out. Non-browser clients send no `Origin` and pass.
    """
    if origin is not None and origin.rstrip("/") not in settings.frontend_origins:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Request origin is not allowed")
