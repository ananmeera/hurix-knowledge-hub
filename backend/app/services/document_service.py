from io import BytesIO
from pathlib import Path
from pypdf import PdfReader
from docx import Document as DocxDocument

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def extract_text(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type")
    if ext == ".pdf":
        reader = PdfReader(BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    if ext == ".docx":
        doc = DocxDocument(BytesIO(content))
        lines: list[str] = []
        for paragraph in doc.paragraphs:
            text = (paragraph.text or "").strip()
            if not text:
                continue
            style = (paragraph.style.name or "").lower() if paragraph.style else ""
            if style.startswith("heading 1"):
                lines.append(f"# {text}")
            elif style.startswith("heading 2"):
                lines.append(f"## {text}")
            elif style.startswith("heading 3"):
                lines.append(f"### {text}")
            else:
                lines.append(text)
        return "\n\n".join(lines)
    return content.decode("utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> list[str]:
    clean = " ".join(text.split())
    if not clean:
        return []
    chunks = []
    start = 0
    while start < len(clean):
        end = min(len(clean), start + chunk_size)
        if end < len(clean):
            space = clean.find(" ", end)
            if 0 <= space - end <= 50:
                end = space
        piece = clean[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(clean):
            break
        start = max(start + 1, end - overlap)
        if start < len(clean) and not clean[start].isspace():
            prev = clean.rfind(" ", 0, start)
            if start - prev <= 50:
                start = prev + 1
    return chunks
