"""
Spidyy AI - persistent question groups and frequency counts (Phase 2).

Every answered question is stored as a submission and counted in a question group. Whether a
question joins a group or starts a new one is decided by the Phase 1 SimilarityService (same
threshold, same intent guard); this module stores the decision and keeps the counts consistent.

How one question is recorded:
1. Exact repeat: a stored submission has the same normalised text -> same group as before,
   no embedding needed.
2. Otherwise the question is embedded once and compared with the group representatives in the
   service's cache. The cache is filled from the database with the stored embeddings (nothing is
   re-embedded) and refreshed with groups that other server processes added.
3. Match -> one transaction inserts the submission and adds 1 to the group's count.
4. No match -> a new group is created while holding a lock: a thread lock inside this process
   and, on PostgreSQL, an advisory lock shared by all processes. After taking the lock the
   exact and similarity checks are repeated, so two requests asking the same new question at
   the same time end up in one group instead of two.

question_count only changes in the transaction that inserts a submission, so it always equals
the number of submissions in the group. Any database error rolls the transaction back and raises
StorageError: the question is then neither stored nor counted.
"""

import hashlib
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from sqlalchemy import select, text, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from models import QuestionGroup, QuestionSubmission, utcnow
from similarity import GroupCount, MatchResult, SimilarityService, normalize_question

logger = logging.getLogger("spidyy.question_store")

# Key of the PostgreSQL advisory lock that serialises group creation (any constant works;
# this one spells "SPIDYY" in hex). It is released automatically when the transaction ends.
GROUP_CREATION_LOCK_KEY = 0x535049445959


class StorageError(Exception):
    """The question could not be stored. It was NOT recorded or counted."""


@dataclass(frozen=True)
class RecordResult:
    group_id: int
    submission_id: int
    created: bool  # True when this question started a new group
    match: MatchResult  # why the group was chosen (or why no existing group matched)


def question_hash(question: str) -> str:
    """SHA-256 of the normalised question, used to find exact repeats."""
    return hashlib.sha256(normalize_question(question).encode("utf-8")).hexdigest()


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Times are stored in UTC; SQLite returns them without a time zone, PostgreSQL with one."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def embedding_to_bytes(vector) -> bytes:
    return np.asarray(vector, dtype="<f4").tobytes()


def embedding_from_bytes(data: bytes, dim: int) -> np.ndarray:
    vector = np.frombuffer(data, dtype="<f4")
    if vector.shape != (dim,):
        raise ValueError(f"stored embedding has {vector.size} values, expected {dim}")
    return vector


