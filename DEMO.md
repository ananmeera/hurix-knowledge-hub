# Knowledge Hub AI — Demo brief

Internal knowledge assistant for Hurix. Employees ask in chat; answers come only from **approved documents** and the **BOT Automations** list. The system cites sources and says it does not know when nothing matches.

Journey: **Find → Understand → Validate → Use → Learn → Improve**.

---

## Stack

| Layer | Choice |
|---|---|
| UI | React + TypeScript (Vite) |
| API | FastAPI |
| Data | SQLite for demo; PostgreSQL-ready |
| Retrieval | Lexical RAG in `backend/app/rag/engine.py` |
| Generation | Off for demo (`LLM_PROVIDER=rag`). Gemini/OpenAI can be turned on later. |
| Auth | Demo login (SUPER_ADMIN). Google Workspace OAuth is wired but not required. |

Local: frontend `http://localhost:5173`, API `http://localhost:8000`.  
Live: Render one-service deploy (UI + API on the same URL).

---

## How retrieval works

1. User asks a question.
2. The engine scores **approved** Knowledge text and **ACTIVE / PILOT / UNDER_DEVELOPMENT** bots by term overlap, with extra weight on distinctive words and titles (`cmu`, bot name, and so on).
3. Weak or unrelated hits are dropped.
4. The matching section is returned as the answer, with source cards.
5. If nothing is strong enough, chat records a **knowledge gap** and says it cannot answer from verified knowledge.

This is **not** web search. Gemini is paused so answers are not shortened or rewritten.

### Routing

| Question style | Where it searches |
|---|---|
| Contains `bot`, `bots`, or `rpa` | BOT Automations only |
| `category: Manual - pdf accessibility` | Approved Knowledge docs in that category only |
| Anything else | Approved Knowledge + bots, ranked together |

`category:` is optional. Upload the file in Knowledge, set **Category** (for example `Manual`), then **Approve**.

---

## Modules

- **AI Chat** — Q&A, sources, thumbs up/down, session history.
- **Knowledge** — Upload PDF / DOCX / TXT / MD. Draft → Approve / Outdated. Only approved text is searchable.
- **BOT Automations** — 124 real Hurix RPA bots from the RPA list (CSV + seed). Add one or import CSV/JSON.
- **Admin** — Counts, gaps, questions, feedback.

Roles: SUPER_ADMIN, ADMIN, KNOWLEDGE_MANAGER, EMPLOYEE. Department / restricted visibility is applied on documents.

---

## Demo script (about 8 minutes)

1. **Login** — Enter Demo Workspace.
2. **BOT question** — “Does Hurix have a CMU Platform upload BOT?”  
   Expect the CMU bot, source type **Bot**, not a random manual.
3. **Another bot** — “What does the Evolve Automation bot do?”
4. **Knowledge / SOP** — “How do I upload Folens Hive resources?”  
   Expect the Folens manual (must be uploaded and approved).
5. **Category (optional)** — `category: Manual - PDF accessibility`  
   Only if a document is tagged `Manual`.
6. **Unknown** — “What is the 2027 leave policy in Mars?”  
   Expect “not enough verified knowledge” and a gap on Admin.
7. **BOT Automations page** — Search Coursera / MSVGo / Evolve.
8. **Knowledge page** — Show extract, Approve, Mark outdated.
9. **Admin** — BOT count, documents, gaps.

---

## Run locally

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python seed.py
uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm run dev
```

`python seed.py` loads demo SOPs and the 124 bots from `backend/sample_automations.csv`. Folens and other real manuals must be uploaded in Knowledge and approved.

---

## Limits to mention if asked

- Retrieval is lexical (keyword scoring), not pgvector embeddings. That is enough for named bots and manuals; semantic search is the next step.
- SQLite on Render resets on sleep/redeploy; `seed.py` reloads bots on start. Uploaded files must be added again on the live site unless you use a persistent disk or Postgres.
- Demo login is open admin access — fine for judges, not for production.
- Gemini can be re-enabled with `LLM_PROVIDER=gemini` after a stable model and key are set.
