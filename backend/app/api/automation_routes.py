import csv
import io
import json
from datetime import date
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user, require_roles
from app.models import User, AutomationCatalog
from app.schemas import AutomationIn, AutomationOut

router = APIRouter(prefix="/automations", tags=["automations"])
ALLOWED_STATUS = {"ACTIVE", "PILOT", "UNDER_DEVELOPMENT", "RETIRED"}


def _upsert_row(db: Session, payload: dict) -> str:
    name = (payload.get("name") or "").strip()
    short = (payload.get("short_description") or "").strip()
    if not name or not short:
        raise HTTPException(status_code=400, detail="Each automation needs a name and short_description")
    status = (payload.get("status") or "ACTIVE").strip().upper()
    if status not in ALLOWED_STATUS:
        status = "ACTIVE"
    existing = db.query(AutomationCatalog).filter_by(name=name).first()
    if existing:
        return "skipped"
    db.add(AutomationCatalog(
        name=name,
        short_description=short,
        detailed_description=(payload.get("detailed_description") or short).strip(),
        business_function=(payload.get("business_function") or None),
        business_problem=(payload.get("business_problem") or None),
        capabilities=(payload.get("capabilities") or None),
        input_requirements=(payload.get("input_requirements") or None),
        output=(payload.get("output") or None),
        owner=(payload.get("owner") or None),
        technology=(payload.get("technology") or None),
        status=status,
        last_reviewed_date=date.today(),
    ))
    return "created"


@router.get("", response_model=list[AutomationOut])
def list_automations(q: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(AutomationCatalog)
    if q:
        like = f"%{q}%"
        query = query.filter((AutomationCatalog.name.ilike(like)) | (AutomationCatalog.short_description.ilike(like)) | (AutomationCatalog.capabilities.ilike(like)))
    return query.order_by(AutomationCatalog.name).all()


@router.post("", response_model=AutomationOut)
def create_automation(payload: AutomationIn, db: Session = Depends(get_db), user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER"))):
    result = _upsert_row(db, payload.model_dump())
    if result == "skipped":
        raise HTTPException(status_code=409, detail="An automation with this name already exists")
    db.commit()
    return db.query(AutomationCatalog).filter_by(name=payload.name.strip()).first()


@router.post("/import")
async def import_automations(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER"))):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    filename = (file.filename or "").lower()
    created = skipped = 0
    try:
        if filename.endswith(".json"):
            rows = json.loads(raw.decode("utf-8-sig"))
            if isinstance(rows, dict):
                rows = rows.get("automations") or rows.get("items") or [rows]
        else:
            text = raw.decode("utf-8-sig")
            rows = list(csv.DictReader(io.StringIO(text)))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}") from exc
    if not rows:
        raise HTTPException(status_code=400, detail="No automation rows found. Use CSV headers or a JSON array.")
    for row in rows:
        cleaned = {str(k).strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in dict(row).items() if k}
        aliases = {"description": "short_description", "summary": "short_description", "function": "business_function", "tech": "technology"}
        for src, dest in aliases.items():
            if src in cleaned and dest not in cleaned:
                cleaned[dest] = cleaned[src]
        outcome = _upsert_row(db, cleaned)
        if outcome == "created":
            created += 1
        else:
            skipped += 1
    db.commit()
    return {"created": created, "skipped": skipped, "total": created + skipped}
