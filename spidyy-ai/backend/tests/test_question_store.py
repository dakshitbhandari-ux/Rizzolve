"""Tests for question_store.py on a temporary SQLite database, with a fake embedder.

The grouping decisions come from the real SimilarityService (threshold 0.80, intent guard on);
only the embedding model is faked, so these tests check storage, counting and failure handling.
Real-model grouping is tested in test_question_store_model.py, PostgreSQL in test_question_store_postgres.py.
"""

import logging
import math
import threading

import numpy as np
import pytest
from sqlalchemy import event, func, select
from sqlalchemy.exc import OperationalError

from database import create_engine_from_url, create_session_factory
from models import Base, QuestionGroup, QuestionSubmission
from question_store import QuestionRecorder, StorageError, embedding_to_bytes, question_hash
from similarity import EmbeddingError, InvalidQuestionError, SimilarityService, normalize_question


def unit(angle_deg, z=0.0):
    a = math.radians(angle_deg)
    return [math.cos(a), math.sin(a), z]


# Cosine with "what is machine learning": explain ~0.94 (paraphrase), describe ~0.77 (below 0.80),
# types ~0.996 (very close, but a different intent), anthem 0.
VECTORS = {
    "what is machine learning": unit(0),
    "explain machine learning": unit(20),
    "can you explain what machine learning is": unit(15),
    "describe machine learning briefly": unit(40),
    "what are the types of machine learning": unit(5),
    "who wrote the national anthem": [0.0, 0.0, 1.0],
    "define inheritance": [0.0, 1.0, 0.0],
    "give an example of inheritance": [0.0, 0.995, 0.0998],  # cosine 0.995, different intent
}


class FakeModel:
    """Returns preset vectors and records which texts were embedded."""

    def __init__(self):
        self.loads = 0
        self.encoded = []

    def factory(self):
        self.loads += 1
        return self.encode

    def encode(self, texts):
        self.encoded.extend(texts)
        return np.array([VECTORS[normalize_question(t)] for t in texts], dtype=np.float32)


@pytest.fixture
def engine(tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'questions.db'}")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine):
    return create_session_factory(engine)


@pytest.fixture
def model():
    return FakeModel()


def make_recorder(db, model, **kwargs):
    return QuestionRecorder(SimilarityService(embed_factory=model.factory, **kwargs), db)


@pytest.fixture
def recorder(db, model):
    return make_recorder(db, model)


def groups(db):
    with db() as s:
        return s.scalars(select(QuestionGroup).order_by(QuestionGroup.id)).all()


def submissions(db):
    with db() as s:
        return s.scalars(select(QuestionSubmission).order_by(QuestionSubmission.id)).all()


def assert_counts_match_submissions(db):
    """question_count of every group equals its number of stored submissions."""
    with db() as s:
        actual = dict(s.execute(select(QuestionSubmission.question_group_id, func.count())
                                .group_by(QuestionSubmission.question_group_id)).all())
        for g in s.scalars(select(QuestionGroup)):
            assert g.question_count == actual.get(g.id, 0), (g.id, g.question_count, actual.get(g.id))


@pytest.fixture
def fail_on_submission_insert(db):
    """Make the next INSERT into question_submissions fail like a real database error."""

    def fail(mapper, connection, target):
        raise OperationalError("INSERT INTO question_submissions", {}, Exception("disk I/O error"))

    event.listen(QuestionSubmission, "before_insert", fail)
    yield
    event.remove(QuestionSubmission, "before_insert", fail)


# ---------- Creating a group ----------

def test_first_question_creates_a_group(recorder, db):
    result = recorder.record("What is machine learning?")

    assert result.created
    [group] = groups(db)
    assert group.id == result.group_id
    assert group.canonical_question == "What is machine learning?"
    assert group.question_count == 1
    assert group.embedding_model == "sentence-transformers/all-MiniLM-L6-v2"
    assert group.embedding_dim == 3
    assert len(group.representative_embedding) == 3 * 4  # float32
    assert group.created_at == group.last_asked_at

    [submission] = submissions(db)
    assert submission.id == result.submission_id
    assert submission.question_group_id == group.id
    assert submission.match_reason == "new"
    assert submission.similarity_score is None
    assert submission.question_hash == question_hash("What is machine learning?")


