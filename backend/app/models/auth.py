"""Authentication request and response models."""

from pydantic import BaseModel, Field


class AuthUser(BaseModel):
    """The signed-in traveler. `id` is Google's stable account identifier (`sub`)."""

    id: str
    email: str
    name: str
    picture: str | None = None


class GoogleSignInRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=8192, description="Google ID token from Google Identity Services")


class AuthConfig(BaseModel):
    google_client_id: str
