"""API entry point. Authentication is implemented; trip and planning APIs are future work."""

import os
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth

app = FastAPI(title="TravelForge API", version="0.1.0", description="Travel planning API scaffold")

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(auth.router)
app.include_router(api_v1)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """Report that the API process is responding; this does not check dependencies."""
    return {"status": "ok"}


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if os.environ.get("APP_ENV", "development").strip().lower() == "production" and not frontend_dist.is_dir():
    raise RuntimeError("Production frontend build is missing; run `npm run build` in frontend before starting the API")

if frontend_dist.is_dir():
    frontend_index = frontend_dist / "index.html"
    assets = frontend_dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def frontend_root() -> FileResponse:
        return FileResponse(frontend_index)

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_routes(full_path: str) -> FileResponse:
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(frontend_index)