def test_stored_embedding_is_unit_length(recorder, db):
    recorder.record("What is machine learning?")
    vector = np.frombuffer(groups(db)[0].representative_embedding, dtype="<f4")
    assert np.linalg.norm(vector) == pytest.approx(1.0, abs=1e-6)


# ---------- Exact duplicates ----------

def test_exact_duplicate_joins_group_without_embedding(recorder, db, model):
    first = recorder.record("What is machine learning?")
    model.encoded.clear()
    second = recorder.record("  what IS   machine learning  ")

    assert not second.created
    assert second.group_id == first.group_id
    assert second.match.reason == "exact" and second.match.score == 1.0
    assert model.encoded == []  # found by the stored hash, no embedding
    assert [g.question_count for g in groups(db)] == [2]
    assert [s.match_reason for s in submissions(db)] == ["new", "exact"]


def test_exact_repeat_of_a_paraphrase_stays_in_its_group(recorder, db):
    first = recorder.record("What is machine learning?")
    recorder.record("Explain machine learning.")  # joins as a paraphrase
    again = recorder.record("explain machine learning")
    assert again.group_id == first.group_id and again.match.reason == "exact"


# ---------- Paraphrases and different intents ----------

def test_paraphrase_joins_group(recorder, db):
    first = recorder.record("What is machine learning?")
    second = recorder.record("Explain machine learning.")

    assert not second.created
    assert second.group_id == first.group_id
    assert second.match.reason == "similar"
    assert second.match.score == pytest.approx(math.cos(math.radians(20)), abs=1e-5)
    [group] = groups(db)
    assert group.question_count == 2
    assert group.canonical_question == "What is machine learning?"  # the first question stays canonical
    assert submissions(db)[1].similarity_score == pytest.approx(second.match.score)


@pytest.mark.parametrize(
    "first, second",
    [
        ("What is machine learning?", "What are the types of machine learning?"),
        ("Define inheritance", "Give an example of inheritance"),
    ],
)
def test_different_intent_gets_its_own_group(recorder, db, first, second):
    a = recorder.record(first)
    b = recorder.record(second)

    assert b.created and b.group_id != a.group_id
    assert b.match.reason == "intent_mismatch"  # high cosine, blocked by the intent guard
    assert [g.question_count for g in groups(db)] == [1, 1]


def test_below_threshold_and_unrelated_get_their_own_groups(recorder, db):
    recorder.record("What is machine learning?")
    assert recorder.record("Describe machine learning briefly").match.reason == "below_threshold"
    assert recorder.record("Who wrote the national anthem?").created
    assert [g.question_count for g in groups(db)] == [1, 1, 1]


def test_threshold_comes_from_the_similarity_service(db, model):
    loose = make_recorder(db, model, threshold=0.7)
    loose.record("What is machine learning?")
    assert not loose.record("Describe machine learning briefly").created  # 0.77 >= 0.7


# ---------- Frequency counts ----------

def test_frequency_counts(recorder, db):
    asked = [
        "What is machine learning?",
        "Explain machine learning.",
        "What is machine learning?",
        "Who wrote the national anthem?",
        "Can you explain what machine learning is?",
        "What are the types of machine learning?",
        "who wrote the national anthem",
        "What are the types of machine learning?",
        "What is machine learning?",
    ]
    for q in asked:
        recorder.record(q)

    counts = {g.canonical_question: g.question_count for g in groups(db)}
    assert counts == {
        "What is machine learning?": 5,
        "Who wrote the national anthem?": 2,
        "What are the types of machine learning?": 2,
    }
    assert sum(counts.values()) == len(asked) == len(submissions(db))
    assert_counts_match_submissions(db)


def test_last_asked_at_moves_to_the_latest_submission(recorder, db):
    recorder.record("What is machine learning?")
    recorder.record("Explain machine learning.")
    group = groups(db)[0]
    latest = max(s.created_at for s in submissions(db))
    assert group.last_asked_at == latest
    assert group.last_asked_at >= group.created_at


# ---------- Original submissions ----------

