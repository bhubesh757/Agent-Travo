"""Application settings read from environment variables."""

import logging
import os
import secrets
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)

DEFAULT_FRONTEND_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
MIN_SECRET_LENGTH = 32


@dataclass(frozen=True)
class Settings:
    app_env: str
    secret_key: str
    google_client_id: str
    frontend_origins: tuple[str, ...]
    session_ttl_seconds: int

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


def _load_secret_key(app_env: str) -> str:
    secret = os.environ.get("APP_SECRET_KEY", "").strip()
    if len(secret) >= MIN_SECRET_LENGTH:
        return secret
    if app_env == "production":
        raise RuntimeError(f"APP_SECRET_KEY must be set to at least {MIN_SECRET_LENGTH} characters in production")
    logger.warning(
        "APP_SECRET_KEY is missing or shorter than %d characters; using a temporary key. "
        "Sessions will be signed out when the server restarts.",
        MIN_SECRET_LENGTH,
    )
    return secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    app_env = os.environ.get("APP_ENV", "development").strip().lower()
    origins = os.environ.get("FRONTEND_ORIGIN", "").strip() or DEFAULT_FRONTEND_ORIGINS
    return Settings(
        app_env=app_env,
        secret_key=_load_secret_key(app_env),
        google_client_id=os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip(),
        frontend_origins=tuple(o.strip().rstrip("/") for o in origins.split(",") if o.strip()),
        session_ttl_seconds=int(os.environ.get("SESSION_TTL_SECONDS", str(7 * 24 * 60 * 60))),
    )
