"""Checks on the whole labelled set (evaluation/question_pairs.csv) with the real MiniLM model, at the
configured threshold and with the intent guard on.

The precision/recall floors sit just below the measured values (test: precision 0.85, recall 0.78), so a
change that makes grouping worse fails here. They are regression floors, not quality claims: the
dataset is synthetic and small (see evaluation/README.md)."""

import pytest

from evaluation import evaluate_similarity as ev
from similarity import DEFAULT_THRESHOLD, EmbeddingError, SimilarityService

pytestmark = pytest.mark.model


@pytest.fixture(scope="module")
def pairs():
    pytest.importorskip("sentence_transformers")
    try:
        embed = SimilarityService()._get_embed()
    except EmbeddingError as e:
        pytest.skip(f"MiniLM model unavailable: {e}")
    pairs = ev.load_pairs(ev.DEFAULT_PAIRS)
    ev.score_pairs(pairs, embed)
    return pairs


def predicted(pair, intent_guard=True):
    return ev.predict(pair, DEFAULT_THRESHOLD, intent_guard)


def test_every_exact_duplicate_is_merged(pairs):
    exact = [p for p in pairs if p.category == "exact_variant"]
    assert exact and all(predicted(p) for p in exact)


def test_no_unrelated_question_is_merged(pairs):
    unrelated = [p for p in pairs if p.category == "unrelated"]
    assert unrelated and not [p.id for p in unrelated if predicted(p)]


def test_no_related_topic_question_is_merged(pairs):
    related = [p for p in pairs if p.category == "related_topic"]
    assert related and not [p.id for p in related if predicted(p)]


def test_intent_guard_reduces_same_topic_false_merges(pairs):
    same_topic = [p for p in pairs if p.category in ("different_intent", "different_entity")]
    with_guard = sum(predicted(p, True) for p in same_topic)
    without_guard = sum(predicted(p, False) for p in same_topic)
    assert with_guard < without_guard


def test_test_split_precision_and_recall_floors(pairs):
    m = ev.evaluate([p for p in pairs if p.split == "test"], DEFAULT_THRESHOLD, intent_guard=True)
    assert m.precision >= 0.80, m
    assert m.recall >= 0.75, m


def test_dev_split_precision_and_recall_floors(pairs):
    m = ev.evaluate([p for p in pairs if p.split == "dev"], DEFAULT_THRESHOLD, intent_guard=True)
    assert m.precision >= 0.90, m
    assert m.recall >= 0.70, m