def test_original_submissions_are_kept_as_asked(recorder, db):
    asked = ["What is Machine Learning?!", "explain   MACHINE learning.", "  What is machine learning  "]
    for q in asked:
        recorder.record(q)
    stored = [s.original_question for s in submissions(db)]
    # Only surrounding whitespace is removed; case, inner spacing and punctuation are kept.
    assert stored == ["What is Machine Learning?!", "explain   MACHINE learning.", "What is machine learning"]


# ---------- Invalid input ----------

@pytest.mark.parametrize("bad", ["", "   \n\t", "???", None, 42, ["What is ML?"], "x" * 2001])
def test_invalid_question_stores_nothing(recorder, db, model, bad):
    with pytest.raises(InvalidQuestionError):
        recorder.record(bad)
    assert groups(db) == [] and submissions(db) == []
    assert model.loads == 0


def test_embedding_error_stores_nothing(db):
    def broken_factory():
        raise OSError("model files not found")

    recorder = QuestionRecorder(SimilarityService(embed_factory=broken_factory), db)
    with pytest.raises(EmbeddingError):
        recorder.record("What is machine learning?")
    assert groups(db) == [] and submissions(db) == []


# ---------- Database failures and rollback ----------

def test_failed_insert_rolls_back_the_new_group(recorder, db, fail_on_submission_insert):
    with pytest.raises(StorageError, match="not recorded"):
        recorder.record("What is machine learning?")
    assert groups(db) == [] and submissions(db) == []  # the group insert was rolled back too
    assert recorder.similarity.group_count == 0  # and the cache never saw it


def test_failed_insert_keeps_the_existing_count(recorder, db):
    recorder.record("What is machine learning?")

    def fail(mapper, connection, target):
        raise OperationalError("INSERT INTO question_submissions", {}, Exception("disk I/O error"))

    event.listen(QuestionSubmission, "before_insert", fail)
    try:
        with pytest.raises(StorageError):
            recorder.record("Explain machine learning.")  # paraphrase path
        with pytest.raises(StorageError):
            recorder.record("What is machine learning?")  # exact-repeat path
    finally:
        event.remove(QuestionSubmission, "before_insert", fail)

    assert [g.question_count for g in groups(db)] == [1]
    assert len(submissions(db)) == 1
    assert_counts_match_submissions(db)


def test_failed_commit_is_not_counted_and_does_not_poison_the_cache(recorder, db):
    def fail_commit(session):
        raise OperationalError("COMMIT", {}, Exception("connection lost"))

    event.listen(db, "before_commit", fail_commit)
    try:
        with pytest.raises(StorageError):
            recorder.record("What is machine learning?")
    finally:
        event.remove(db, "before_commit", fail_commit)

    assert groups(db) == [] and submissions(db) == []
    assert recorder.similarity.group_count == 0
    # The next attempt works normally and is counted once.
    result = recorder.record("What is machine learning?")
    assert result.created
    assert [g.question_count for g in groups(db)] == [1]


def test_missing_tables_raise_storage_error(tmp_path, model):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'empty.db'}")  # no create_all
    try:
        recorder = make_recorder(create_session_factory(engine), model)
        with pytest.raises(StorageError):
            recorder.record("What is machine learning?")
    finally:
        engine.dispose()


def test_unreachable_database_raises_storage_error(tmp_path, model):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'no_such_folder' / 'questions.db'}")
    try:
        with pytest.raises(StorageError):
            make_recorder(create_session_factory(engine), model).record("What is machine learning?")
    finally:
        engine.dispose()


def test_storage_error_hides_the_question_text(recorder, fail_on_submission_insert):
    with pytest.raises(StorageError) as e:
        recorder.record("What is machine learning?")
    assert "machine learning" not in str(e.value)


# ---------- Stored groups are reused, not re-embedded ----------

def test_restart_reuses_stored_groups_without_re_embedding(db):
    first_model = FakeModel()
    make_recorder(db, first_model).record("What is machine learning?")

    # A new process: new service, new cache, same database.
    restarted_model = FakeModel()
    restarted = make_recorder(db, restarted_model)
    paraphrase = restarted.record("Explain machine learning.")
    repeat = restarted.record("What is machine learning?")

    assert not paraphrase.created and not repeat.created
    assert restarted_model.encoded == ["Explain machine learning."]  # the stored group was not embedded again
    assert [g.question_count for g in groups(db)] == [3]


