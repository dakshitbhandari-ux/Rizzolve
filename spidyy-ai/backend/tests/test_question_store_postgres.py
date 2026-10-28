"""PostgreSQL tests for question_store.py: the advisory lock, concurrent counting from several
server processes, rollback, and the column types.

Skipped unless TEST_DATABASE_URL (environment variable, or a line in backend/.env) points at a
PostgreSQL database other than DATABASE_URL, for example
    TEST_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/spidyy_test
Each test creates its own schema (spidyy_test_<random>), works only inside it and drops only that
schema at the end. Nothing else in the database is read, changed or deleted.
"""

import os
import threading
import uuid
from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import OperationalError

from database import create_engine_from_url, create_session_factory, normalize_database_url
from models import Base, QuestionGroup, QuestionSubmission
from question_store import QuestionRecorder, StorageError
from similarity import SimilarityService
from test_question_store import FakeModel, wait_after_first_match

_ENV_FILE = dotenv_values(Path(__file__).resolve().parent.parent / ".env")


def _setting(name):
    return (os.getenv(name) or _ENV_FILE.get(name) or "").strip()


TEST_DATABASE_URL = _setting("TEST_DATABASE_URL")
_SAME_AS_APP_DATABASE = bool(TEST_DATABASE_URL) and (
    normalize_database_url(TEST_DATABASE_URL) == normalize_database_url(_setting("DATABASE_URL"))
)
pytestmark = [
    pytest.mark.skipif(
        not TEST_DATABASE_URL.startswith(("postgres://", "postgresql")),
        reason="set TEST_DATABASE_URL to a PostgreSQL database to run these tests",
    ),
    pytest.mark.skipif(
        _SAME_AS_APP_DATABASE, reason="TEST_DATABASE_URL must be a separate database from DATABASE_URL"
    ),
]


@pytest.fixture
def pg(request):
    schema = f"spidyy_test_{uuid.uuid4().hex[:12]}"
    admin = create_engine_from_url(TEST_DATABASE_URL)
    with admin.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine_from_url(
        TEST_DATABASE_URL,
        connect_args={"options": f"-csearch_path={schema}"},
        pool_size=20,
        max_overflow=20,
    )
    try:
        Base.metadata.create_all(engine)
        yield engine
    finally:
        engine.dispose()
        with admin.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))  # only the schema created above
        admin.dispose()


@pytest.fixture
def db(pg):
    return create_session_factory(pg)


def worker(db):
    """One server process: its own similarity cache and its own thread lock."""
    return QuestionRecorder(SimilarityService(embed_factory=FakeModel().factory), db)


def counts(db):
    with db() as s:
        groups = {g.id: g.question_count for g in s.scalars(select(QuestionGroup))}
        per_group = dict(s.execute(select(QuestionSubmission.question_group_id, func.count())
                                   .group_by(QuestionSubmission.question_group_id)).all())
    return groups, per_group


def test_runs_on_postgresql(pg):
    assert pg.dialect.name == "postgresql"


def test_column_types(pg):
    with pg.connect() as conn:
        types = dict(conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = 'question_groups' AND table_schema = current_schema()")).all())
    assert types["id"] == "bigint"
    assert types["representative_embedding"] == "bytea"
    assert types["created_at"] == "timestamp with time zone"


def test_grouping_and_counts(db):
    recorder = worker(db)
    for q in ["What is machine learning?", "Explain machine learning.", "what is machine learning",
              "What are the types of machine learning?", "Define inheritance", "Give an example of inheritance"]:
        recorder.record(q)
    groups, per_group = counts(db)
    assert sorted(groups.values()) == [1, 1, 1, 3]
    assert groups == per_group


@pytest.mark.parametrize("question_b", ["Explain machine learning.", "What is machine learning?"])
def test_two_processes_racing_on_a_new_question_create_one_group(db, question_b):
    a, b = worker(db), worker(db)
    barrier = threading.Barrier(2, timeout=10)
    wait_after_first_match(a, barrier)
    wait_after_first_match(b, barrier)
    results, errors = [], []

    def ask(recorder, q):
        try:
            results.append(recorder.record(q))
        except Exception as e:  # pragma: no cover - reported below
            errors.append(e)

    threads = [threading.Thread(target=ask, args=(a, "What is machine learning?")),
               threading.Thread(target=ask, args=(b, question_b))]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    assert sorted(r.created for r in results) == [False, True]
    groups, per_group = counts(db)
    assert list(groups.values()) == [2] and groups == per_group


def test_many_concurrent_submissions_from_three_processes(db):
    workers = [worker(db) for _ in range(3)]
    questions = ["What is machine learning?", "Explain machine learning.", "Who wrote the national anthem?",
                 "what is machine learning", "Define inheritance"] * 12
    errors = []

    def ask(i, q):
        try:
            workers[i % 3].record(q)
        except Exception as e:  # pragma: no cover - reported below
            errors.append(e)

    threads = [threading.Thread(target=ask, args=(i, q)) for i, q in enumerate(questions)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    groups, per_group = counts(db)
    assert sorted(groups.values()) == [12, 12, 36]  # no lost updates, no duplicate groups
    assert groups == per_group


def test_most_asked_on_postgresql(db):
    recorder = worker(db)
    for q in ["Who wrote the national anthem?", "What is machine learning?", "Explain machine learning.",
              "What are the types of machine learning?", "what is machine learning"]:
        recorder.record(q)
    top = recorder.most_asked(10)
    assert [(g.question, g.count) for g in top] == [
        ("What is machine learning?", 3), ("What are the types of machine learning?", 1),
        ("Who wrote the national anthem?", 1)]
    assert all(g.last_asked_at.tzinfo is not None for g in top)
    assert [g.count for g in recorder.most_asked(10, min_count=2)] == [3]


def test_failed_insert_rolls_back(db):
    recorder = worker(db)

    def fail(mapper, connection, target):
        raise OperationalError("INSERT INTO question_submissions", {}, Exception("disk full"))

    event.listen(QuestionSubmission, "before_insert", fail)
    try:
        with pytest.raises(StorageError):
            recorder.record("What is machine learning?")
    finally:
        event.remove(QuestionSubmission, "before_insert", fail)
    assert counts(db) == ({}, {})
    assert recorder.record("What is machine learning?").created
