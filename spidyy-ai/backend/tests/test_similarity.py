"""Offline tests for similarity.py. A fake embedder with hand-picked vectors stands in for MiniLM,
so these tests check the service's logic (thresholds, groups, caching, errors), not the model.
Real-model behaviour is tested in test_similarity_model.py."""

import math
import threading

import numpy as np
import pytest

from similarity import (
    EmbeddingError,
    InvalidQuestionError,
    SimilarityService,
    normalize_question,
    question_signature,
)


def unit(angle_deg):
    """2-D unit vector; the cosine between unit(0) and unit(a) is cos(a)."""
    a = math.radians(angle_deg)
    return [math.cos(a), math.sin(a)]


# Cosine with "what is machine learning": 1.0, ~0.94, ~0.77, 0.0.
VECTORS = {
    "what is machine learning": unit(0),
    "explain machine learning": unit(20),
    "describe machine learning briefly": unit(40),
    "who wrote the national anthem": unit(90),
    "what are the types of machine learning": unit(5),  # very close, but a different intent
}


class FakeModel:
    """Returns preset vectors (looked up by normalised text) and records how it is used."""

    def __init__(self, vectors=VECTORS):
        self.vectors = vectors
        self.loads = 0
        self.encoded = []

    def factory(self):
        self.loads += 1
        return self.encode

    def encode(self, texts):
        self.encoded.extend(texts)
        return np.array([self.vectors[normalize_question(t)] for t in texts], dtype=np.float32)


@pytest.fixture
def model():
    return FakeModel()


def make_service(model, **kwargs):
    return SimilarityService(embed_factory=model.factory, **kwargs)


# ---------- Exact duplicates ----------

def test_exact_duplicate_joins_group_without_calling_the_model(model):
    service = make_service(model)
    first = service.assign("What is machine learning?")
    model.encoded.clear()

    second = service.assign("  what IS   machine learning  ")

    assert first.created and not second.created
    assert second.group_id == first.group_id
    assert second.match.reason == "exact"
    assert second.match.score == 1.0
    assert model.encoded == []
    assert service.group_count == 1


def test_normalize_question():
    assert normalize_question("  What IS  Machine\tLearning?? ") == "what is machine learning"


# ---------- Threshold ----------

def test_question_above_threshold_joins_existing_group(model):
    service = make_service(model, threshold=0.9)
    first = service.assign("What is machine learning?")
    second = service.assign("Explain machine learning.")  # cosine ~0.94

    assert not second.created
    assert second.group_id == first.group_id
    assert second.match.reason == "similar"
    assert second.match.score == pytest.approx(math.cos(math.radians(20)), abs=1e-5)
    assert second.match.representative == "What is machine learning?"


def test_question_below_threshold_creates_new_group(model):
    service = make_service(model, threshold=0.9)
    service.assign("What is machine learning?")
    result = service.assign("Describe machine learning briefly")  # cosine ~0.77

    assert result.created
    assert result.group_id == 1
    assert result.match.reason == "below_threshold"
    assert not result.match.is_match
    assert result.match.score == pytest.approx(math.cos(math.radians(40)), abs=1e-5)
    assert service.group_count == 2


def test_score_equal_to_threshold_is_a_match(model):
    service = make_service(model, threshold=0.9)
    service.assign("What is machine learning?")
    score = math.cos(math.radians(20))

    assert service.find_match("Explain machine learning", threshold=score - 1e-6).is_match
    assert not service.find_match("Explain machine learning", threshold=min(1.0, score + 1e-4)).is_match


@pytest.mark.parametrize("threshold, expected_match", [(0.7, True), (0.8, False)])
def test_threshold_is_configurable(model, threshold, expected_match):
    service = make_service(model, threshold=threshold)
    service.assign("What is machine learning?")
    assert service.assign("Describe machine learning briefly").match.is_match is expected_match


@pytest.mark.parametrize("bad", [0, -0.5, 1.5, float("nan"), "abc", None])
def test_invalid_threshold_is_rejected(model, bad):
    with pytest.raises(ValueError):
        make_service(model, threshold=bad)


def test_threshold_from_env_string_is_accepted(model):
    assert make_service(model, threshold="0.85").threshold == 0.85


# ---------- Group selection ----------

def test_best_scoring_group_wins(model):
    service = make_service(model, threshold=0.99)  # strict, so the two setup questions stay apart
    service.assign("Who wrote the national anthem")  # group 0, cosine 0.34 with the query
    service.assign("Describe machine learning briefly")  # group 1, cosine ~0.94 with the query
    assert service.group_count == 2
    match = service.find_match("Explain machine learning", threshold=0.3)  # both groups pass
    assert match.group_id == 1 and match.is_match


def test_find_match_does_not_change_groups(model):
    service = make_service(model)
    match = service.find_match("What is machine learning?")
    assert match.reason == "no_groups" and match.group_id is None and match.score == 0.0
    assert service.group_count == 0


def test_unrelated_question_creates_new_group(model):
    service = make_service(model)
    service.assign("What is machine learning?")
    result = service.assign("Who wrote the national anthem?")
    assert result.created
    assert result.match.score == pytest.approx(0.0, abs=1e-6)


# ---------- Intent guard ----------

def test_intent_guard_keeps_different_intents_apart(model):
    service = make_service(model, threshold=0.9)
    service.assign("What is machine learning?")
    result = service.assign("What are the types of machine learning?")  # cosine ~0.996

    assert result.created
    assert result.match.reason == "intent_mismatch"
    assert result.match.score > 0.99


def test_without_intent_guard_high_score_is_enough(model):
    service = make_service(model, threshold=0.9, intent_guard=False)
    service.assign("What is machine learning?")
    assert not service.assign("What are the types of machine learning?").created