def test_groups_stored_by_another_process_are_used(db):
    worker_a, worker_b = make_recorder(db, FakeModel()), make_recorder(db, FakeModel())
    a = worker_a.record("What is machine learning?")
    worker_b.record("Who wrote the national anthem?")  # B's cache now holds both groups
    b = worker_b.record("Explain machine learning.")
    assert b.group_id == a.group_id
    assert len(groups(db)) == 2


def test_groups_of_another_model_are_ignored(db, model):
    with db.begin() as s:
        other = QuestionGroup(canonical_question="What is machine learning?",
                              representative_embedding=embedding_to_bytes(VECTORS["what is machine learning"]),
                              embedding_model="some-other-model", embedding_dim=3, question_count=1)
        s.add(other)
        s.flush()
        s.add(QuestionSubmission(original_question="What is machine learning?",
                                 question_hash=question_hash("What is machine learning?"),
                                 question_group_id=other.id, match_reason="new"))

    result = make_recorder(db, model).record("What is machine learning?")
    assert result.created and result.group_id != other.id
    assert {g.embedding_model: g.question_count for g in groups(db)} == {
        "some-other-model": 1, "sentence-transformers/all-MiniLM-L6-v2": 1}


def test_damaged_stored_embedding_is_skipped(db, model, caplog):
    with db.begin() as s:
        s.add(QuestionGroup(canonical_question="Who wrote the national anthem?",
                            representative_embedding=b"\x00" * 5,  # not 3 float32 values
                            embedding_model="sentence-transformers/all-MiniLM-L6-v2",
                            embedding_dim=3, question_count=0))
    with caplog.at_level(logging.ERROR, logger="spidyy.question_store"):
        result = make_recorder(db, model).record("What is machine learning?")
    assert result.created
    assert "unusable embedding" in caplog.text


# ---------- Concurrency ----------

def wait_after_first_match(recorder, barrier):
    """Make the recorder pause after its first (unlocked) similarity check until the other one
    has also done it, so both decide "no existing group" before either creates one."""
    original = recorder.similarity.match_embedding
    state = {"waited": False}

    def match_then_wait(question, vector, threshold=None):
        result = original(question, vector, threshold)
        if not state["waited"]:
            state["waited"] = True
            barrier.wait()
        return result

    recorder.similarity.match_embedding = match_then_wait


@pytest.mark.parametrize(
    "question_a, question_b",
    [("What is machine learning?", "Explain machine learning."),  # paraphrases
     ("What is machine learning?", "What is machine learning?")],  # the same new question
)
def test_two_workers_racing_on_a_new_question_create_one_group(db, question_a, question_b):
    """Two server processes (separate caches and locks) get the same new question at the same moment."""
    worker_a, worker_b = make_recorder(db, FakeModel()), make_recorder(db, FakeModel())
    barrier = threading.Barrier(2, timeout=10)
    wait_after_first_match(worker_a, barrier)
    wait_after_first_match(worker_b, barrier)
    results, errors = [], []

    def ask(worker, q):
        try:
            results.append(worker.record(q))
        except Exception as e:  # pragma: no cover - reported below
            errors.append(e)

    threads = [threading.Thread(target=ask, args=(worker_a, question_a)),
               threading.Thread(target=ask, args=(worker_b, question_b))]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    assert sorted(r.created for r in results) == [False, True]  # one created it, the other joined
    assert [g.question_count for g in groups(db)] == [2]
    assert_counts_match_submissions(db)

def test_concurrent_submissions_are_all_counted_in_one_group(recorder, db):
    questions = ["What is machine learning?", "Explain machine learning.", "what is machine learning"] * 10
    errors = []

    def ask(q):
        try:
            recorder.record(q)
        except Exception as e:  # pragma: no cover - reported below
            errors.append(e)

    threads = [threading.Thread(target=ask, args=(q,)) for q in questions]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == []
    assert [g.question_count for g in groups(db)] == [30]
    assert len(submissions(db)) == 30
    assert_counts_match_submissions(db)
