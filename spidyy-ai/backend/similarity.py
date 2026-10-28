"""
Spidyy AI - semantic question similarity (Phase 1).

Groups differently worded questions that ask for the same answer, for example
"What is machine learning?" and "Explain machine learning.".

How a new question is matched against the existing groups:
1. Exact match: its normalised text (lower case, single spaces, no end punctuation) was seen
   before -> same group, score 1.0, and the embedding model is not called at all.
2. Semantic match: the question is embedded once with sentence-transformers
   (all-MiniLM-L6-v2) and compared by cosine similarity with every group's representative
   (the group's first question). Representative embeddings are kept in one NumPy matrix,
   so existing questions are never embedded again.
3. Intent guard: a match also needs the same coarse intent ("types of", "example of",
   "advantages", ...) and the same numbers/ordinals. Cosine similarity alone cannot do this:
   measured with MiniLM, "Advantages of linked list" vs "Disadvantages of linked list" scores
   0.95 and "Define inheritance" vs "Give an example of inheritance" 0.81, while the real
   paraphrase "What is machine learning?" vs "Explain machine learning." scores only 0.83.
   The guard is a keyword check (English only) and can be turned off.

On its own the service keeps groups in memory (lost on restart). With a database configured,
question_store.py stores groups and loads them back with add_existing_group(), so their
embeddings are never computed again.
"""

import logging
import math
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Optional

import numpy as np

logger = logging.getLogger("spidyy.similarity")

DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
# A starting point picked from a small hand-labelled set of pairs (see README), not a
# universally correct value. Tune it with SIMILARITY_THRESHOLD.
DEFAULT_THRESHOLD = 0.80
MAX_QUESTION_CHARS = 2000
# After a failed model load, wait this long before trying again, instead of retrying
# (and maybe waiting on a network timeout) for every request.
LOAD_RETRY_SECONDS = 60.0

# Takes a list of texts, returns a (len(texts), dim) array of embeddings.
EmbedFn = Callable[[list[str]], np.ndarray]


class SimilarityError(Exception):
    """Base class for errors raised by the similarity service."""


class InvalidQuestionError(SimilarityError, ValueError):
    """The question is not a non-empty string of acceptable length."""


class EmbeddingError(SimilarityError):
    """The embedding model could not be loaded, or failed to embed a question."""


# Coarse question intents. Two questions can only share a group when they ask for the same
# set of these. A question with none of them is a plain "what is / define / explain" question.
INTENT_PATTERNS = {
    "types": r"\b(types?|kinds?|categories|classifications?)\b",
    "example": r"\b(examples?|e\.g)\b",
    "applications": r"\b(applications?|uses|use of|used for|real[- ]world)\b",
    "advantages": r"\b(advantages?|benefits?|pros|merits)\b",
    "disadvantages": r"\b(disadvantages?|drawbacks?|limitations?|cons|demerits)\b",
    "comparison": r"\b(differences?|differ|differentiate|distinguish|vs|versus|compare|comparison|contrast)\b",
    "importance": r"\b(why|importance|important|significance)\b",
    "process": r"\b(how|steps?|process|procedure)\b",
    "history": r"\b(history|invented|discovered|origin)\b",
}
_INTENT_REGEXES = {name: re.compile(pattern) for name, pattern in INTENT_PATTERNS.items()}
# "Newton's first law" and "Newton's second law" differ only in this kind of word.
_NUMBER_REGEX = re.compile(
    r"\d+(?:\.\d+)?|\b(?:zeroth|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b"
)


def normalize_question(text: str) -> str:
    """Text used for exact-duplicate detection: case-folded, single spaces, no end punctuation."""
    return " ".join(text.casefold().split()).strip(" ?!.,;:\"'")


def question_signature(text: str) -> tuple[frozenset, frozenset]:
    """(intents, numbers) of a question. Questions with different signatures never share a group."""
    text = text.casefold()
    intents = frozenset(name for name, regex in _INTENT_REGEXES.items() if regex.search(text))
    numbers = frozenset(_NUMBER_REGEX.findall(text))
    return intents, numbers


