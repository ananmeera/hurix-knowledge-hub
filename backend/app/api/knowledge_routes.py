from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.auth.dependencies import get_current_user, require_roles
from app.models import User, Document, DocumentChunk
from app.schemas import DocumentOut, DocumentDetailOut
from app.services.document_service import extract_text, chunk_text
from app.services.file_store import save_document_file, resolve_stored_file

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


def _get_visible_document(document_id: int, db: Session, user: User) -> Document:
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user.role == "EMPLOYEE" and doc.status != "APPROVED":
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Document)
    if user.role == "EMPLOYEE":
        q = q.filter(Document.status == "APPROVED")
    return q.order_by(Document.updated_at.desc()).all()


@router.get("/documents/{document_id}", response_model=DocumentDetailOut)
def get_document(document_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_visible_document(document_id, db, user)


@router.get("/documents/{document_id}/file")
def download_document_file(document_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = _get_visible_document(document_id, db, user)
    stored = resolve_stored_file(doc.source_location)
    if not stored:
        raise HTTPException(status_code=404, detail="Original file is not available for this document")
    download_name = Path(doc.source_location).name.split("_", 1)[-1]
    return FileResponse(stored, filename=download_name)


@router.post("/documents/upload", response_model=DocumentDetailOut)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("General"),
    owner: str = Form(""),
    version: str = Form("1.0"),
    confidentiality_level: str = Form("PUBLIC_INTERNAL"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER")),
):
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    try:
        text = extract_text(file.filename or "", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    doc = Document(
        title=title,
        description=f"Uploaded from {file.filename}",
        category=category,
        document_type=(file.filename or "").split(".")[-1].upper(),
        owner=owner or user.name,
        source_location=file.filename,
        status="DRAFT",
        version=version,
        confidentiality_level=confidentiality_level,
        extracted_text=text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc.source_location = save_document_file(doc.id, file.filename or "document", content)
    for idx, chunk in enumerate(chunk_text(text)):
        db.add(DocumentChunk(document_id=doc.id, chunk_index=idx, content=chunk, metadata_json={"filename": file.filename}))
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/documents/{document_id}/approve", response_model=DocumentOut)
def approve(document_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER"))):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = "APPROVED"
    title_key = (doc.title or "").strip().lower()
    if title_key:
        for other in db.query(Document).filter(Document.id != doc.id).all():
            if (other.title or "").strip().lower() == title_key and (other.status or "").strip().upper() == "APPROVED":
                other.status = "OUTDATED"
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/documents/{document_id}/outdated", response_model=DocumentOut)
def mark_outdated(document_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("SUPER_ADMIN", "ADMIN", "KNOWLEDGE_MANAGER"))):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = "OUTDATED"
    db.commit()
    db.refresh(doc)
    return doc
