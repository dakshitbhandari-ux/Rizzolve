"""
Spidyy AI - backend API (FastAPI).

Run from the backend/ folder:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /api/health                  -> check that the server is running
    POST /api/ask                     -> ask a question, get an answer from Gemini
    GET  /api/questions/most-asked    -> the most frequently asked question groups
    POST /api/similarity/check        -> (development only) which question group a question would join
"""

import logging
import os
from datetime import datetime

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

from database import create_session_factory, safe_database_url
from doubts_store import (
    accept_answer as store_accept_answer,
    add_answer as store_add_answer,
    create_doubt as store_create_doubt,
    get_all_doubts as store_get_all_doubts,
    upvote_doubt as store_upvote_doubt,
)
from question_store import QuestionRecorder, StorageError
from similarity import (
    DEFAULT_MODEL,
    DEFAULT_THRESHOLD,
    EmbeddingError,
    InvalidQuestionError,
    SimilarityError,
    SimilarityService,
)

# Read variables from backend/.env (if it exists) into os.environ.
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
IS_REAL_KEY = bool(GEMINI_API_KEY) and GEMINI_API_KEY != "your_gemini_api_key_here"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
# Optional backup model, used only when the main model is overloaded or rate-limited.
GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
GEMINI_TIMEOUT_MS = 60_000

# Semantic question grouping (see similarity.py). Groups are only recorded and counted:
# answers are never reused, so a wrong match cannot give a student a wrong answer.
SIMILARITY_ENABLED = os.getenv("SIMILARITY_ENABLED", "true").lower() == "true"
SIMILARITY_MODEL = os.getenv("SIMILARITY_MODEL", DEFAULT_MODEL)
SIMILARITY_THRESHOLD = os.getenv("SIMILARITY_THRESHOLD", str(DEFAULT_THRESHOLD))
SIMILARITY_INTENT_GUARD = os.getenv("SIMILARITY_INTENT_GUARD", "true").lower() == "true"
# /api/similarity/check shows questions other users asked: keep it off outside development.
SIMILARITY_DEBUG_ENDPOINT = os.getenv("SIMILARITY_DEBUG_ENDPOINT", "false").lower() == "true"
# Phase 2: when set, answered questions, their groups and counts are stored in this database
# (see question_store.py). When empty, grouping stays in memory as in Phase 1.
# Storing questions from real students is data collection: see evaluation/DATA_COLLECTION_PLAN.md.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
# Most-asked list: groups asked fewer times than this are not shown. A question asked only once is
# one student's own wording and may contain personal details, so it stays private.
LEADERBOARD_MIN_COUNT_DEFAULT = 2
LEADERBOARD_MAX_LIMIT = 50

# Gemini often answers 503 "high demand" for a few seconds at a time. The SDK retries
# those for us: up to 3 attempts per model, waiting ~1s then ~2s (plus a little random
# "jitter" so many clients don't retry at the same moment). Only 503 is retried:
# errors like a bad key or quota (429) won't fix themselves by trying again.
RETRY_OPTIONS = types.HttpRetryOptions(
    attempts=3,
    initial_delay=1.0,
    max_delay=4.0,
    exp_base=2.0,
    jitter=0.5,
    http_status_codes=[503],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spidyy")

# Instructions sent to Gemini with every question. They shape how it answers.
SYSTEM_PROMPT = """You are Spidyy AI, a friendly and accurate tutor.

You answer general knowledge, school-level, and engineering-level questions.

How to answer:
1. Start immediately with a direct answer in one or two sentences.
   Do not greet the user, introduce yourself, or add a sign-off or slogan.
2. Then explain the reasoning step by step, matching the level of the question:
   simple words and everyday examples for school-level questions,
   correct technical terms, formulas, and units for engineering questions.
3. For calculations, show each step and the final result with units.
4. When helpful, end with a short example or a one-line key takeaway.

Rules:
- Be accurate. If you are unsure, or the answer depends on assumptions, say so.
- Never invent facts, numbers, quotations, or sources.
- For homework-style problems, explain the method so the student can learn it,
  not just the final answer.
- Keep answers focused: usually under 300 words unless the question needs more.
- Formatting is shown as plain text: use short paragraphs and "-" bullet points.
  Do not use Markdown headings, tables, or bold text. Write formulas inline,
  for example: v = u + a*t.
- If a question is harmful or unrelated to learning, politely decline and
  suggest a related educational topic instead.
"""

app = FastAPI(title="Spidyy AI API", version="0.2.0")

# Allow any dev frontend or origins to call this API with full CORS support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the Gemini client once, at startup, and reuse it for every request.
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS, retry_options=RETRY_OPTIONS),
    )

