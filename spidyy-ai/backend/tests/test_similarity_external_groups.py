"""The SimilarityService methods Phase 2 uses to work with stored groups:
validate(), embed(), match_embedding() and add_existing_group()."""

import numpy as np
import pytest

from similarity import EmbeddingError, InvalidQuestionError, SimilarityService

VECTORS = {"What is machine learning?": [1.0, 0.0], "Explain machine learning.": [0.94, 0.34]}


def service(**kwargs):
    return SimilarityService(embed_factory=lambda: (lambda texts: np.array([VECTORS[t] for t in texts])), **kwargs)


def test_validate_and_embed():
    s = service()
    assert s.validate("  What is machine learning?  ") == "What is machine learning?"
    assert np.linalg.norm(s.embed("What is machine learning?")) == pytest.approx(1.0)
    with pytest.raises(InvalidQuestionError):
        s.embed("   ")


def test_loaded_groups_keep_their_ids_and_are_not_embedded():
    calls = []
    s = SimilarityService(embed_factory=lambda: (lambda texts: calls.append(texts) or np.array([[1.0, 0.0]])))
    assert s.add_existing_group(41, "What is machine learning?", [2.0, 0.0])  # normalised on load
    assert not s.add_existing_group(41, "What is machine learning?", [1.0, 0.0])  # already loaded
    assert calls == []

    match = s.match_embedding("Explain machine learning.", np.array([0.94, 0.34]))
    assert match.is_match and match.group_id == 41
    assert s.find_match("what is machine learning").reason == "exact"


def test_in_memory_ids_do_not_collide_with_loaded_ids():
    s = service(threshold=0.99)
    s.add_existing_group(7, "What is machine learning?", [1.0, 0.0])
    result = s.assign("Explain machine learning.")  # 0.94 < 0.99: new in-memory group
    assert result.created and result.group_id == 8


def test_match_embedding_threshold_and_intent_guard():
    s = service()
    s.add_existing_group(1, "What is machine learning?", [1.0, 0.0])
    assert not s.match_embedding("Explain machine learning.", [0.94, 0.34], threshold=0.95).is_match
    blocked = s.match_embedding("What are the types of machine learning?", [1.0, 0.01])
    assert blocked.reason == "intent_mismatch"


@pytest.mark.parametrize("bad", [[0.0, 0.0], [np.nan, 1.0], [[1.0, 0.0]], []])
def test_bad_vectors_are_rejected(bad):
    s = service()
    with pytest.raises(EmbeddingError):
        s.add_existing_group(1, "What is machine learning?", bad)
    with pytest.raises(EmbeddingError):
        s.match_embedding("What is machine learning?", bad)


def test_loaded_group_with_other_size_is_rejected():
    s = service()
    s.add_existing_group(1, "What is machine learning?", [1.0, 0.0])
    with pytest.raises(EmbeddingError, match="does not match"):
        s.add_existing_group(2, "Explain machine learning.", [1.0, 0.0, 0.0])