def _check_threshold(value) -> float:
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Similarity threshold must be a number, got {value!r}.") from None
    if not 0.0 < value <= 1.0:  # also rejects NaN
        raise ValueError(f"Similarity threshold must be in (0, 1], got {value!r}.")
    return value


def _load_sentence_transformer(model_name: str) -> EmbedFn:
    # Imported here, not at the top, so the API still starts (and answers questions)
    # when sentence-transformers is missing or broken.
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name)
    return lambda texts: model.encode(texts, convert_to_numpy=True, show_progress_bar=False)


@dataclass(frozen=True)
class MatchResult:
    is_match: bool
    # Cosine similarity with the best candidate group (1.0 for an exact match, 0.0 when there are no groups).
    score: float
    threshold: float
    # Best candidate group (the matched one when is_match), or None when there are no groups.
    group_id: Optional[int]
    representative: Optional[str]
    # "exact", "similar", "below_threshold", "intent_mismatch" or "no_groups".
    reason: str


@dataclass(frozen=True)
class AssignResult:
    group_id: int
    created: bool
    match: MatchResult


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class QuestionGroup:
    group_id: int
    representative: str
    signature: tuple[frozenset, frozenset]
    size: int = 1  # questions assigned with assign() (in-memory mode only)
    created_at: datetime = field(default_factory=_utcnow)
    last_asked_at: datetime = field(default_factory=_utcnow)


@dataclass(frozen=True)
class GroupCount:
    """One row of the most-asked list, from memory or from the database."""

    group_id: int
    question: str
    count: int
    first_asked_at: Optional[datetime]
    last_asked_at: Optional[datetime]


