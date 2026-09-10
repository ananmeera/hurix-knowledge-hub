from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.models import models  # noqa: F401
from app.api import auth_routes, chat_routes, knowledge_routes, automation_routes, admin_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Knowledge Hub AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
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
