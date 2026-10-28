# Spidyy AI

**Ask Anything. Learn Everything.**

An educational question-answering app for general knowledge, school-level, and engineering-level questions, powered by Google Gemini.

## Architecture

```
Browser (React + Vite, port 5173)
   │  POST /api/ask  { "question": "..." }        GET /api/questions/most-asked?limit=10
   ▼                                              (the "Most asked questions" panel)
FastAPI backend (Python, port 8000)
   │  validates input with Pydantic
   │  google-genai SDK                         after a successful answer (background task):
   ▼                                           group + count the question (MiniLM similarity)
Google Gemini API                                 └─► PostgreSQL, optional (DATABASE_URL)
```

**Most asked questions, end to end:** a student asks a question → Gemini answers → in the background the
similarity engine finds the question's group (or creates one) → the question is stored and the group's
count goes up by one → `GET /api/questions/most-asked` returns the groups asked most often → the React panel
shows them and reloads shortly after each answer.

- The **API key lives only in the backend** (`backend/.env`). The browser never sees it.
- The frontend only knows the backend URL (`VITE_API_BASE_URL`).
- No auth, and each question is answered independently. A database is optional: it only stores question
  groups and counts (Phase 2) and is never needed to answer a question.
- Models are set in `backend/.env`: `GEMINI_MODEL` (main, default `gemini-3.1-flash-lite`) and an optional
  `GEMINI_FALLBACK_MODEL`, tried once only when the main model is overloaded (5xx) or rate-limited (429).
  Model availability changes often; if you get a "model not found" error, list the models your key can use.
- Gemini 503 "high demand" errors are retried automatically by the google-genai SDK (`RETRY_OPTIONS` in
  `main.py`): up to 3 attempts per model, waiting ~1 s then ~2 s with random jitter. Other errors are not retried.

## Folder structure

```
spidyy-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # App name + tagline
│   │   │   ├── WelcomeScreen.jsx  # Shown before the first question
│   │   │   ├── ChatMessage.jsx    # One chat bubble
│   │   │   ├── ChatInput.jsx      # Text box + Ask button
│   │   │   └── MostAskedQuestions.jsx  # Live "Most asked questions" panel
│   │   ├── services/api.js        # All fetch() calls to the backend
│   │   ├── App.jsx                # Holds chat state
│   │   ├── main.jsx               # React entry point
│   │   └── index.css              # Plain CSS styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── main.py                    # FastAPI app + routes
│   ├── similarity.py              # Semantic question grouping (MiniLM + cosine similarity)
│   ├── database.py                # Engine/session from DATABASE_URL
│   ├── models.py                  # Tables: question_groups, question_submissions
│   ├── question_store.py          # Stores questions in groups, keeps counts (transactions, locks)
│   ├── init_db.py                 # Creates missing tables; never drops or alters
│   ├── evaluation/                # Labelled question pairs + evaluation script
│   ├── tests/                     # pytest: similarity, storage, API, evaluation
│   ├── requirements.txt
│   ├── requirements-dev.txt       # + pytest
│   ├── pytest.ini
│   └── .env.example
├── .gitignore
└── README.md
```

## API

| Method | Path          | Body                     | Response                                     |
|--------|---------------|--------------------------|----------------------------------------------|
| GET    | `/api/health` | –                        | `{ status, gemini_key_configured, model, fallback_model, similarity, question_storage }` |
| POST   | `/api/ask`    | `{ "question": "..." }`  | `{ "answer": "..." }`                        |
| GET    | `/api/questions/most-asked?limit=10` | – | `{ questions: [...], min_count, storage }` (see below) |

Errors come back as `{ "detail": "..." }` with a message the UI shows directly:

| Status | Meaning |
|--------|---------|
| 400 | Empty question, or Gemini blocked it (safety filters) |
| 422 | Request body invalid (e.g. question longer than 2000 characters) |
| 429 | Gemini rate limit / quota reached |
| 500 | Server misconfigured: missing/invalid API key or unknown model name |
| 502 | Gemini rejected the request, returned nothing, or was unreachable |
| 503 | Gemini is temporarily unavailable |
| 504 | Gemini took longer than 60 seconds |

