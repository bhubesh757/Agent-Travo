"""Sign-in with Google, current user, and sign-out."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentUser, SettingsDep, require_trusted_origin
from app.core.config import Settings
from app.core.security import (
    SESSION_COOKIE,
    IdentityProviderUnavailableError,
    InvalidCredentialError,
    create_session_token,
    verify_google_credential,
)
from app.models.auth import AuthConfig, AuthUser, GoogleSignInRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_options(settings: Settings) -> dict:
    return {"path": "/", "httponly": True, "samesite": "lax", "secure": settings.is_production}


@router.get("/config")
def auth_config(settings: SettingsDep) -> AuthConfig:
    """Public sign-in settings for the frontend. The client ID is not a secret."""
    return AuthConfig(google_client_id=settings.google_client_id)


@router.post("/google", dependencies=[Depends(require_trusted_origin)])
def sign_in_with_google(body: GoogleSignInRequest, response: Response, settings: SettingsDep) -> AuthUser:
    """Verify a Google ID token and start a TravelForge session in an HttpOnly cookie."""
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in is not configured on the server")
    try:
        user = verify_google_credential(body.credential, settings.google_client_id)
    except IdentityProviderUnavailableError:
        logger.exception("Could not reach Google to verify a sign-in")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Could not reach Google to verify the sign-in") from None
    except InvalidCredentialError as exc:
        logger.info("Rejected Google sign-in: %s", exc)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in could not be verified") from None

    token = create_session_token(user, settings.secret_key, settings.session_ttl_seconds)
    response.set_cookie(SESSION_COOKIE, token, max_age=settings.session_ttl_seconds, **_cookie_options(settings))
    return user


@router.get("/me")
def current_user(user: CurrentUser) -> AuthUser:
    """Return the signed-in user, or 401 when there is no valid session."""
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_trusted_origin)])
def sign_out(settings: SettingsDep) -> Response:
    """End the session by clearing the cookie."""
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, **_cookie_options(settings))
    return response