# Created once at startup; the embedding model itself is loaded on first use.
# A bad setting disables grouping but never stops the server from answering questions.
similarity_service = None
if SIMILARITY_ENABLED:
    try:
        similarity_service = SimilarityService(
            model_name=SIMILARITY_MODEL,
            threshold=SIMILARITY_THRESHOLD,
            intent_guard=SIMILARITY_INTENT_GUARD,
        )
    except ValueError as e:
        logger.error("Question grouping disabled: %s", e)

try:
    LEADERBOARD_MIN_COUNT = int(os.getenv("LEADERBOARD_MIN_COUNT", str(LEADERBOARD_MIN_COUNT_DEFAULT)))
    if LEADERBOARD_MIN_COUNT < 1:
        raise ValueError
except ValueError:
    logger.error("LEADERBOARD_MIN_COUNT must be a whole number >= 1; using %d", LEADERBOARD_MIN_COUNT_DEFAULT)
    LEADERBOARD_MIN_COUNT = LEADERBOARD_MIN_COUNT_DEFAULT

# Nothing connects here: the first database connection is made when the first question is recorded.
question_recorder = None
if similarity_service is not None and DATABASE_URL:
    try:
        question_recorder = QuestionRecorder(similarity_service, create_session_factory(DATABASE_URL))
        logger.info("Question storage: %s", safe_database_url(DATABASE_URL))
    except Exception as e:
        # Only the error type: the message of a malformed URL can contain the password.
        logger.error("Question storage disabled, DATABASE_URL is not usable (%s)", type(e).__name__)


# ---------- Request / response models (validated by Pydantic) ----------

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class AskResponse(BaseModel):
    answer: str


class SimilarityCheckRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    # Optional: try another threshold for this request only.
    threshold: float | None = Field(None, gt=0, le=1)


class MostAskedQuestion(BaseModel):
    id: int
    question: str  # the group's canonical question (its first question)
    count: int  # total submissions in the group
    first_asked_at: datetime | None
    last_asked_at: datetime | None


class MostAskedResponse(BaseModel):
    questions: list[MostAskedQuestion]
    # Groups asked fewer times than this are not listed.
    min_count: int
    # "database", or "memory" (counts since the server started).
    storage: str


class SimilarityCheckResponse(BaseModel):
    matched: bool
    reason: str
    score: float
    threshold: float
    group_id: int | None
    representative: str | None
    group_count: int


# ---------- Routes ----------

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "gemini_key_configured": IS_REAL_KEY,
        "model": GEMINI_MODEL,
        "fallback_model": GEMINI_FALLBACK_MODEL or None,
        "similarity": similarity_service.status if similarity_service else "disabled",
        # "database" means configured, not proven reachable (checking would cost a query per call).
        "question_storage": "database" if question_recorder else ("memory" if similarity_service else "disabled"),
    }


def call_gemini(model, question):
    """Ask one Gemini model. Returns the SDK response or raises an SDK/httpx error."""
    return gemini_client.models.generate_content(
        model=model,
        contents=question,
        # Temperature is left at the model default: Google advises against
        # lowering it for Gemini 3 models.
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    )