The tutor's behaviour is controlled by `SYSTEM_PROMPT` in `backend/main.py`.

### `GET /api/questions/most-asked`

The most frequently asked question groups, most asked first. Ties go to the most recently asked group first,
then the older group.

| Query parameter | Default | Allowed |
|-----------------|---------|---------|
| `limit` | `10` | 1–50 (anything else: `422`) |

Example response (illustrative values, not project data):

```json
{
  "questions": [
    {
      "id": 1,
      "question": "What is machine learning?",
      "count": 45,
      "first_asked_at": "2026-10-27T19:15:30.829897Z",
      "last_asked_at": "2026-10-28T08:02:11.104552Z"
    }
  ],
  "min_count": 2,
  "storage": "database"
}
```

| Field | Meaning |
|-------|---------|
| `question` | The group's canonical question: the first question recorded in the group |
| `count` | Total submissions in the group (one student asking twice counts twice) |
| `first_asked_at`, `last_asked_at` | UTC times the first and the latest question of the group were **recorded** |
| `min_count` | Groups asked fewer times than this are not listed (`LEADERBOARD_MIN_COUNT`, default 2) |
| `storage` | `database`, or `memory` when `DATABASE_URL` is not set (counts since the server started) |

- **What is never returned:** embeddings, the individual submissions, answers or anything about who asked.
- **Why groups asked only once are hidden by default:** a question asked once is one student's own wording and
  may contain personal details.
- **Errors:** `503` when question tracking is disabled or the database cannot be read. The detail message
  doesn't include any database information.
- An empty list (`"questions": []`) is a normal `200` response.

```powershell
Invoke-RestMethod "http://localhost:8000/api/questions/most-asked?limit=5" | ConvertTo-Json -Depth 4
```

## Question grouping (Phase 1)

`backend/similarity.py` detects differently worded questions that ask for the same answer
("What is machine learning?" / "Explain machine learning.") and puts them in one group.

- After a **successful** answer, `/api/ask` records the question's group in a background task.
  The answer and its response format are unchanged, and grouping errors are only logged.
- **Answers are not reused yet.** A wrong match would give a student an answer to a different question,
  so answer reuse needs an evaluated threshold first.
- Matching: exact text (after normalising case, spaces and punctuation) first, then cosine similarity of
  `all-MiniLM-L6-v2` embeddings against each group's representative (its first question). Representative
  embeddings are stored, so existing questions are never embedded again. The model loads once, on first use
  (the first time it downloads ~90 MB from Hugging Face).
- **Intent guard:** cosine similarity alone mixes up questions on the same topic with different intents.
  Measured with MiniLM: "Advantages of linked list" vs "Disadvantages of linked list" = 0.95,
  "Define inheritance" vs "Give an example of inheritance" = 0.81, but the real paraphrase
  "What is machine learning?" vs "Explain machine learning." = 0.83. So a match must also have the same
  keyword intent (types, example, applications, advantages, disadvantages, comparison, why/importance,
  how/process, history) and the same numbers/ordinals. This is an English keyword heuristic.
- Without a database, groups are kept in memory and are lost when the server restarts. With `DATABASE_URL`
  set, they are stored (Phase 2, below).

Settings (`backend/.env`):

