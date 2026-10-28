"""Stored grouping with the real all-MiniLM-L6-v2 model (SQLite test database), at the default
threshold and with the intent guard on. Skipped when the model cannot be loaded."""

import pytest
from sqlalchemy import select

from database import create_engine_from_url, create_session_factory
from models import Base, QuestionGroup
from question_store import QuestionRecorder
from similarity import EmbeddingError, SimilarityService

pytestmark = pytest.mark.model


@pytest.fixture(scope="module")
def embed():
    pytest.importorskip("sentence_transformers")
    try:
        return SimilarityService()._get_embed()
    except EmbeddingError as e:
        pytest.skip(f"MiniLM model unavailable: {e}")


@pytest.fixture
def db(tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'questions.db'}")
    Base.metadata.create_all(engine)
    yield create_session_factory(engine)
    engine.dispose()


@pytest.fixture
def recorder(db, embed):
    return QuestionRecorder(SimilarityService(embed_factory=lambda: embed), db)


def counts(db):
    with db() as s:
        return {g.canonical_question: g.question_count for g in s.scalars(select(QuestionGroup).order_by(QuestionGroup.id))}


def test_paraphrases_and_duplicates_are_counted_together(recorder, db):
    for q in ["What is machine learning?", "Explain machine learning.", "Can you explain what machine learning is?",
              "what is machine learning", "Define machine learning"]:
        recorder.record(q)
    assert counts(db) == {"What is machine learning?": 5}


@pytest.mark.parametrize(
    "first, second",
    [
        ("What is machine learning?", "What are the types of machine learning?"),
        ("Define inheritance", "Give an example of inheritance"),
        ("Advantages of linked list", "Disadvantages of linked list"),
        ("What is Newton's first law?", "What is Newton's second law?"),
    ],
)
def test_different_intents_are_counted_separately(recorder, db, first, second):
    recorder.record(first)
    recorder.record(second)
    assert counts(db) == {first: 1, second: 1}


def test_unrelated_questions_are_counted_separately(recorder, db):
    for q in ["What is machine learning?", "Who wrote the Indian national anthem?", "What is machine learning?"]:
        recorder.record(q)
    assert counts(db) == {"What is machine learning?": 2, "Who wrote the Indian national anthem?": 1}


def test_known_acronym_limitation_also_applies_to_storage(recorder, db):
    """Same known miss as in test_similarity_model.py (strict xfail there): 'OOP' vs its full name is
    stored as two groups, so its count is split. Asserted here as the current, documented behaviour."""
    recorder.record("What is inheritance in OOP?")
    recorder.record("Define inheritance in object oriented programming")
    assert len(counts(db)) == 2