class QuestionRecorder:
    """Stores answered questions in their groups and keeps each group's count. Thread-safe."""

    def __init__(self, similarity: SimilarityService, session_factory: sessionmaker):
        self.similarity = similarity
        self.session_factory = session_factory
        self._create_lock = threading.Lock()
        self._refresh_lock = threading.Lock()
        # Groups with a higher id have not been loaded into the similarity cache yet.
        self._last_loaded_id = 0

    # ---------- Public API ----------

    def record(self, question) -> RecordResult:
        """Store one answered question and count it in its group.

        Raises InvalidQuestionError or EmbeddingError (from the similarity service) or StorageError.
        Whatever is raised, nothing was stored and no count changed.
        """
        question = self.similarity.validate(question)
        qhash = question_hash(question)
        try:
            result = self._record_exact_repeat(question, qhash)
            if result:
                return result

            # Embedding is the slow part; no transaction is open while it runs.
            vector = self.similarity.embed(question)
            self._refresh_cache()
            match = self.similarity.match_embedding(question, vector)
            if match.is_match:
                with self.session_factory.begin() as session:
                    submission_id = self._add_submission(session, question, qhash, match.group_id, match)
                return RecordResult(match.group_id, submission_id, created=False, match=match)

            return self._create_group_or_join(question, qhash, vector)
        except SQLAlchemyError as e:
            raise StorageError(f"database error ({type(e).__name__}); question not recorded") from e

    def refresh(self) -> None:
        """Load groups added since the last refresh into the similarity cache."""
        try:
            self._refresh_cache()
        except SQLAlchemyError as e:
            raise StorageError(f"database error ({type(e).__name__}); could not load question groups") from e

    def most_asked(self, limit: int, min_count: int = 1) -> list[GroupCount]:
        """Groups of the current embedding model with at least min_count submissions, most asked
        first (ties: most recently asked first, then oldest group). Never returns embeddings."""
        try:
            with self.session_factory() as session:
                rows = session.execute(
                    select(
                        QuestionGroup.id,
                        QuestionGroup.canonical_question,
                        QuestionGroup.question_count,
                        QuestionGroup.created_at,
                        QuestionGroup.last_asked_at,
                    )
                    .where(
                        QuestionGroup.embedding_model == self.similarity.model_name,
                        QuestionGroup.question_count >= min_count,
                    )
                    .order_by(QuestionGroup.question_count.desc(), QuestionGroup.last_asked_at.desc(), QuestionGroup.id)
                    .limit(limit)
                ).all()
        except SQLAlchemyError as e:
            raise StorageError(f"database error ({type(e).__name__}); could not read question counts") from e
        return [GroupCount(r.id, r.canonical_question, r.question_count, _as_utc(r.created_at), _as_utc(r.last_asked_at))
                for r in rows]

    # ---------- Internals ----------

    def _record_exact_repeat(self, question, qhash) -> Optional[RecordResult]:
        with self.session_factory.begin() as session:
            found = self._find_exact(session, qhash)
            if found is None:
                return None
            group_id, canonical = found
            match = MatchResult(True, 1.0, self.similarity.threshold, group_id, canonical, "exact")
            submission_id = self._add_submission(session, question, qhash, group_id, match)
        return RecordResult(group_id, submission_id, created=False, match=match)

    def _create_group_or_join(self, question, qhash, vector) -> RecordResult:
        with self._create_lock:
            with self.session_factory.begin() as session:
                if session.get_bind().dialect.name == "postgresql":
                    session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": GROUP_CREATION_LOCK_KEY})

                # While this request waited for the lock, another one may have stored the same
                # question or a group it matches: check again before creating a group.
                found = self._find_exact(session, qhash)
                if found is not None:
                    group_id, canonical = found
                    match = MatchResult(True, 1.0, self.similarity.threshold, group_id, canonical, "exact")
                    submission_id = self._add_submission(session, question, qhash, group_id, match)
                    return RecordResult(group_id, submission_id, created=False, match=match)

                self._refresh_cache(session)
                match = self.similarity.match_embedding(question, vector)
                if match.is_match:
                    submission_id = self._add_submission(session, question, qhash, match.group_id, match)
                    return RecordResult(match.group_id, submission_id, created=False, match=match)

                now = utcnow()
                group = QuestionGroup(
                    canonical_question=question,
                    representative_embedding=embedding_to_bytes(vector),
                    embedding_model=self.similarity.model_name,
                    embedding_dim=int(vector.shape[0]),
                    question_count=0,  # becomes 1 in _add_submission, like every other count change
                    created_at=now,
                    last_asked_at=now,
                )
                session.add(group)
                session.flush()  # assigns group.id
                submission_id = self._add_submission(session, question, qhash, group.id, match, now=now)
            # Committed. Only now may the cache learn about the group: after a rollback it must not.
            with self._refresh_lock:
                try:
                    self.similarity.add_existing_group(group.id, question, vector)
                    # Group ids are handed out under the creation lock, so every lower id is already loaded.
                    self._last_loaded_id = max(self._last_loaded_id, group.id)
                except Exception:
                    # The question IS stored and counted; the next refresh will try to load the group again.
                    logger.exception("Stored question group %s but could not add it to the cache", group.id)
            return RecordResult(group.id, submission_id, created=True, match=match)

    def _add_submission(self, session: Session, question, qhash, group_id, match: MatchResult, now=None) -> int:
        """Insert the submission and add 1 to its group's count, in the caller's transaction."""
        now = now or utcnow()
        # One UPDATE ... SET question_count = question_count + 1: the database applies concurrent
        # increments one after another, so none is lost.
        updated = session.execute(
            update(QuestionGroup)
            .where(QuestionGroup.id == group_id)
            .values(question_count=QuestionGroup.question_count + 1, last_asked_at=now)
        ).rowcount
        if updated != 1:
            raise StorageError(f"question group {group_id} does not exist; question not recorded")
        reason = "new" if match.reason not in ("exact", "similar") else match.reason
        submission = QuestionSubmission(
            original_question=question,
            question_hash=qhash,
            question_group_id=group_id,
            match_reason=reason,
            similarity_score=match.score if reason != "new" else None,
            created_at=now,
        )
        session.add(submission)
        session.flush()  # assigns submission.id
        return submission.id

    def _find_exact(self, session: Session, qhash) -> Optional[tuple[int, str]]:
        """(group id, canonical question) of an earlier submission with the same normalised text."""
        row = session.execute(
            select(QuestionGroup.id, QuestionGroup.canonical_question)
            .join(QuestionSubmission, QuestionSubmission.question_group_id == QuestionGroup.id)
            .where(QuestionSubmission.question_hash == qhash, QuestionGroup.embedding_model == self.similarity.model_name)
            .order_by(QuestionSubmission.id)
            .limit(1)
        ).first()
        return (row.id, row.canonical_question) if row else None

    def _refresh_cache(self, session: Optional[Session] = None) -> None:
        # Read the database WITHOUT holding _refresh_lock: a thread creating a group holds the database
        # lock and then takes _refresh_lock, so waiting for the database while holding it could deadlock.
        # Two threads loading the same row is harmless: add_existing_group() ignores known ids.
        after_id = self._last_loaded_id
        if session is None:
            with self.session_factory() as own_session:
                rows = self._new_groups(own_session, after_id)
        else:
            rows = self._new_groups(session, after_id)
        with self._refresh_lock:
            for row in rows:
                try:
                    vector = embedding_from_bytes(row.representative_embedding, row.embedding_dim)
                    self.similarity.add_existing_group(row.id, row.canonical_question, vector)
                except Exception as e:
                    # One damaged row must not stop all recording; the group is just never matched.
                    logger.error("Skipping question group %s: unusable embedding (%s)", row.id, e)
                self._last_loaded_id = max(self._last_loaded_id, row.id)

    def _new_groups(self, session: Session, after_id: int):
        return session.execute(
            select(
                QuestionGroup.id,
                QuestionGroup.canonical_question,
                QuestionGroup.representative_embedding,
                QuestionGroup.embedding_dim,
            )
            .where(QuestionGroup.embedding_model == self.similarity.model_name, QuestionGroup.id > after_id)
            .order_by(QuestionGroup.id)
        ).all()
