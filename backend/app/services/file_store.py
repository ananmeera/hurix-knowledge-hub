from pathlib import Path

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def save_document_file(document_id: int, filename: str, content: bytes) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename or "document").name.replace("..", "").strip() or "document"
    stored_name = f"{document_id}_{safe_name}"
    (UPLOAD_DIR / stored_name).write_bytes(content)
    return stored_name


def resolve_stored_file(source_location: str | None) -> Path | None:
    if not source_location:
        return None
    path = UPLOAD_DIR / Path(source_location).name
    if path.is_file():
        return path
    return None
