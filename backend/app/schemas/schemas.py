from datetime import date, datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    picture: str | None = None
    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    category: str | None = None
    owner: str | None = None
    status: str
    version: str
    last_verified_date: date | None = None
    confidentiality_level: str
    model_config = {"from_attributes": True}


class DocumentDetailOut(DocumentOut):
    document_type: str | None = None
    source_location: str | None = None
    extracted_text: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AutomationOut(BaseModel):
    id: int
    name: str
    short_description: str
    business_function: str | None = None
    capabilities: str | None = None
    owner: str | None = None
    technology: str | None = None
    status: str
    last_reviewed_date: date | None = None
    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: int | None = None


class SourceOut(BaseModel):
    type: str
    title: str
    id: int
    snippet: str
    version: str | None = None
    owner: str | None = None
    last_verified_date: str | None = None
    href: str | None = None
    download_url: str | None = None
    filename: str | None = None


class ChatResponse(BaseModel):
    session_id: int
    message_id: int
    answer: str
    sources: list[SourceOut]
    knowledge_gap: bool = False


class FeedbackIn(BaseModel):
    message_id: int | None = None
    rating: str
    reason: str | None = None
    comment: str | None = None