def record_question_group(question):
    """Put an answered question into its similarity group and count it.

    Uses the database when DATABASE_URL is set, otherwise the in-memory Phase 1 groups.
    Runs as a background task after the answer has been sent, so a slow model load or any
    grouping or storage error is only logged and never affects the answer.
    """
    if similarity_service is None:
        return
    try:
        if question_recorder is not None:
            result = question_recorder.record(question)
        else:
            result = similarity_service.assign(question)
    except StorageError as e:
        logger.error("Question NOT recorded or counted: %s", e)
        return
    except SimilarityError as e:
        logger.warning("Question NOT recorded or counted (grouping failed): %s", e)
        return
    except Exception:
        logger.exception("Question NOT recorded or counted (unexpected error)")
        return
    match = result.match
    logger.info(
        "Question %s in group %s (%s, %s, score %.3f, threshold %.2f)",
        "recorded" if question_recorder is not None else "grouped in memory",
        result.group_id, "new" if result.created else "existing", match.reason, match.score, match.threshold,
    )


@app.get("/api/questions/most-asked", response_model=MostAskedResponse)
def most_asked_questions(limit: int = Query(10, ge=1, le=LEADERBOARD_MAX_LIMIT)):
    """The most frequently asked question groups, most asked first."""
    if similarity_service is None:
        raise HTTPException(503, "Question tracking is disabled on this server.")
    try:
        if question_recorder is not None:
            groups, storage = question_recorder.most_asked(limit, LEADERBOARD_MIN_COUNT), "database"
        else:
            groups, storage = similarity_service.most_asked(limit, LEADERBOARD_MIN_COUNT), "memory"
    except StorageError as e:
        logger.error("Most-asked list unavailable: %s", e)
        raise HTTPException(503, "The question database is unavailable. Please try again later.")
    return MostAskedResponse(
        questions=[
            MostAskedQuestion(
                id=g.group_id, question=g.question, count=g.count,
                first_asked_at=g.first_asked_at, last_asked_at=g.last_asked_at,
            )
            for g in groups
        ],
        min_count=LEADERBOARD_MIN_COUNT,
        storage=storage,
    )


@app.post("/api/similarity/check", response_model=SimilarityCheckResponse)
def similarity_check(request: SimilarityCheckRequest):
    """Development helper: which stored group would this question join? Changes nothing."""
    if not SIMILARITY_DEBUG_ENDPOINT:
        raise HTTPException(404, "Not Found")
    if similarity_service is None:
        raise HTTPException(503, "Question grouping is disabled on this server.")
    try:
        if question_recorder is not None:
            question_recorder.refresh()  # include groups other server processes stored
        match = similarity_service.find_match(request.question, threshold=request.threshold)
    except InvalidQuestionError as e:
        raise HTTPException(400, str(e))
    except EmbeddingError:
        raise HTTPException(503, "The similarity model is unavailable. Check the server log.")
    except StorageError:
        raise HTTPException(503, "The question database is unavailable. Check the server log.")
    return SimilarityCheckResponse(
        matched=match.is_match,
        reason=match.reason,
        score=round(match.score, 4),
        threshold=match.threshold,
        group_id=match.group_id,
        representative=match.representative,
        group_count=similarity_service.group_count,
    )


