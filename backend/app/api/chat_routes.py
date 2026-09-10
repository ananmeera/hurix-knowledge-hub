from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, ChatSession, ChatMessage, Feedback
from app.schemas import ChatRequest, ChatResponse, SourceOut, FeedbackIn
from app.rag import answer_question

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.get(ChatSession, payload.session_id) if payload.session_id else None
    if session and session.user_id != user.id:
        session = None
    if not session:
        session = ChatSession(user_id=user.id, title=payload.message[:70] or "New chat")
        db.add(session)
        db.commit()
        db.refresh(session)

    db.add(ChatMessage(session_id=session.id, role="user", content=payload.message))
    answer, sources, gap = await answer_question(db, payload.message, user)
    assistant = ChatMessage(session_id=session.id, role="assistant", content=answer, sources_json=sources)
    db.add(assistant)
    db.commit()
    db.refresh(assistant)
    return ChatResponse(
        session_id=session.id,
        message_id=assistant.id,
        answer=answer,
        sources=[SourceOut(**{k: s.get(k) for k in SourceOut.model_fields}) for s in sources],
        knowledge_gap=gap,
    )


@router.get("/chat/sessions")
def sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc()).limit(30).all()
    return [{"id": x.id, "title": x.title, "created_at": x.created_at} for x in items]


@router.get("/chat/sessions/{session_id}")
def session_messages(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != user.id:
        return []
    msgs = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "sources": m.sources_json or [], "created_at": m.created_at} for m in msgs]


@router.post("/feedback")
def feedback(payload: FeedbackIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = Feedback(user_id=user.id, message_id=payload.message_id, rating=payload.rating, reason=payload.reason, comment=payload.comment)
    db.add(row)
    db.commit()
    return {"ok": True}
