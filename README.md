# Knowledge Hub AI

Hackathon MVP for an internal AI-powered organizational Knowledge Assistant.

The project is designed around the challenge journey: **Find → Understand → Validate → Use → Learn → Improve**. It is intentionally more than a generic chatbot: it includes approved knowledge, source citations, an Automation/RPA catalog, knowledge-gap capture, feedback, role-based access scaffolding, and Google Workspace login support.

## Included in this starter

- React + TypeScript frontend
- FastAPI backend
- SQLAlchemy database layer
- Local SQLite fallback for fastest hackathon startup
- PostgreSQL-compatible configuration for the intended deployment
- Google OAuth 2.0 organization-domain restriction
- Local demo login for development
- Roles: SUPER_ADMIN, ADMIN, KNOWLEDGE_MANAGER, EMPLOYEE
- Knowledge document upload: PDF, DOCX, TXT, MD
- Draft → Approved workflow
- Basic document chunking
- RAG-style retrieval over approved knowledge
- Safe “I don't know” behavior
- Knowledge-gap recording
- AI answers via OpenAI-compatible API when configured
- Safe extractive demo response when API key is not configured
- Automation/RPA catalog
- Chat history persistence
- Source cards under answers
- Feedback buttons
- Admin metrics dashboard
- Responsive and keyboard-accessible UI baseline
- Synthetic demo seed data

## Important MVP note

For a quick local run this project defaults to SQLite. For the hackathon target architecture, switch `DATABASE_URL` to PostgreSQL. pgvector is part of the intended architecture, but this generated MVP keeps embeddings as JSON and uses local lexical scoring so the entire application can run immediately without provisioning a vector extension. The next production-hardening step is to migrate `document_chunks.embedding_json` to a pgvector column and use semantic similarity retrieval.

## Project structure

```text
knowledge-hub-ai/
  backend/
    app/
      api/
      auth/
      core/
      models/
      rag/
      schemas/
      services/
      main.py
    tests/
    seed.py
    requirements.txt
    .env.example
  frontend/
    src/
      auth/
      components/
      layouts/
      pages/
      services/
      types/
    .env.example
    package.json
  README.md
```

## 1. Backend setup - fastest local demo

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

For the easiest local run, edit `.env`:

```env
DATABASE_URL=sqlite:///./knowledge_hub.db
ALLOWED_GOOGLE_DOMAIN=yourcompany.com
DEMO_AUTH_ENABLED=true
```

Seed demo data:

```powershell
python seed.py
```

Start backend:

```powershell
uvicorn app.main:app --reload --port 8000
```

API health:

```text
http://localhost:8000/api/health
```

Interactive API docs:

```text
http://localhost:8000/docs
```

## 2. Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open:

```text
http://localhost:5173
```

Use **Enter Demo Workspace** until Google OAuth is configured.

## 3. Configure Google organization login

Create a Google Cloud OAuth web application and add the redirect URI:

```text
http://localhost:8000/api/auth/google/callback
```

Set backend `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
ALLOWED_GOOGLE_DOMAIN=yourcompany.com
FRONTEND_URL=http://localhost:5173
```

The backend validates the Google ID token and independently verifies that the authenticated email ends with `@ALLOWED_GOOGLE_DOMAIN`. The frontend domain hint is not treated as security enforcement.

For production, use HTTPS and change authentication cookies to `secure=True`.

## 4. Configure AI

Set:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

Chat retrieves approved knowledge first, then Gemini summarizes that result for the screen. Leave `GEMINI_API_KEY` empty to show the retrieved text without generation. OpenAI is still available if you set `LLM_PROVIDER=openai` and `OPENAI_API_KEY`.

## 5. PostgreSQL target setup

Create a PostgreSQL database, then change:

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/knowledge_hub_ai
```

The current ORM schema is PostgreSQL-compatible.

### pgvector production enhancement

For the full semantic RAG implementation:

1. Install/enable PostgreSQL `vector` extension.
2. Change the chunk model to use `Vector(<embedding_dimension>)`.
3. Generate embeddings during document approval/indexing.
4. Query by cosine distance.
5. Apply permissions/status filters before retrieval context reaches the LLM.

The current MVP intentionally separates retrieval in `backend/app/rag/engine.py` so this upgrade does not require rewriting the API or UI.

## 6. Demo scenarios

After running `python seed.py`, try:

- `What automations are available for Excel?`
- `How do I request a new automation?`
- `Find the latest approved IT access process.`
- `What onboarding knowledge is available?`
- Ask about something completely absent to see safe “I don't know” and Knowledge Gap creation.

## 7. Roles

- `SUPER_ADMIN`
- `ADMIN`
- `KNOWLEDGE_MANAGER`
- `EMPLOYEE`

The demo account is seeded as `SUPER_ADMIN` so all screens are visible during development.

## 8. Knowledge upload workflow

1. Sign in as an administrator/knowledge manager.
2. Open **Knowledge**.
3. Upload PDF, DOCX, TXT, or MD.
4. The document is stored as `DRAFT`.
5. Click **Approve**.
6. Only approved documents are used in employee retrieval.
7. Click **Mark outdated** when a source is no longer current. Outdated documents stay in the library for admins but are excluded from AI chat. Click **Approve** again to restore them.

## 9. Security considerations before production

The starter includes backend role checks and organization-domain validation, but a production deployment should additionally add:

- HTTPS everywhere
- secure cookies
- CSRF protections where applicable
- proper Alembic migrations instead of `create_all`
- per-document explicit ACL tables
- encrypted object/file storage
- malware scanning for uploaded files
- prompt/response redaction policies
- request rate limiting
- centralized audit logging
- secrets manager
- Google OAuth consent/security review
- stronger conflict/version approval workflow
- complete pgvector semantic retrieval
- automated security and accessibility testing

## 10. Accessibility

The frontend includes semantic navigation, native buttons/forms, visible focus styling, a skip link, labels, responsive reflow, and `aria-live` feedback for chatbot loading. Continue testing against WCAG 2.2 AA with keyboard, screen reader, axe and manual contrast checks before production.

## 11. No Docker required

Docker is intentionally not included because it is not required for the hackathon MVP. The application runs directly with Python, Node.js and the selected database.
