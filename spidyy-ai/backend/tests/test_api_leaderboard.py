"""GET /api/questions/most-asked, with database storage (temporary SQLite) and in memory.

Questions are added through the real POST /api/ask flow (Gemini faked), so these tests also cover
ask -> group -> store -> count -> leaderboard."""

from datetime import datetime
from types import SimpleNamespace

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update

import main
from database import create_engine_from_url, create_session_factory
from models import Base, QuestionGroup
from question_store import QuestionRecorder
from similarity import SimilarityService
from test_question_store import FakeModel

ML = "What is machine learning?"
ML_PARAPHRASE = "Explain machine learning."
ML_TYPES = "What are the types of machine learning?"
ANTHEM = "Who wrote the national anthem?"


def fake_gemini():
    def generate_content(**kwargs):
        return SimpleNamespace(text="An answer.", prompt_feedback=SimpleNamespace(block_reason=None))

    return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))


@pytest.fixture
def db(tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'questions.db'}")
    Base.metadata.create_all(engine)
    yield create_session_factory(engine)
    engine.dispose()


@pytest.fixture(params=["database", "memory"])
def client(request, monkeypatch, db):
    """The same tests run with database storage and with in-memory grouping."""
    service = SimilarityService(embed_factory=FakeModel().factory)
    monkeypatch.setattr(main, "gemini_client", fake_gemini())
    monkeypatch.setattr(main, "similarity_service", service)
    monkeypatch.setattr(main, "LEADERBOARD_MIN_COUNT", 1)
    if request.param == "database":
        monkeypatch.setattr(main, "question_recorder", QuestionRecorder(service, db))
    test_client = TestClient(main.app)
    test_client.storage = request.param
    return test_client


def ask(client, *questions):
    for q in questions:
        assert client.post("/api/ask", json={"question": q}).status_code == 200


def most_asked(client, **params):
    response = client.get("/api/questions/most-asked", params=params)
    assert response.status_code == 200, response.text
    return response.json()


# ---------- Content and order ----------

def test_empty_list(client):
    body = most_asked(client)
    assert body == {"questions": [], "min_count": 1, "storage": client.storage}


def test_most_asked_first_with_paraphrases_counted_together(client):
    ask(client, ANTHEM, ML, ML_PARAPHRASE, ML_TYPES, "what is machine learning", ANTHEM)
    body = most_asked(client)
    assert [(q["question"], q["count"]) for q in body["questions"]] == [
        (ML, 3),  # ML + its paraphrase + an exact repeat
        (ANTHEM, 2),
        (ML_TYPES, 1),  # same topic, different intent: its own group
    ]
    assert body["storage"] == client.storage


def test_ties_most_recently_asked_first(client):
    ask(client, ML, ANTHEM)  # both asked once; the anthem question more recently
    assert [q["question"] for q in most_asked(client)["questions"]] == [ANTHEM, ML]


def test_limit(client):
    ask(client, ML, ML, ML, ANTHEM, ANTHEM, ML_TYPES)
    assert [q["count"] for q in most_asked(client, limit=2)["questions"]] == [3, 2]
    assert len(most_asked(client, limit=50)["questions"]) == 3


@pytest.mark.parametrize("bad", [0, -1, 51, "ten", 2.5])
def test_invalid_limit_is_rejected(client, bad):
    assert client.get("/api/questions/most-asked", params={"limit": bad}).status_code == 422


def test_exact_repeats_with_different_punctuation_count_in_one_group(client):
    ask(client, *[f"Who wrote the national anthem?{'!' * i}" for i in range(12)])
    assert [q["count"] for q in most_asked(client)["questions"]] == [12]


def test_default_limit_is_ten(client, monkeypatch, db):
    # 12 unrelated questions (orthogonal fake embeddings) -> 12 groups.
    topics = [f"Question about topic {chr(65 + i)}" for i in range(12)]
    vectors = {t: np.eye(12)[i] for i, t in enumerate(topics)}
    service = SimilarityService(embed_factory=lambda: (lambda texts: np.array([vectors[t] for t in texts])))
    monkeypatch.setattr(main, "similarity_service", service)
    if client.storage == "database":
        monkeypatch.setattr(main, "question_recorder", QuestionRecorder(service, db))
    ask(client, *topics)
    assert len(most_asked(client)["questions"]) == 10