| Variable | Default | Meaning |
|----------|---------|---------|
| `SIMILARITY_ENABLED` | `true` | Turn grouping off entirely |
| `SIMILARITY_THRESHOLD` | `0.80` | Cosine similarity needed to join a group, in (0, 1] |
| `SIMILARITY_INTENT_GUARD` | `true` | Also require the same intent and numbers |
| `SIMILARITY_DEBUG_ENDPOINT` | `false` | Enables `POST /api/similarity/check` (shows stored questions, development only) |
| `SIMILARITY_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |

The 0.80 default came from 23 hand-labelled pairs. On the larger labelled set in `backend/evaluation/`
(194 pairs) it gives test precision 0.85 and recall 0.78, about the same as cosine alone at 0.85: the intent
guard has not yet proven better than a higher threshold. See `backend/evaluation/README.md` for the full
results, the error analysis and the limitations (all pairs written by one author).
With `SIMILARITY_DEBUG_ENDPOINT=true`, `POST /api/similarity/check` with `{ "question": "...", "threshold": 0.85 }`
shows which group a question would join and its score, without storing anything.

## Question storage and frequency counts (Phase 2)

With `DATABASE_URL` set, every **answered** question is stored and counted in its group, so the most
frequently asked underlying questions can be found later (the ranking API is Phase 3).
Without it, nothing is stored and grouping stays in memory as in Phase 1.

> **Privacy:** this stores the text of every answered question. Turning it on for an app that real students
> use is data collection and needs approval first (see `backend/evaluation/DATA_COLLECTION_PLAN.md`).
> No user, session, IP address or Gemini answer is stored.

### Tables

| Table | Columns |
|-------|---------|
| `question_groups` | `id`, `canonical_question` (the group's first question), `representative_embedding` (float32 bytes, unit length), `embedding_model`, `embedding_dim`, `question_count` (total submissions), `created_at`, `last_asked_at` |
| `question_submissions` | `id`, `original_question` (as asked; only surrounding spaces removed), `question_hash` (SHA-256 of the normalised text), `question_group_id` → `question_groups.id` (ON DELETE RESTRICT), `match_reason` (`exact` / `similar` / `new`), `similarity_score`, `created_at` |

Indexes: `question_submissions(question_hash)`, `question_submissions(question_group_id, created_at)`,
`question_groups(embedding_model, id)`, `question_groups(question_count)`. Check constraints keep
`question_count >= 0` and `embedding_dim > 0`.

`question_count` counts **submissions**: the same student asking twice counts twice. Unique-student counts
would need a user identifier, which is deliberately not collected.

### How a question is grouped (`question_store.py`)

All matching decisions use the Phase 1 `SimilarityService`: same threshold, same intent guard.

1. **Exact repeat:** a stored submission has the same normalised text, so the question joins that group. No
   embedding is computed.
2. Otherwise the question is **embedded once** and compared with the groups' stored representative embeddings.
   Each server process keeps them in memory, loads them from the database without re-embedding, and
   picks up groups that other processes created.
3. **Match:** the question joins the best group above the threshold that has the same intent.
4. **No match:** a new group is created with this question as its canonical question. Creation happens under a
   lock (a thread lock, plus a PostgreSQL advisory lock shared by all processes). After taking the lock, the
   exact and similarity checks run again, so two requests with the same new question create one group.
   A stored group is never moved, merged or re-checked. Changing the threshold affects only new questions.

### How counts are updated

- Inserting the submission and running `UPDATE question_groups SET question_count = question_count + 1,
  last_asked_at = …` happen in **one transaction**. So `question_count` always equals the number of
  submissions in the group.
- Because the database applies concurrent increments one at a time, none are lost.
- On any database error the transaction is rolled back and a `StorageError` is raised. The log then says
  `Question NOT recorded or counted`, and the in-memory group cache is updated only after a successful commit.
- `/api/ask` is not affected: recording runs after the answer has been sent.
- Questions that Gemini fails to answer or blocks are not counted.

### Database setup (PostgreSQL)

1. Install PostgreSQL (https://www.postgresql.org/download/windows/; the EDB installer, default port 5432).
   Check that it runs: `Get-Service postgresql*` should show `Running`.
2. Open `psql` as the `postgres` superuser (replace `18` with your version folder):
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres
   ```
   Create the app user, the development database and a **separate test database**. Choose your own password,
   letters and digits only, so it needs no escaping in a URL:
   ```sql
   CREATE ROLE spidyy_app LOGIN PASSWORD 'choose-a-strong-password';
   CREATE DATABASE spidyy OWNER spidyy_app;
   CREATE DATABASE spidyy_test OWNER spidyy_app;
   \q
   ```
3. In `backend/.env` (never committed), add:
   ```
   DATABASE_URL=postgresql+psycopg://spidyy_app:YOUR_PASSWORD@localhost:5432/spidyy
   TEST_DATABASE_URL=postgresql+psycopg://spidyy_app:YOUR_PASSWORD@localhost:5432/spidyy_test
   ```
