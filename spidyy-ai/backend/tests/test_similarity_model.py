"""Tests with the real all-MiniLM-L6-v2 model, at the default threshold (0.80) and intent guard.

They check grouping decisions on hand-picked pairs, so they document current behaviour on these
examples; they are not an accuracy measurement. Skipped when the model cannot be loaded
(e.g. first run without internet)."""

import pytest

from similarity import DEFAULT_THRESHOLD, EmbeddingError, SimilarityService

pytestmark = pytest.mark.model


@pytest.fixture(scope="module")
def embed():
    """Load MiniLM once for the whole module and share it between services."""
    pytest.importorskip("sentence_transformers")
    try:
        return SimilarityService()._get_embed()
    except EmbeddingError as e:
        pytest.skip(f"MiniLM model unavailable: {e}")


@pytest.fixture
def make_service(embed):
    return lambda **kwargs: SimilarityService(embed_factory=lambda: embed, **kwargs)


def test_default_threshold():
    assert DEFAULT_THRESHOLD == 0.80


def test_exact_duplicate(make_service):
    service = make_service()
    first = service.assign("What is machine learning?")
    second = service.assign("what is machine learning")
    assert second.group_id == first.group_id
    assert second.match.reason == "exact" and second.match.score == 1.0


PARAPHRASES = [
    ("What is machine learning?", "Explain machine learning."),
    ("What is machine learning?", "Can you explain what machine learning is?"),
    ("What is machine learning?", "Define machine learning"),
    ("How do I reverse a linked list?", "How can a linked list be reversed?"),
    ("What is the capital of France?", "Which city is the capital of France?"),
    ("Who wrote the Indian national anthem?", "Who is the author of India's national anthem?"),
    pytest.param(
        "What is inheritance in OOP?",
        "Define inheritance in object oriented programming",
        marks=pytest.mark.xfail(
            strict=True,
            reason=(
                "Known limitation: MiniLM tokenises 'OOP' as 'o' + '##op' and does not link it to "
                "'object oriented programming' (0.75 < 0.80). Acronym expansion was tried and rejected: "
                "it fixed this pair but added false merges (HTTP/HTTPS, class/object in OOP). "
                "See evaluation/README.md."
            ),
        ),
    ),
]


@pytest.mark.parametrize(
    "first, second",
    [
        ("What is inheritance in object oriented programming?", "Define inheritance in object oriented programming"),
        ("What is inheritance in OOP?", "Define inheritance in OOP"),
    ],
)
def test_oop_pair_merges_when_both_use_the_same_form(make_service, first, second):
    """The known miss above is caused by the acronym alone: with the same wording of 'OOP' on both
    sides, the wording difference ('What is' vs 'Define') is handled."""
    service = make_service()
    service.assign(first)
    result = service.assign(second)
    assert not result.created, f"score {result.match.score:.3f}"
    assert result.match.reason == "similar"


@pytest.mark.parametrize("first, second", PARAPHRASES)
def test_paraphrases_share_a_group(make_service, first, second):
    service = make_service()
    a = service.assign(first)
    b = service.assign(second)
    assert not b.created, f"score {b.match.score:.3f}, reason {b.match.reason}"
    assert b.group_id == a.group_id


SAME_TOPIC_DIFFERENT_INTENT = [
    ("What is machine learning?", "What are the types of machine learning?"),
    ("Define inheritance", "Give an example of inheritance"),
    ("What is inheritance?", "What are the types of inheritance?"),
    ("What is machine learning?", "What are the applications of machine learning?"),
    ("What is machine learning?", "What is the difference between machine learning and deep learning?"),
    ("What is photosynthesis?", "Why is photosynthesis important?"),
    ("Advantages of linked list", "Disadvantages of linked list"),
    ("What is Newton's first law?", "What is Newton's second law?"),
    ("What is a linked list?", "How do I reverse a linked list?"),
]


@pytest.mark.parametrize("first, second", SAME_TOPIC_DIFFERENT_INTENT)
def test_same_topic_different_intent_gets_its_own_group(make_service, first, second):
    service = make_service()
    service.assign(first)
    b = service.assign(second)
    assert b.created, f"wrongly merged: score {b.match.score:.3f}"
    assert b.match.reason in ("below_threshold", "intent_mismatch")


def test_cosine_alone_merges_different_intents(make_service):
    """Why the intent guard exists: without it, these pairs pass the 0.80 threshold."""
    service = make_service(intent_guard=False)
    service.assign("Define inheritance")
    service.assign("Advantages of linked list")
    assert not service.assign("Give an example of inheritance").created
    assert not service.assign("Disadvantages of linked list").created


@pytest.mark.parametrize(
    "first, second",
    [
        ("What is machine learning?", "Who wrote the Indian national anthem?"),
        ("What is photosynthesis?", "How do I reverse a linked list?"),
        ("Define inheritance", "What is the boiling point of water?"),
    ],
)
def test_unrelated_questions_get_separate_groups(make_service, first, second):
    service = make_service()
    service.assign(first)
    b = service.assign(second)
    assert b.created
    assert b.match.reason == "below_threshold"
    assert b.match.score < 0.3


def test_threshold_changes_the_decision(make_service):
    # MiniLM scores this pair about 0.83.
    loose, strict = make_service(threshold=0.80), make_service(threshold=0.90)
    for service in (loose, strict):
        service.assign("What is machine learning?")
    assert loose.find_match("Explain machine learning.").is_match
    assert not strict.find_match("Explain machine learning.").is_match


ACRONYM_LIMITATION = (
    "Known limitation: MiniLM does not link this acronym to its full name, so the pair scores below 0.80 "
    "and is counted as two groups. Acronym expansion was tried and rejected (it added false merges such as "
    "HTTP/HTTPS). See evaluation/README.md."
)


@pytest.mark.parametrize(
    "first, second",
    [
        # Works: MiniLM knows this acronym well enough (0.83).
        ("What is AI?", "What is artificial intelligence?"),
        # Same acronym form on both sides works.
        ("What is SQL?", "Define SQL"),
        pytest.param("What is SQL?", "What is Structured Query Language?",
                     marks=pytest.mark.xfail(strict=True, reason=ACRONYM_LIMITATION)),
        pytest.param("What is CPU?", "What is a central processing unit?",
                     marks=pytest.mark.xfail(strict=True, reason=ACRONYM_LIMITATION)),
    ],
)
def test_acronym_and_expanded_term(make_service, first, second):
    service = make_service()
    service.assign(first)
    result = service.assign(second)
    assert not result.created, f"score {result.match.score:.3f}"


def test_different_acronyms_stay_separate(make_service):
    """The failure mode that ruled out acronym expansion must not appear."""
    service = make_service()
    service.assign("What is HTTP?")
    assert service.assign("What is HTTPS?").created
