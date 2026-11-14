"""API entry point. Authentication is implemented; trip and planning APIs are future work."""

from fastapi import APIRouter, FastAPI

from app.api.routes import auth

app = FastAPI(title="TravelForge API", version="0.1.0", description="Travel planning API scaffold")

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
app.include_router(api_v1)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Report that the API process is responding; this does not check dependencies."""
    return {"status": "ok"}