4. Create the tables:
   ```powershell
   cd backend
   .\venv\Scripts\python.exe init_db.py
   ```
   It only creates missing tables; it never drops, empties or alters a table, so running it again is safe.
   If an existing table is missing columns, it reports this and changes nothing. There is no migration tool yet;
   add Alembic before changing the schema of a database that holds data.
5. Start the backend. `/api/health` should show `"question_storage": "database"`. This means the database
   is configured; it does not query the database. Check the log for `Question recorded` after asking a question.

### Environment variables

| Variable | Required | Meaning |
|----------|----------|---------|
| `GEMINI_API_KEY` | yes | Gemini key (backend only) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | no | Gemini models |
| `FRONTEND_ORIGIN` | no | CORS origin of the React app |
| `SIMILARITY_*` | no | Grouping settings (table above) |
| `DATABASE_URL` | no | PostgreSQL URL; unset = no storage. `postgresql://` URLs are switched to the psycopg 3 driver |
| `LEADERBOARD_MIN_COUNT` | no | Hide groups asked fewer times than this from the most-asked list (default `2`; `1` shows everything) |
| `TEST_DATABASE_URL` | tests only | PostgreSQL **test** database for `tests/test_question_store_postgres.py` (environment or `backend/.env`); must differ from `DATABASE_URL` |
| `VITE_API_BASE_URL` | no | In `frontend/.env`: backend URL for the React app (default `http://localhost:8000`) |

## Running the tests

Backend (from `backend/`):

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest
```

Frontend: there is no frontend test framework yet. Check that it compiles with:

```powershell
npm --prefix ..\frontend run build
```

- **What the backend tests cover:** similarity, storage and counting, the leaderboard API, the
  `/api/ask` flow, `init_db.py` and the evaluation script.
- **Real-model tests:** `tests/test_similarity_model.py`, `test_evaluation_model.py` and
  `test_question_store_model.py` use the real MiniLM model and are skipped when it cannot be loaded.
- **No real database or Gemini:** storage and API tests use temporary SQLite databases, and `tests/conftest.py`
  makes sure no test writes to the database in `backend/.env`. Gemini is always faked (no network, no quota).
- **Known expected failures (strict xfail), all the same acronym limitation.** MiniLM does not link some
  acronyms to their full names, so these pairs are not grouped (see `backend/evaluation/README.md`):
  - "What is inheritance in OOP?" vs "Define inheritance in object oriented programming" (0.75 < 0.80)
  - "What is SQL?" vs "What is Structured Query Language?"
  - "What is CPU?" vs "What is a central processing unit?"

  "What is AI?" vs "What is artificial intelligence?" does group, and HTTP vs HTTPS correctly stays separate.

The PostgreSQL tests cover the advisory lock, concurrent counting from several processes, rollback, column
types and the most-asked query. They need `TEST_DATABASE_URL` (see Database setup) and are **skipped** without it:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_question_store_postgres.py -v
```

Each test creates its own schema `spidyy_test_<random>` and drops only that schema afterwards.

## Known limitations

- **PostgreSQL persistence has not been verified yet.** PostgreSQL 18 is installed, but the PostgreSQL tests
  need `TEST_DATABASE_URL` and have not been run. The PostgreSQL-specific code (advisory lock, BIGINT/bytea
  types, multi-process counting, the most-asked query) is therefore untested. Everything else was tested on SQLite.
- **Accuracy figures are synthetic.** Precision ≈ 0.85 and recall ≈ 0.78 come from 194 hand-written pairs, not
  real student questions. Real-world accuracy is unknown.
- **Most-asked list:**
  - The canonical question is the first question **recorded** in a group. When two paraphrases arrive almost
    together (for example while the model loads for the first time after a restart), the second one asked can
    become the canonical question.
  - `first_asked_at` and `last_asked_at` are recording times. They can be a few seconds after the moment of
    asking while the model loads.
  - Hiding groups asked only once does not guarantee privacy. A canonical question asked several times is
    still one student's wording, and could contain personal details.
  - The panel reloads 1.5 s after each answer. If recording takes longer (first model load), the new count
    appears on the next reload or after clicking **Refresh**.
  - On an error the panel keeps showing the last list it loaded, under the error message.
  - In `memory` mode, counts reset whenever the server restarts.
