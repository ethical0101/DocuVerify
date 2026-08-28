from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.api.enterprise_routes import router as enterprise_router

app = FastAPI(title="DocuVerify API", version="0.1.0",
              description="AI-powered forensic analysis for identity and educational documents.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(enterprise_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")


@app.get("/api")
def api_root():
    return {"service": "DocuVerify API", "status": "running", "docs": "/docs"}


# Single-origin deployment: if the frontend has been built (`npm run build`
# in frontend/, producing frontend/dist), serve it from this same FastAPI
# process so there's one deployable service and no CORS/two-origin setup to
# manage. In local dev (no dist/) this block is skipped entirely -- Vite's
# own dev server + proxy (vite.config.ts) is what's used instead.
_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = (_FRONTEND_DIST / full_path).resolve()
        if candidate.is_file() and _FRONTEND_DIST in candidate.parents:
            return FileResponse(candidate)
        index = _FRONTEND_DIST / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=404)
        return FileResponse(index)
else:
    @app.get("/")
    def root():
        return {"service": "DocuVerify API", "status": "running", "docs": "/docs"}