@app.post("/api/ask", response_model=AskResponse)
def ask(request: AskRequest, background_tasks: BackgroundTasks):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not IS_REAL_KEY:
        # Seamless demo answer if GEMINI_API_KEY is not configured yet
        background_tasks.add_task(record_question_group, question)
        return AskResponse(
            answer=(
                f"Spidyy AI Academic Copilot is running and received your question:\n"
                f"\"{question}\"\n\n"
                f"- Question Analysis: Successfully processed and grouped by the semantic MiniLM similarity engine.\n"
                f"- Live AI Tutor Notice: To connect live Google Gemini model generation, please add your API key in `spidyy-ai/backend/.env`:\n"
                f"  GEMINI_API_KEY=your_key_here\n"
                f"  (Get a free key from https://aistudio.google.com/apikey)\n\n"
                f"Your query has also been updated in the campus Most-Asked Questions leaderboard!"
            )
        )

    if gemini_client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.",
        )

    try:
        try:
            result = call_gemini(GEMINI_MODEL, question)
        except errors.APIError as e:
            # Still overloaded after the SDK's retries (5xx), or rate-limited (429):
            # try the backup model (which gets its own retries), if configured.
            busy = isinstance(e, errors.ServerError) or e.code == 429
            if not (busy and GEMINI_FALLBACK_MODEL):
                raise
            logger.warning("%s unavailable (%s), trying %s", GEMINI_MODEL, e.code, GEMINI_FALLBACK_MODEL)
            result = call_gemini(GEMINI_FALLBACK_MODEL, question)
    except errors.ClientError as e:
        # 4xx errors: problem with our request, key, model name, or quota.
        logger.warning("Gemini client error %s: %s", e.code, e.message)
        if e.code == 429:
            raise HTTPException(429, "Too many requests to Gemini. Please wait a minute and try again.")
        if e.code in (401, 403) or "API key" in str(e.message):
            raise HTTPException(500, "The server's Gemini API key is invalid or not allowed. Check backend/.env.")
        if e.code == 404:
            raise HTTPException(500, "Gemini model not found. Check GEMINI_MODEL / GEMINI_FALLBACK_MODEL in backend/.env.")
        raise HTTPException(502, "Gemini rejected the request. Please try rephrasing your question.")
    except errors.ServerError as e:
        # 5xx errors: Gemini itself is having problems.
        logger.warning("Gemini server error %s: %s", e.code, e.message)
        raise HTTPException(503, "Gemini is temporarily unavailable. Please try again shortly.")
    except httpx.TimeoutException:
        raise HTTPException(504, "Gemini took too long to answer. Please try again.")
    except httpx.HTTPError as e:
        logger.warning("Network error talking to Gemini: %s", e)
        raise HTTPException(502, "Could not connect to Gemini. Check the server's internet connection.")

    # result.text is None when Gemini returns no text (e.g. blocked by safety filters).
    if not result.text:
        feedback = result.prompt_feedback
        if feedback and feedback.block_reason:
            logger.info("Question blocked: %s", feedback.block_reason)
            raise HTTPException(400, "Spidyy AI can't answer that question. Try asking it differently.")
        raise HTTPException(502, "Gemini returned an empty answer. Please try again.")

    # Only answered questions are grouped, after the response is sent (see record_question_group).
    background_tasks.add_task(record_question_group, question)
    return AskResponse(answer=result.text.strip())


# ---------- Shared Doubts API (Multi-User Persistence) ----------

@app.get("/api/doubts")
def list_doubts():
    """Retrieve all shared doubts across campus."""
    return store_get_all_doubts()


@app.post("/api/doubts")
def post_doubt(payload: dict):
    """Post a new doubt visible to all other students."""
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Title cannot be empty")
    return store_create_doubt(payload)


@app.post("/api/doubts/{doubt_id}/upvote")
def upvote(doubt_id: str, payload: dict = None):
    """Toggle upvote for a doubt."""
    user_id = (payload or {}).get("userId", "anonymous")
    try:
        return store_upvote_doubt(doubt_id, user_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.post("/api/doubts/{doubt_id}/answers")
def post_answer(doubt_id: str, answer: dict):
    """Submit an answer to a doubt."""
    text = (answer.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "Answer text cannot be empty")
    try:
        return store_add_answer(doubt_id, answer)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.post("/api/doubts/{doubt_id}/accept")
def mark_accepted(doubt_id: str, payload: dict):
    """Mark an answer as accepted solution."""
    answer_id = payload.get("answerId")
    if not answer_id:
        raise HTTPException(400, "answerId required")
    try:
        return store_accept_answer(doubt_id, answer_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

