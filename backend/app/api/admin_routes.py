from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.auth.dependencies import require_roles
from app.models import User, Document, AutomationCatalog, KnowledgeGap, Feedback, ChatMessage

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER"))):
    total_feedback = db.query(func.count(Feedback.id)).scalar() or 0
    positive = db.query(func.count(Feedback.id)).filter(Feedback.rating == "UP").scalar() or 0
    status_rows = db.query(Document.status, func.count(Document.id)).group_by(Document.status).all()
    documents_by_status = {status or "UNKNOWN": count for status, count in status_rows}

    since = datetime.utcnow() - timedelta(days=6)
    daily_rows = (
        db.query(func.date(ChatMessage.created_at), func.count(ChatMessage.id))
        .filter(ChatMessage.role == "user", ChatMessage.created_at >= since)
        .group_by(func.date(ChatMessage.created_at))
        .all()
    )
    daily_map = {str(day): count for day, count in daily_rows}
    questions_last_7_days = []
    for offset in range(6, -1, -1):
        day = (datetime.utcnow() - timedelta(days=offset)).date().isoformat()
        questions_last_7_days.append({"date": day, "count": daily_map.get(day, 0)})

    return {
        "total_documents": db.query(func.count(Document.id)).scalar() or 0,
        "approved_documents": db.query(func.count(Document.id)).filter(Document.status == "APPROVED").scalar() or 0,
        "outdated_documents": db.query(func.count(Document.id)).filter(Document.status == "OUTDATED").scalar() or 0,
        "draft_documents": db.query(func.count(Document.id)).filter(Document.status == "DRAFT").scalar() or 0,
        "knowledge_gaps": db.query(func.count(KnowledgeGap.id)).filter(KnowledgeGap.status == "OPEN").scalar() or 0,
        "available_automations": db.query(func.count(AutomationCatalog.id)).filter(AutomationCatalog.status == "ACTIVE").scalar() or 0,
        "total_questions": db.query(func.count(ChatMessage.id)).filter(ChatMessage.role == "user").scalar() or 0,
        "positive_feedback_rate": round((positive / total_feedback * 100), 1) if total_feedback else 0,
        "active_users": db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0,
        "documents_by_status": documents_by_status,
        "questions_last_7_days": questions_last_7_days,
    }
