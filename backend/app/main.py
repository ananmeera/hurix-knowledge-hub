from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from app.core.config import settings
from app.core.database import Base, engine
from app.models import models  # noqa: F401
from app.api import auth_routes, chat_routes, knowledge_routes, automation_routes, admin_routes

Base.metadata.create_all(bind=engine)

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app = FastAPI(title="Knowledge Hub AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        settings.backend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https://.*\.(trycloudflare\.com|ngrok-free\.app|ngrok\.io|loca\.lt|onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(knowledge_routes.router, prefix="/api")
app.include_router(automation_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "knowledge-hub-ai"}


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    candidate = FRONTEND_DIST / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)
    index = FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    return JSONResponse({"detail": "Frontend build missing. Run npm run build in frontend/."}, status_code=404)
