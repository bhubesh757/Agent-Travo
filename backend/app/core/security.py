"""Google ID token verification and TravelForge session tokens."""

import time

import jwt
import requests
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.models.auth import AuthUser

SESSION_COOKIE = "tf_session"
SESSION_ALGORITHM = "HS256"
SESSION_ISSUER = "travelforge"

_google_http = requests.Session()


class InvalidCredentialError(Exception):
    """The Google credential or session token is not acceptable."""


class IdentityProviderUnavailableError(Exception):
    """Google's signing keys could not be fetched, so nothing could be verified."""


def verify_google_credential(credential: str, client_id: str) -> AuthUser:
    """Check a Google ID token's signature, issuer, audience, and expiry, then return its user."""
    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(session=_google_http),
            audience=client_id,
            clock_skew_in_seconds=10,
        )
    except google_exceptions.TransportError as exc:
        raise IdentityProviderUnavailableError(str(exc)) from exc
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        raise InvalidCredentialError(str(exc)) from exc

    if not claims.get("sub") or not claims.get("email"):
        raise InvalidCredentialError("Google credential is missing the account id or email")
    if claims.get("email_verified") is not True:
        raise InvalidCredentialError("Google account email is not verified")

    return AuthUser(
        id=claims["sub"],
        email=claims["email"],
        name=claims.get("name") or claims["email"],
        picture=claims.get("picture"),
    )


def create_session_token(user: AuthUser, secret_key: str, ttl_seconds: int) -> str:
    now = int(time.time())
    payload = {
        "iss": SESSION_ISSUER,
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(payload, secret_key, algorithm=SESSION_ALGORITHM)


def read_session_token(token: str, secret_key: str) -> AuthUser:
    try:
        claims = jwt.decode(
            token,
            secret_key,
            algorithms=[SESSION_ALGORITHM],
            issuer=SESSION_ISSUER,
            options={"require": ["exp", "iat", "sub", "email"]},
        )
    except jwt.PyJWTError as exc:
        raise InvalidCredentialError(str(exc)) from exc
    return AuthUser(id=claims["sub"], email=claims["email"], name=claims.get("name") or claims["email"], picture=claims.get("picture"))