- **Lost counts:**
  - A question answered just before a server crash or restart is not counted, because recording runs after
    the response.
  - Storage failures are logged, not retried.
- **Grouping quality** is Phase 1's: on synthetic test pairs, precision is about 0.85 and recall about 0.78.
  Acronyms are split from their full names, and the intent guard is an English keyword list. Counts inherit
  these errors.
- **Groups never change:**
  - The first question stays canonical.
  - Groups are never merged or split.
  - Changing the threshold does not regroup stored questions.
- **Memory:** every server process holds all group embeddings in memory, about 1.5 KB per group
  (100,000 groups ≈ 150 MB). Larger scale would need a vector index such as pgvector.
- **Group creation is one at a time** across all processes. That's fine at this scale; with heavy traffic of
  brand-new questions it becomes a bottleneck.
- **Picking up other processes' groups** relies on group ids increasing in commit order. This holds because
  groups are created only under the advisory lock. Rows inserted by hand may not be seen until a restart.
- **SQLite** works for tests and single-process development only. Safe multi-process counting needs PostgreSQL.
- **No migrations, no retention or deletion of stored questions, no unique-student counts.**
- **No frontend tests.** The React panel was checked manually in a browser: wide, narrow and phone layouts,
  plus the empty, loading, data and error states.

## Prerequisites

- Python 3.10+
- Node.js 20.19+ (required by Vite 7)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Running locally

### Backend (Windows PowerShell, first terminal)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit .env: Gemini key, and DATABASE_URL if you use PostgreSQL
python init_db.py           # only with DATABASE_URL set; safe to run again
uvicorn main:app --reload --port 8000
```

Check it: open http://localhost:8000/api/health (interactive docs at http://localhost:8000/docs).
`question_storage` should be `database` with PostgreSQL configured, or `memory` without it.

### Frontend (second terminal)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (use `localhost`, not `127.0.0.1`: CORS allows `FRONTEND_ORIGIN` only).
The "Most asked questions" panel is to the right of the chat on wide screens, and a collapsible card under the
header on smaller ones. By default a question appears there once it has been asked twice.

## Status

- [x] Project structure, chat UI, REST wiring, input validation
- [x] Gemini call in `POST /api/ask` with an educational system prompt
- [x] Error handling for Gemini failures (key, quota, model, outages, timeouts, blocked answers)
- [x] First real-key test (8 questions, school + engineering + one "future event" trap): main answers correct,
      one inaccurate side detail (anthem called a "Hindi version"); Gemini 503 "high demand" errors were frequent
- [x] Automatic retry for Gemini 503 errors (re-test: 8/8 answered on the first request; 2 needed one retry)
- [x] Phase 1 question grouping: MiniLM embeddings + cosine similarity + intent guard, recorded only (86 tests pass, 1 known miss marked xfail)
- [x] Labelled question-pair set (194 pairs, dev/test) and evaluation script: `backend/evaluation/`
- [x] Phase 2 storage: question groups, submissions and counts in PostgreSQL via SQLAlchemy (tested on SQLite;
      PostgreSQL tests written but not yet run against a server)
- [x] Phase 3: `GET /api/questions/most-asked` (35 API tests, database and memory modes)
- [x] Phase 4: React "Most asked questions" panel (build passes; checked in a browser with real Gemini answers
      and a temporary SQLite database)
- [ ] Run `tests/test_question_store_postgres.py` against the local PostgreSQL server (needs `TEST_DATABASE_URL`)
- [ ] Label real student questions (two annotators) for a stronger test set; decide guard vs higher threshold
- [ ] Only after that, consider reusing answers within a group
- [ ] Turn the test questions into a repeatable evaluation set with expected answers
- [ ] Show progress for slow answers (Gemini sometimes takes 15–50 s) and add a frontend timeout
- [ ] Markdown rendering of answers
- [ ] Conversation memory (currently each question is answered independently)

## Security

Never commit `.env`. Only `.env.example` files (placeholders) belong in git. `DATABASE_URL` holds a password:
keep it in `backend/.env` only. Local database files (`*.db`, `*.sqlite`) are ignored by git because they would
contain stored questions.