def test_min_count_hides_rarely_asked_questions(client, monkeypatch):
    monkeypatch.setattr(main, "LEADERBOARD_MIN_COUNT", 2)
    ask(client, ML, ML_PARAPHRASE, ANTHEM)
    body = most_asked(client)
    assert [(q["question"], q["count"]) for q in body["questions"]] == [(ML, 2)]
    assert body["min_count"] == 2


def test_only_public_fields_are_returned(client):
    ask(client, ML)
    [item] = most_asked(client)["questions"]
    assert set(item) == {"id", "question", "count", "first_asked_at", "last_asked_at"}
    first, last = datetime.fromisoformat(item["first_asked_at"]), datetime.fromisoformat(item["last_asked_at"])
    assert first.tzinfo is not None and last.tzinfo is not None  # UTC, not ambiguous local times
    assert last >= first


def test_reading_the_list_changes_nothing(client):
    ask(client, ML)
    for _ in range(3):
        most_asked(client)
    assert most_asked(client)["questions"][0]["count"] == 1


def test_failed_and_invalid_questions_are_not_counted(client, monkeypatch):
    ask(client, ML)
    assert client.post("/api/ask", json={"question": "   "}).status_code == 400
    blocked = SimpleNamespace(models=SimpleNamespace(generate_content=lambda **kw: SimpleNamespace(
        text=None, prompt_feedback=SimpleNamespace(block_reason="SAFETY"))))
    monkeypatch.setattr(main, "gemini_client", blocked)
    assert client.post("/api/ask", json={"question": ML}).status_code == 400
    assert [q["count"] for q in most_asked(client)["questions"]] == [1]


# ---------- Errors ----------

def test_database_error_returns_503_without_details(monkeypatch, tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'no_such_folder' / 'questions.db'}")
    service = SimilarityService(embed_factory=FakeModel().factory)
    monkeypatch.setattr(main, "similarity_service", service)
    monkeypatch.setattr(main, "question_recorder", QuestionRecorder(service, create_session_factory(engine)))
    response = TestClient(main.app).get("/api/questions/most-asked")
    engine.dispose()
    assert response.status_code == 503
    assert response.json() == {"detail": "The question database is unavailable. Please try again later."}


def test_tracking_disabled_returns_503(monkeypatch):
    monkeypatch.setattr(main, "similarity_service", None)
    assert TestClient(main.app).get("/api/questions/most-asked").status_code == 503


# ---------- Store level ----------

def test_store_ignores_groups_of_other_models(db):
    recorder = QuestionRecorder(SimilarityService(embed_factory=FakeModel().factory), db)
    recorder.record(ML)
    with db.begin() as s:
        s.add(QuestionGroup(canonical_question="old", representative_embedding=b"\x00" * 12,
                            embedding_model="other-model", embedding_dim=3, question_count=99))
    assert [(g.question, g.count) for g in recorder.most_asked(10)] == [(ML, 1)]


def test_store_orders_by_count(db):
    recorder = QuestionRecorder(SimilarityService(embed_factory=FakeModel().factory), db)
    for q in [ML, ANTHEM, ML_TYPES]:
        recorder.record(q)
    with db.begin() as s:  # simulate many submissions without inserting them one by one
        s.execute(update(QuestionGroup).where(QuestionGroup.canonical_question == ML_TYPES).values(question_count=7))
        s.execute(update(QuestionGroup).where(QuestionGroup.canonical_question == ANTHEM).values(question_count=4))
    assert [(g.question, g.count) for g in recorder.most_asked(10)] == [(ML_TYPES, 7), (ANTHEM, 4), (ML, 1)]
    assert [g.count for g in recorder.most_asked(10, min_count=4)] == [7, 4]


def test_memory_counts_match_assignments():
    service = SimilarityService(embed_factory=lambda: (lambda texts: np.ones((len(texts), 3))))
    for q in [ML, ML_PARAPHRASE, ML]:
        service.assign(q)
    [top] = service.most_asked(5)
    assert (top.question, top.count) == (ML, 3)
    assert top.last_asked_at >= top.first_asked_at
