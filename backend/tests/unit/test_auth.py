"""Auth route tests. Google verification is replaced with a stub; no network is used."""

import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.api.routes import auth as auth_routes
from app.core.config import Settings, get_settings
from app.core.security import SESSION_COOKIE, IdentityProviderUnavailableError, InvalidCredentialError
from app.main import app
from app.models.auth import AuthUser

SECRET = "test-secret-key-that-is-long-enough-123456"
ORIGIN = "http://localhost:5173"
USER = AuthUser(id="google-sub-1", email="traveler@example.com", name="Test Traveler", picture=None)


def make_settings(**overrides) -> Settings:
    values = dict(app_env="development", secret_key=SECRET, google_client_id="client-id", frontend_origins=(ORIGIN,), session_ttl_seconds=3600)
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[get_settings] = lambda: make_settings()
    monkeypatch.setattr(auth_routes, "verify_google_credential", lambda credential, client_id: USER)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_config_returns_client_id(client):
    assert client.get("/api/v1/auth/config").json() == {"google_client_id": "client-id"}


def test_me_requires_session(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_sign_in_sets_http_only_cookie_and_me_returns_user(client):
    response = client.post("/api/v1/auth/google", json={"credential": "google-token"}, headers={"Origin": ORIGIN})
    assert response.status_code == 200
    assert response.json()["email"] == USER.email
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json() == {"id": USER.id, "email": USER.email, "name": USER.name, "picture": None}


def test_logout_clears_session(client):
    client.post("/api/v1/auth/google", json={"credential": "google-token"})
    assert client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}).status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


def test_invalid_google_credential_is_rejected(client, monkeypatch):
    def reject(credential, client_id):
        raise InvalidCredentialError("bad token")

    monkeypatch.setattr(auth_routes, "verify_google_credential", reject)
    response = client.post("/api/v1/auth/google", json={"credential": "forged"})
    assert response.status_code == 401
    assert "set-cookie" not in response.headers


def test_google_unreachable_returns_503(client, monkeypatch):
    def unavailable(credential, client_id):
        raise IdentityProviderUnavailableError("offline")

    monkeypatch.setattr(auth_routes, "verify_google_credential", unavailable)
    assert client.post("/api/v1/auth/google", json={"credential": "token"}).status_code == 503


def test_sign_in_unconfigured_returns_503(client):
    app.dependency_overrides[get_settings] = lambda: make_settings(google_client_id="")
    assert client.post("/api/v1/auth/google", json={"credential": "token"}).status_code == 503


def test_foreign_origin_is_rejected(client):
    headers = {"Origin": "https://evil.example"}
    assert client.post("/api/v1/auth/google", json={"credential": "token"}, headers=headers).status_code == 403
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 403


def test_tampered_and_expired_sessions_are_rejected(client):
    now = int(time.time())
    claims = {"iss": "travelforge", "sub": USER.id, "email": USER.email, "iat": now - 7200, "exp": now + 3600}

    client.cookies.set(SESSION_COOKIE, jwt.encode(claims, "a-different-secret-key-of-enough-length-000", algorithm="HS256"))
    assert client.get("/api/v1/auth/me").status_code == 401

    client.cookies.set(SESSION_COOKIE, jwt.encode({**claims, "exp": now - 60}, SECRET, algorithm="HS256"))
    assert client.get("/api/v1/auth/me").status_code == 401

    client.cookies.set(SESSION_COOKIE, jwt.encode({**claims, "alg": "none"}, None, algorithm="none"))
    assert client.get("/api/v1/auth/me").status_code == 401


def test_secure_cookie_in_production(client):
    app.dependency_overrides[get_settings] = lambda: make_settings(app_env="production")
    response = client.post("/api/v1/auth/google", json={"credential": "token"}, headers={"Origin": ORIGIN})
    assert "Secure" in response.headers["set-cookie"]


def test_render_external_url_is_trusted_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_SECRET_KEY", SECRET)
    monkeypatch.setenv("RENDER_EXTERNAL_URL", "https://travelforge.onrender.com/")
    monkeypatch.delenv("FRONTEND_ORIGIN", raising=False)
    get_settings.cache_clear()
    try:
        assert get_settings().frontend_origins == ("https://travelforge.onrender.com",)
    finally:
        get_settings.cache_clear()
