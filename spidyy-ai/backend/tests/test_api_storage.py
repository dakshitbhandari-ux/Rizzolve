"""API tests with database storage on: /api/ask must answer exactly as before, record answered
questions, and keep answering when storage fails. Gemini is faked (no network, no quota)."""

import logging
from types import SimpleNamespace

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

import main
from database import create_engine_from_url, create_session_factory
from models import Base, QuestionGroup, QuestionSubmission
from question_store import QuestionRecorder
from similarity import SimilarityService

ANSWER = "Machine learning lets computers learn patterns from data."


def fake_gemini(text=ANSWER, block_reason=None):
    def generate_content(**kwargs):
        return SimpleNamespace(text=text, prompt_feedback=SimpleNamespace(block_reason=block_reason))

    return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))


@pytest.fixture
def db(tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'questions.db'}")
    Base.metadata.create_all(engine)
    yield create_session_factory(engine)
    engine.dispose()


@pytest.fixture
def client(monkeypatch, db):
    # Every question gets the same vector, so different wordings land in one group.
    service = SimilarityService(embed_factory=lambda: (lambda texts: np.ones((len(texts), 4))))
    monkeypatch.setattr(main, "gemini_client", fake_gemini())
    monkeypatch.setattr(main, "similarity_service", service)
    monkeypatch.setattr(main, "question_recorder", QuestionRecorder(service, db))
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", False)
    return TestClient(main.app)


def ask(client, question="What is machine learning?"):
    return client.post("/api/ask", json={"question": question})


def stored(db):
    with db() as s:
        groups = s.scalars(select(QuestionGroup)).all()
        subs = s.scalars(select(QuestionSubmission).order_by(QuestionSubmission.id)).all()
        return [g.question_count for g in groups], [x.original_question for x in subs]


def test_answer_format_is_unchanged_and_question_is_recorded(client, db):
    response = ask(client)
    assert response.status_code == 200
    assert response.json() == {"answer": ANSWER}  # exactly the Phase 1 response
    ask(client, "Explain machine learning.")  # TestClient runs background tasks before returning
    assert stored(db) == ([2], ["What is machine learning?", "Explain machine learning."])


def test_ask_still_answers_when_storage_fails(client, monkeypatch, caplog, tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'no_such_folder' / 'questions.db'}")
    broken = QuestionRecorder(main.similarity_service, create_session_factory(engine))
    monkeypatch.setattr(main, "question_recorder", broken)
    with caplog.at_level(logging.INFO, logger="spidyy"):
        response = ask(client)
    engine.dispose()
    assert response.status_code == 200
    assert response.json() == {"answer": ANSWER}
    assert "Question NOT recorded or counted" in caplog.text
    assert "Question recorded" not in caplog.text  # never reported as counted


def test_failed_gemini_answer_is_not_recorded(client, db, monkeypatch):
    monkeypatch.setattr(main, "gemini_client", fake_gemini(text=None, block_reason="SAFETY"))
    assert ask(client).status_code == 400
    assert stored(db) == ([], [])


def test_existing_validation_is_unchanged(client, db):
    assert client.post("/api/ask", json={"question": "   "}).status_code == 400
    assert client.post("/api/ask", json={"question": ""}).status_code == 422
    assert client.post("/api/ask", json={"question": "x" * 2001}).status_code == 422
    assert stored(db) == ([], [])


def test_health_reports_storage_mode(client, monkeypatch):
    assert client.get("/api/health").json()["question_storage"] == "database"
    monkeypatch.setattr(main, "question_recorder", None)
    assert client.get("/api/health").json()["question_storage"] == "memory"
    monkeypatch.setattr(main, "similarity_service", None)
    assert client.get("/api/health").json()["question_storage"] == "disabled"


def test_check_endpoint_sees_stored_groups(client, db, monkeypatch):
    ask(client)
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", True)
    body = client.post("/api/similarity/check", json={"question": "Explain machine learning."}).json()
    assert body["matched"] and body["representative"] == "What is machine learning?"
    assert stored(db) == ([1], ["What is machine learning?"])  # the check stored nothing


def test_tests_never_use_the_configured_database():
    """conftest.py replaces main.question_recorder for every test."""
    assert main.question_recorder is None
