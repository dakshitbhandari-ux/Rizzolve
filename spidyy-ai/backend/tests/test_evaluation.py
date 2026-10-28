"""Tests for evaluation/evaluate_similarity.py: data checks, metrics, and that its pairwise decision
matches what SimilarityService actually does (so the evaluation measures the real service)."""

import zlib

import numpy as np
import pytest

from evaluation import evaluate_similarity as ev
from similarity import SimilarityService


def trigram_embed(texts):
    """Deterministic fake embedder: hashed character trigrams, so similar wording -> similar vectors."""
    out = np.zeros((len(texts), 64), dtype=np.float32)
    for i, text in enumerate(texts):
        t = f"  {text.casefold()}  "
        for j in range(len(t) - 2):
            out[i, zlib.crc32(t[j:j + 3].encode()) % 64] += 1
    return out


def make_pair(pid="x1", split="dev", category="paraphrase", label=1, a="What is ML?", b="Explain ML"):
    return ev.Pair(pid, split, category, label, a, b)


# ---------- The shipped dataset ----------

def test_shipped_dataset_is_valid():
    pairs = ev.load_pairs(ev.DEFAULT_PAIRS)
    errors, warnings = ev.check_pairs(pairs)
    assert errors == []
    assert warnings == []
    assert {p.split for p in pairs} == {"dev", "test"}
    assert len(pairs) >= 150


# ---------- Same decision as the service ----------

def test_predict_matches_the_service():
    pairs = [p for p in ev.load_pairs(ev.DEFAULT_PAIRS)][:60]
    ev.score_pairs(pairs, trigram_embed)
    for threshold in (0.3, 0.5, 0.7, 0.9):
        for guard in (False, True):
            for p in pairs:
                service = SimilarityService(threshold=threshold, intent_guard=guard,
                                            embed_factory=lambda: trigram_embed)
                service.assign(p.question_a)
                expected = service.find_match(p.question_b).is_match
                assert ev.predict(p, threshold, guard) == expected, (p.id, threshold, guard, p.score)


# ---------- Data checks ----------

def test_check_pairs_finds_problems():
    pairs = [
        make_pair("a1"),
        make_pair("a1", a="Explain ML", b="What is ML?"),  # duplicate id, and the same pair reversed
        make_pair("a3", category="paraphrase", label=0, a="Define ML", b="define ml."),  # identical, labelled 0
        make_pair("a4", split="test", label=1, a="What is AI?", b="Explain AI"),  # test has no label 0
    ]
    errors, warnings = ev.check_pairs(pairs)
    text = "\n".join(errors)
    assert "duplicate id a1" in text
    assert "repeats pair" in text
    assert "identical questions labelled 0" in text
    assert "split 'test' needs both" in text
    assert any("a3" in w for w in warnings)  # identical text but not categorised exact_variant


def test_check_pairs_warns_about_questions_in_both_splits():
    pairs = [
        make_pair("d1", "dev", label=1, a="What is ML?", b="Explain ML"),
        make_pair("d2", "dev", "unrelated", 0, a="What is ML?", b="Who wrote Hamlet?"),
        make_pair("t1", "test", label=1, a="What is ML?", b="Define ML"),
        make_pair("t2", "test", "unrelated", 0, a="What is AI?", b="Who wrote Macbeth?"),
    ]
    errors, warnings = ev.check_pairs(pairs)
    assert errors == []
    assert any("both dev and test" in w and "what is ml" in w for w in warnings)


def test_load_pairs_rejects_bad_rows(tmp_path):
    path = tmp_path / "pairs.csv"
    path.write_text(
        "id,split,category,label,question_a,question_b,notes\n"
        "x1,dev,paraphrase,yes,What is ML?,Explain ML,\n"
        "x2,train,paraphrase,1,What is ML?,Explain ML,\n"
        "x3,dev,paraphrase,1,,Explain ML,\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError) as e:
        ev.load_pairs(path)
    assert "line 2" in str(e.value) and "line 3" in str(e.value) and "line 4" in str(e.value)


def test_load_pairs_rejects_missing_columns(tmp_path):
    path = tmp_path / "pairs.csv"
    path.write_text("id,question_a,question_b\nx1,a,b\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing columns"):
        ev.load_pairs(path)


# ---------- Metrics ----------

def test_metrics():
    m = ev.Metrics(tp=6, fp=2, fn=4, tn=8)
    assert m.precision == pytest.approx(0.75)
    assert m.recall == pytest.approx(0.6)
    assert m.f(1) == pytest.approx(2 * 0.75 * 0.6 / 1.35)
    assert m.f(0.5) == pytest.approx(1.25 * 0.75 * 0.6 / (0.25 * 0.75 + 0.6))


def test_metrics_with_no_predicted_positives():
    m = ev.Metrics(tp=0, fp=0, fn=5, tn=5)
    assert np.isnan(m.precision)
    assert m.recall == 0
    assert m.f(1) == 0


def test_evaluate_counts():
    pairs = [make_pair(label=1), make_pair(label=0), make_pair(label=1), make_pair(label=0)]
    for p, score in zip(pairs, (0.9, 0.9, 0.5, 0.5)):
        p.score = score
    assert ev.evaluate(pairs, 0.8, intent_guard=False) == ev.Metrics(tp=1, fp=1, fn=1, tn=1)


def test_wilson_interval():
    low, high = ev.wilson_interval(8, 10)
    assert low == pytest.approx(0.490, abs=1e-3)
    assert high == pytest.approx(0.943, abs=1e-3)
    assert all(np.isnan(ev.wilson_interval(0, 0)))


def test_select_threshold_prefers_higher_on_ties():
    pairs = [make_pair(label=1), make_pair(label=0)]
    pairs[0].score, pairs[1].score = 0.95, 0.4
    assert ev.select_threshold(pairs, [0.5, 0.6, 0.7], intent_guard=False) == 0.7


def test_parse_thresholds():
    assert ev.parse_thresholds("0.8, 0.7,0.8") == [0.7, 0.8]
    with pytest.raises(Exception):
        ev.parse_thresholds("0.8,1.5")


# ---------- End to end (fake model) ----------

def test_main_writes_report_and_csv(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ev, "_load_sentence_transformer", lambda name: trigram_embed)
    report, sweep = tmp_path / "results.md", tmp_path / "sweep.csv"

    assert ev.main(["--errors", "--report", str(report), "--csv", str(sweep)]) == 0

    text = report.read_text(encoding="utf-8")
    assert "## Threshold sweep: test, cosine + intent guard" in text
    assert "## Errors at threshold" in text
    assert text.strip() == capsys.readouterr().out.strip()
    assert len(sweep.read_text(encoding="utf-8").splitlines()) == 1 + 2 * 2 * len(ev.DEFAULT_THRESHOLDS)


def test_main_stops_on_bad_data(tmp_path, capsys):
    path = tmp_path / "pairs.csv"
    path.write_text("id,split,category,label,question_a,question_b\nx1,dev,p,1,a,b\nx1,test,p,0,c,d\n",
                    encoding="utf-8")
    assert ev.main(["--pairs", str(path)]) == 2
    assert "duplicate id" in capsys.readouterr().err