def test_intent_guard_skips_to_next_compatible_group(model):
    service = make_service(model, threshold=0.9)
    service.assign("What are the types of machine learning?")  # group 0: higher score, wrong intent
    service.assign("Explain machine learning")  # group 1: lower score, same intent
    match = service.find_match("What is machine learning?")
    assert match.is_match and match.group_id == 1


@pytest.mark.parametrize(
    "question, intents",
    [
        ("Define inheritance", set()),
        ("What is machine learning?", set()),
        ("Give an example of inheritance", {"example"}),
        ("What are the types of machine learning?", {"types"}),
        ("Disadvantages of linked list", {"disadvantages"}),  # must not also count as "advantages"
        ("Advantages of linked list", {"advantages"}),
        ("Difference between TCP and UDP", {"comparison"}),
        ("Why is photosynthesis important?", {"importance"}),
    ],
)
def test_question_intents(question, intents):
    assert question_signature(question)[0] == intents


def test_question_numbers():
    assert question_signature("What is Newton's first law?")[1] == {"first"}
    assert question_signature("Solve 2x + 3 = 7")[1] == {"2", "3", "7"}


# ---------- Embeddings are computed once ----------

def test_model_is_loaded_only_once(model):
    service = make_service(model)
    for q in ["What is machine learning?", "Explain machine learning", "Who wrote the national anthem?"]:
        service.assign(q)
        service.find_match(q)
    assert model.loads == 1


def test_existing_questions_are_not_re_embedded(model):
    service = make_service(model)
    service.assign("What is machine learning?")
    service.assign("Who wrote the national anthem?")
    model.encoded.clear()

    service.find_match("Describe machine learning briefly")

    assert model.encoded == ["Describe machine learning briefly"]


def test_many_groups_grow_the_matrix_correctly():
    vectors = {f"question {i}": np.eye(40)[i].tolist() for i in range(40)}
    service = SimilarityService(embed_factory=FakeModel(vectors).factory)
    for i in range(40):
        assert service.assign(f"Question {i}").created
    match = service.find_match("Question 33?")
    assert match.reason == "exact" and match.group_id == 33
    assert service.find_match("question 39").group_id == 39


def test_concurrent_duplicates_create_one_group(model):
    service = make_service(model)
    threads = [threading.Thread(target=service.assign, args=("What is machine learning?",)) for _ in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert service.group_count == 1


# ---------- Invalid input ----------

@pytest.mark.parametrize("bad", ["", "   \n\t", "???", None, 42, ["What is ML?"], b"What is ML?"])
def test_invalid_question_is_rejected_and_nothing_is_stored(model, bad):
    service = make_service(model)
    with pytest.raises(InvalidQuestionError):
        service.assign(bad)
    with pytest.raises(InvalidQuestionError):
        service.find_match(bad)
    assert service.group_count == 0
    assert model.loads == 0  # rejected before the model is touched


def test_too_long_question_is_rejected(model):
    service = make_service(model, max_chars=50)
    with pytest.raises(InvalidQuestionError):
        service.assign("x" * 51)


def test_invalid_question_error_is_a_value_error():
    assert issubclass(InvalidQuestionError, ValueError)


# ---------- Embedding model errors ----------

def test_model_load_failure_raises_embedding_error():
    def broken_factory():
        raise OSError("model files not found")

    service = SimilarityService(embed_factory=broken_factory)
    with pytest.raises(EmbeddingError, match="model files not found"):
        service.assign("What is machine learning?")
    assert service.status == "error"
    assert service.group_count == 0


def test_failed_load_is_not_retried_on_every_request():
    calls = []

    def broken_factory():
        calls.append(1)
        raise OSError("offline")

    service = SimilarityService(embed_factory=broken_factory, load_retry_seconds=60)
    for _ in range(5):
        with pytest.raises(EmbeddingError):
            service.find_match("What is machine learning?")
    assert len(calls) == 1


def test_load_is_retried_after_the_wait(model):
    attempts = []

    def flaky_factory():
        attempts.append(1)
        if len(attempts) == 1:
            raise OSError("temporary network error")
        return model.encode

    service = SimilarityService(embed_factory=flaky_factory, load_retry_seconds=0)
    with pytest.raises(EmbeddingError):
        service.assign("What is machine learning?")
    assert service.assign("What is machine learning?").created
    assert service.status == "ready"


def test_encode_failure_raises_embedding_error_and_stores_nothing():
    def factory():
        def encode(texts):
            raise RuntimeError("CUDA out of memory")
        return encode

    service = SimilarityService(embed_factory=factory)
    with pytest.raises(EmbeddingError, match="out of memory"):
        service.assign("What is machine learning?")
    assert service.group_count == 0


@pytest.mark.parametrize(
    "bad_output",
    [
        np.array([[np.nan, 1.0]]),  # NaN values
        np.array([[0.0, 0.0]]),  # zero vector: cosine undefined
        np.array([1.0, 0.0]),  # 1-D instead of (1, dim)
        np.zeros((2, 3)),  # two rows for one question
        np.zeros((1, 0)),  # empty embedding
        [["not", "numbers"]],
    ],
)
def test_malformed_embedding_raises_embedding_error(bad_output):
    service = SimilarityService(embed_factory=lambda: (lambda texts: bad_output))
    with pytest.raises(EmbeddingError):
        service.assign("What is machine learning?")
    assert service.group_count == 0


def test_embedding_size_change_raises_embedding_error():
    sizes = iter([2, 3])
    service = SimilarityService(embed_factory=lambda: (lambda texts: np.ones((1, next(sizes)))))
    service.assign("What is machine learning?")
    with pytest.raises(EmbeddingError, match="does not match"):
        service.assign("Explain machine learning")