class SimilarityService:
    """Finds the question group a new question belongs to, creating one when nothing matches.

    Thread-safe: FastAPI runs sync endpoints and background tasks in a thread pool.
    """

    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
        threshold: float = DEFAULT_THRESHOLD,
        intent_guard: bool = True,
        embed_factory: Optional[Callable[[], EmbedFn]] = None,
        max_chars: int = MAX_QUESTION_CHARS,
        load_retry_seconds: float = LOAD_RETRY_SECONDS,
    ):
        self.model_name = model_name
        self.threshold = _check_threshold(threshold)
        self.intent_guard = intent_guard
        self.max_chars = max_chars
        self.load_retry_seconds = load_retry_seconds
        # Tests pass a fake factory; normally the real model is loaded on first use.
        self._embed_factory = embed_factory or (lambda: _load_sentence_transformer(model_name))
        self._embed: Optional[EmbedFn] = None
        self._load_error: Optional[str] = None
        self._load_failed_at = 0.0
        self._load_lock = threading.Lock()

        self._store_lock = threading.Lock()
        self._groups: list[QuestionGroup] = []  # row i of the matrix belongs to _groups[i]
        self._by_id: dict[int, QuestionGroup] = {}
        # In memory, ids are 0, 1, 2, ...; groups loaded with add_existing_group() keep their own ids.
        self._next_id = 0
        self._exact: dict[str, int] = {}  # normalised question -> group_id
        # Unit-length representative embeddings. Rows [0, len(groups)) are in use; the
        # rest is spare capacity, doubled when full so adding a group rarely copies.
        self._matrix: Optional[np.ndarray] = None

    # ---------- Public API ----------

    @property
    def status(self) -> str:
        """"ready", "not_loaded" (model loads on first use) or "error" (last load failed)."""
        if self._embed is not None:
            return "ready"
        return "error" if self._load_error else "not_loaded"

    @property
    def group_count(self) -> int:
        return len(self._groups)

    def most_asked(self, limit: int, min_count: int = 1) -> list[GroupCount]:
        """In-memory mode: groups with at least min_count questions, most asked first
        (ties: most recently asked first). Counts start at zero when the server starts."""
        with self._store_lock:
            groups = [g for g in self._groups if g.size >= min_count]
            groups.sort(key=lambda g: (-g.size, -g.last_asked_at.timestamp(), g.group_id))
            return [GroupCount(g.group_id, g.representative, g.size, g.created_at, g.last_asked_at)
                    for g in groups[:limit]]

    def find_match(self, question, threshold: Optional[float] = None) -> MatchResult:
        """Best existing group for a question, without changing anything.

        `threshold` overrides the configured one for this call only.
        Raises InvalidQuestionError or EmbeddingError.
        """
        question = self._validate(question)
        threshold = self.threshold if threshold is None else _check_threshold(threshold)
        key = normalize_question(question)
        with self._store_lock:
            exact = self._exact_match(key, threshold)
        if exact:
            return exact
        return self.match_embedding(question, self._embed_question(question), threshold)

    def validate(self, question) -> str:
        """The question with surrounding whitespace removed. Raises InvalidQuestionError."""
        return self._validate(question)

    def embed(self, question) -> np.ndarray:
        """Unit-length embedding of a question. Raises InvalidQuestionError or EmbeddingError."""
        return self._embed_question(self._validate(question))

    def match_embedding(self, question, vector, threshold: Optional[float] = None) -> MatchResult:
        """Like find_match(), for a question already embedded with embed(). Changes nothing."""
        question = self._validate(question)
        threshold = self.threshold if threshold is None else _check_threshold(threshold)
        vector = _unit_vector(np.asarray(vector, dtype=np.float32))
        with self._store_lock:
            exact = self._exact_match(normalize_question(question), threshold)
            return exact or self._best_match(vector, question_signature(question), threshold)

    def add_existing_group(self, group_id: int, representative: str, vector) -> bool:
        """Add a group stored elsewhere (e.g. in a database) with its saved embedding, so it is
        not embedded again. Returns False if a group with this id is already loaded."""
        vector = _unit_vector(np.asarray(vector, dtype=np.float32))
        with self._store_lock:
            if group_id in self._by_id:
                return False
            if self._matrix is not None and vector.shape[0] != self._matrix.shape[1]:
                raise EmbeddingError(
                    f"Embedding size {vector.shape[0]} does not match stored size {self._matrix.shape[1]}."
                )
            self._add_group(
                representative, normalize_question(representative), vector, question_signature(representative), group_id
            )
        return True

    def assign(self, question) -> AssignResult:
        """Put a question into its matching group, or a new group when nothing matches.

        Raises InvalidQuestionError or EmbeddingError; in both cases nothing is stored.
        """
        question = self._validate(question)
        key = normalize_question(question)
        with self._store_lock:
            exact = self._exact_match(key, self.threshold)
            if exact:
                self._count(self._by_id[exact.group_id])
                return AssignResult(exact.group_id, created=False, match=exact)

        # Embed outside the lock: it is the slow part.
        vector = self._embed_question(question)
        signature = question_signature(question)

        with self._store_lock:
            # Another request may have stored the same question while we were embedding.
            exact = self._exact_match(key, self.threshold)
            if exact:
                self._count(self._by_id[exact.group_id])
                return AssignResult(exact.group_id, created=False, match=exact)

            match = self._best_match(vector, signature, self.threshold)
            if match.is_match:
                group = self._by_id[match.group_id]
                self._count(group)
                self._exact[key] = group.group_id
                return AssignResult(group.group_id, created=False, match=match)

            group_id = self._add_group(question, key, vector, signature)
            return AssignResult(group_id, created=True, match=match)

    # ---------- Internals ----------

    @staticmethod
    def _count(group: QuestionGroup) -> None:
        group.size += 1
        group.last_asked_at = _utcnow()

    def _validate(self, question) -> str:
        if not isinstance(question, str):
            raise InvalidQuestionError(f"Question must be a string, got {type(question).__name__}.")
        question = question.strip()
        if not question:
            raise InvalidQuestionError("Question cannot be empty.")
        if len(question) > self.max_chars:
            raise InvalidQuestionError(f"Question is longer than {self.max_chars} characters.")
        if not re.search(r"\w", question):
            raise InvalidQuestionError("Question must contain at least one letter or digit.")
        return question

    def _get_embed(self) -> EmbedFn:
        """Load the embedding model once and reuse it for every request."""
        if self._embed is not None:
            return self._embed
        with self._load_lock:
            if self._embed is None:
                if self._load_error and time.monotonic() - self._load_failed_at < self.load_retry_seconds:
                    raise EmbeddingError(f"Embedding model unavailable: {self._load_error}")
                started = time.perf_counter()
                try:
                    embed = self._embed_factory()
                except Exception as e:
                    self._load_error = f"{type(e).__name__}: {e}"
                    self._load_failed_at = time.monotonic()
                    logger.exception("Could not load embedding model %s", self.model_name)
                    raise EmbeddingError(f"Could not load embedding model: {self._load_error}") from e
                self._embed = embed
                self._load_error = None
                logger.info("Loaded embedding model %s in %.1f s", self.model_name, time.perf_counter() - started)
        return self._embed

    def _embed_question(self, question: str) -> np.ndarray:
        """Unit-length embedding of one question."""
        embed = self._get_embed()
        try:
            vectors = np.asarray(embed([question]), dtype=np.float32)
        except Exception as e:
            logger.exception("Embedding failed")
            raise EmbeddingError(f"Embedding failed: {type(e).__name__}: {e}") from e
        if vectors.ndim != 2 or vectors.shape[0] != 1 or vectors.shape[1] == 0:
            raise EmbeddingError(f"Embedding model returned shape {vectors.shape}, expected (1, dim).")
        return _unit_vector(vectors[0])

    def _exact_match(self, key: str, threshold: float) -> Optional[MatchResult]:
        group_id = self._exact.get(key)
        if group_id is None:
            return None
        return MatchResult(True, 1.0, threshold, group_id, self._by_id[group_id].representative, "exact")

    def _best_match(self, vector: np.ndarray, signature, threshold: float) -> MatchResult:
        n = len(self._groups)
        if n == 0:
            return MatchResult(False, 0.0, threshold, None, None, "no_groups")
        if vector.shape[0] != self._matrix.shape[1]:
            raise EmbeddingError(
                f"Embedding size {vector.shape[0]} does not match stored size {self._matrix.shape[1]}."
            )

        # All rows are unit length, so the dot product is the cosine similarity.
        scores = self._matrix[:n] @ vector
        # Highest-scoring group above the threshold that asks for the same kind of answer.
        candidates = np.flatnonzero(scores >= threshold)
        for i in candidates[np.argsort(-scores[candidates])]:
            if not self.intent_guard or self._groups[i].signature == signature:
                return self._result(True, scores[i], threshold, int(i), "similar")

        best = int(np.argmax(scores))
        reason = "intent_mismatch" if candidates.size else "below_threshold"
        return self._result(False, scores[best], threshold, best, reason)

    def _result(self, is_match, score, threshold, row, reason) -> MatchResult:
        score = max(-1.0, min(1.0, float(score)))  # float rounding can give 1.0000001
        group = self._groups[row]
        return MatchResult(is_match, score, threshold, group.group_id, group.representative, reason)

    def _add_group(self, question: str, key: str, vector: np.ndarray, signature, group_id=None) -> int:
        if group_id is None:
            group_id = self._next_id
        row = len(self._groups)
        if self._matrix is None:
            self._matrix = np.empty((16, vector.shape[0]), dtype=np.float32)
        elif row == self._matrix.shape[0]:
            self._matrix = np.concatenate([self._matrix, np.empty_like(self._matrix)])
        self._matrix[row] = vector
        group = QuestionGroup(group_id, question, signature)
        self._groups.append(group)
        self._by_id[group_id] = group
        self._next_id = max(self._next_id, group_id + 1)
        self._exact.setdefault(key, group_id)
        return group_id


def _unit_vector(vector: np.ndarray) -> np.ndarray:
    """vector / |vector| for a 1-D, non-empty, finite vector; EmbeddingError otherwise."""
    if vector.ndim != 1 or vector.shape[0] == 0:
        raise EmbeddingError(f"Expected a 1-D embedding, got shape {vector.shape}.")
    norm = float(np.linalg.norm(vector))
    if not math.isfinite(norm) or norm == 0.0:
        raise EmbeddingError("Embedding model returned an empty or non-finite vector.")
    return vector / norm
