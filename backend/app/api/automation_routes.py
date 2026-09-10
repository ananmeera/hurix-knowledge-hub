from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, AutomationCatalog
from app.schemas import AutomationOut

router = APIRouter(prefix="/automations", tags=["automations"])


@router.get("", response_model=list[AutomationOut])
def list_automations(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(AutomationCatalog)
    if q:
        like = f"%{q}%"
        query = query.filter((AutomationCatalog.name.ilike(like)) | (AutomationCatalog.short_description.ilike(like)) | (AutomationCatalog.capabilities.ilike(like)))
    return query.order_by(AutomationCatalog.name).all()
