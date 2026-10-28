"""API tests: question grouping must never break POST /api/ask.

Gemini is replaced by a fake client, so these tests make no network calls and use no quota."""

from types import SimpleNamespace

import numpy as np
import pytest
from fastapi.testclient import TestClient

import main
from similarity import SimilarityService


def fake_gemini(text="Machine learning lets computers learn patterns from data.", block_reason=None):
    def generate_content(**kwargs):
        return SimpleNamespace(text=text, prompt_feedback=SimpleNamespace(block_reason=block_reason))

    return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))


def working_service():
    # Every question gets the same vector, so different wordings land in one group.
    return SimilarityService(embed_factory=lambda: (lambda texts: np.ones((len(texts), 4))))


def broken_service():
    def factory():
        raise OSError("model download failed")

    return SimilarityService(embed_factory=factory)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "gemini_client", fake_gemini())
    monkeypatch.setattr(main, "similarity_service", working_service())
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", False)
    return TestClient(main.app)


def ask(client, question="What is machine learning?"):
    return client.post("/api/ask", json={"question": question})


# ---------- /api/ask keeps working ----------

def test_ask_answers_and_records_the_group(client):
    response = ask(client)
    assert response.status_code == 200
    assert response.json() == {"answer": "Machine learning lets computers learn patterns from data."}
    assert main.similarity_service.group_count == 1  # TestClient runs background tasks before returning

    ask(client, "Explain machine learning.")
    assert main.similarity_service.group_count == 1


def test_ask_still_answers_when_the_model_cannot_load(client, monkeypatch):
    monkeypatch.setattr(main, "similarity_service", broken_service())
    response = ask(client)
    assert response.status_code == 200
    assert response.json()["answer"]


def test_ask_still_answers_on_unexpected_grouping_error(client, monkeypatch):
    def explode(question):
        raise RuntimeError("bug in grouping")

    monkeypatch.setattr(main.similarity_service, "assign", explode)
    response = ask(client)
    assert response.status_code == 200
    assert response.json()["answer"]


def test_ask_works_with_grouping_disabled(client, monkeypatch):
    monkeypatch.setattr(main, "similarity_service", None)
    assert ask(client).status_code == 200


def test_blocked_question_is_not_grouped(client, monkeypatch):
    monkeypatch.setattr(main, "gemini_client", fake_gemini(text=None, block_reason="SAFETY"))
    assert ask(client).status_code == 400
    assert main.similarity_service.group_count == 0


def test_existing_validation_is_unchanged(client):
    assert client.post("/api/ask", json={"question": "   "}).status_code == 400
    assert client.post("/api/ask", json={"question": ""}).status_code == 422
    assert client.post("/api/ask", json={"question": "x" * 2001}).status_code == 422


# ---------- /api/health ----------

def test_health_reports_similarity_status(client, monkeypatch):
    assert client.get("/api/health").json()["similarity"] == "not_loaded"
    ask(client)
    assert client.get("/api/health").json()["similarity"] == "ready"

    monkeypatch.setattr(main, "similarity_service", None)
    assert client.get("/api/health").json()["similarity"] == "disabled"


# ---------- /api/similarity/check (development only) ----------

def check(client, question="Explain machine learning.", **extra):
    return client.post("/api/similarity/check", json={"question": question, **extra})


def test_check_endpoint_is_off_by_default(client):
    assert check(client).status_code == 404


def test_check_endpoint_reports_match(client, monkeypatch):
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", True)
    ask(client)
    body = check(client).json()
    assert body["matched"] is True
    assert body["group_id"] == 0
    assert body["representative"] == "What is machine learning?"
    assert body["score"] == pytest.approx(1.0)
    assert body["group_count"] == 1


def test_check_endpoint_does_not_create_groups(client, monkeypatch):
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", True)
    body = check(client).json()
    assert body["reason"] == "no_groups" and body["group_count"] == 0
    assert main.similarity_service.group_count == 0


def test_check_endpoint_errors(client, monkeypatch):
    monkeypatch.setattr(main, "SIMILARITY_DEBUG_ENDPOINT", True)
    assert check(client, "   ").status_code == 400
    assert check(client, threshold=1.5).status_code == 422

    monkeypatch.setattr(main, "similarity_service", broken_service())
    response = check(client)
    assert response.status_code == 503
    assert "model download failed" not in response.text  # details stay in the server log

    monkeypatch.setattr(main, "similarity_service", None)
    assert check(client).status_code == 503
