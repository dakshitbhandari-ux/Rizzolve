"""
Spidyy AI - evaluate question grouping on labelled question pairs.

For each pair (A, B) the script makes the decision similarity.py makes when A is a group's
representative and B is a new question:
    same normalised text                                   -> same group
    otherwise cosine similarity >= threshold, and (with the intent guard on) the same
    intents and numbers                                    -> same group
It reports precision, recall, F1 and F0.5 per threshold, with and without the intent guard.

Protocol: pick the threshold on the dev split, then read the test split at that threshold.
Picking it by looking at test results would overstate how well it carries over to new questions.

Run from the backend/ folder:
    python evaluation/evaluate_similarity.py
    python evaluation/evaluate_similarity.py --errors --report evaluation/results.md
"""

import argparse
import csv
import math
import statistics
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# Make backend/ importable when run as "python evaluation/evaluate_similarity.py".
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from similarity import (  # noqa: E402
    DEFAULT_MODEL,
    DEFAULT_THRESHOLD,
    _load_sentence_transformer,
    normalize_question,
    question_signature,
)

DEFAULT_PAIRS = Path(__file__).resolve().parent / "question_pairs.csv"
DEFAULT_THRESHOLDS = [round(0.50 + 0.05 * i, 2) for i in range(10)]  # 0.50 ... 0.95
SPLITS = ("dev", "test")
REQUIRED_COLUMNS = {"id", "split", "category", "label", "question_a", "question_b"}
# The threshold is chosen on dev by F0.5, which weighs precision twice as much as recall:
# wrongly merging two questions (later: showing the answer to a different question) is worse
# than missing a duplicate (later: one extra Gemini call).
SELECTION_BETA = 0.5


@dataclass
class Pair:
    id: str
    split: str
    category: str
    label: int  # 1 = same group, 0 = different groups
    question_a: str
    question_b: str
    notes: str = ""
    # Filled in by score_pairs():
    score: float = float("nan")
    exact: bool = False
    compatible: bool = True  # same intents and numbers (what the intent guard checks)


# ---------- Data ----------

def load_pairs(path) -> list[Pair]:
    """Read the CSV. Raises ValueError listing every malformed row."""
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path}: missing columns {sorted(missing)}")
        pairs, problems = [], []
        for line, row in enumerate(reader, start=2):
            label, split = (row["label"] or "").strip(), (row["split"] or "").strip()
            a, b = (row["question_a"] or "").strip(), (row["question_b"] or "").strip()
            row_problems = []
            if label not in ("0", "1"):
                row_problems.append(f"line {line}: label must be 0 or 1, got {label!r}")
            if split not in SPLITS:
                row_problems.append(f"line {line}: split must be one of {SPLITS}, got {split!r}")
            if not a or not b:
                row_problems.append(f"line {line}: empty question")
            if row_problems:
                problems += row_problems
            else:
                pairs.append(Pair(row["id"].strip(), split, row["category"].strip(), int(label), a, b,
                                  (row.get("notes") or "").strip()))
    if problems:
        raise ValueError(f"{path}:\n  " + "\n  ".join(problems))
    return pairs


def check_pairs(pairs) -> tuple[list[str], list[str]]:
    """Data-quality checks. Returns (errors, warnings); errors make the results meaningless."""
    errors, warnings = [], []

    seen_ids = set()
    for p in pairs:
        if p.id in seen_ids:
            errors.append(f"duplicate id {p.id}")
        seen_ids.add(p.id)

    # The same pair twice (in either order) is counted twice; across splits it is leakage.
    seen_pairs = {}
    for p in pairs:
        key = frozenset((normalize_question(p.question_a), normalize_question(p.question_b)))
        if key in seen_pairs:
            errors.append(f"{p.id} repeats pair {seen_pairs[key]}")
        else:
            seen_pairs[key] = p.id

    for p in pairs:
        same_text = normalize_question(p.question_a) == normalize_question(p.question_b)
        if same_text and p.label == 0:
            errors.append(f"{p.id}: identical questions labelled 0")
        if same_text != (p.category == "exact_variant"):
            warnings.append(f"{p.id}: category {p.category!r} but identical text is {same_text}")

    # A question used in both splits lets dev tuning see part of the test set.
    by_split = {s: {normalize_question(q) for p in pairs if p.split == s for q in (p.question_a, p.question_b)}
                for s in SPLITS}
    shared = by_split["dev"] & by_split["test"]
    if shared:
        warnings.append(f"{len(shared)} question(s) appear in both dev and test: {sorted(shared)}")

    for s in SPLITS:
        labels = {p.label for p in pairs if p.split == s}
        if labels != {0, 1}:
            errors.append(f"split {s!r} needs both positive and negative pairs, has labels {sorted(labels)}")
    return errors, warnings


def score_pairs(pairs, embed) -> None:
    """Set score, exact and compatible on every pair. Each distinct question is embedded once."""
    questions = sorted({q for p in pairs for q in (p.question_a, p.question_b)})
    vectors = np.asarray(embed(questions), dtype=np.float32)
    vectors /= np.linalg.norm(vectors, axis=1, keepdims=True)
    row = {q: i for i, q in enumerate(questions)}
    for p in pairs:
        p.exact = normalize_question(p.question_a) == normalize_question(p.question_b)
        p.score = 1.0 if p.exact else float(vectors[row[p.question_a]] @ vectors[row[p.question_b]])
        p.compatible = question_signature(p.question_a) == question_signature(p.question_b)


def predict(pair, threshold, intent_guard) -> bool:
    """Same decision as SimilarityService.find_match() with question A as the only group."""
    if pair.exact:
        return True
    return pair.score >= threshold and (pair.compatible or not intent_guard)


# ---------- Metrics ----------

@dataclass
class Metrics:
    tp: int = 0
    fp: int = 0
    fn: int = 0
    tn: int = 0

    @property
    def precision(self):
        return self.tp / (self.tp + self.fp) if self.tp + self.fp else float("nan")

    @property
    def recall(self):
        return self.tp / (self.tp + self.fn) if self.tp + self.fn else float("nan")

    def f(self, beta=1.0):
        p, r = self.precision, self.recall
        if math.isnan(p) or math.isnan(r) or p + r == 0:
            return 0.0
        return (1 + beta**2) * p * r / (beta**2 * p + r)


def evaluate(pairs, threshold, intent_guard) -> Metrics:
    m = Metrics()
    for p in pairs:
        predicted = predict(p, threshold, intent_guard)
        if predicted and p.label:
            m.tp += 1
        elif predicted:
            m.fp += 1
        elif p.label:
            m.fn += 1
        else:
            m.tn += 1
    return m


def wilson_interval(successes, n, z=1.96) -> tuple[float, float]:
    """95% Wilson score interval for a proportion; better than p +/- 1.96*SE for small n."""
    if n == 0:
        return float("nan"), float("nan")
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return centre - half, centre + half


def select_threshold(pairs, thresholds, intent_guard) -> float:
    """Threshold with the best F0.5; ties go to the higher (more cautious) threshold."""
    return max(thresholds, key=lambda t: (evaluate(pairs, t, intent_guard).f(SELECTION_BETA), t))


# ---------- Report ----------

def fmt(x) -> str:
    return "–" if isinstance(x, float) and math.isnan(x) else f"{x:.2f}"


def fmt_ci(successes, n) -> str:
    if n == 0:
        return "–"
    low, high = wilson_interval(successes, n)
    return f"{successes / n:.2f} [{low:.2f}, {high:.2f}] ({successes}/{n})"


def guard_name(intent_guard) -> str:
    return "cosine + intent guard" if intent_guard else "cosine only"


def sweep_table(pairs, thresholds, intent_guard) -> list[str]:
    lines = ["| Threshold | TP | FP | FN | TN | Precision | Recall | F1 | F0.5 |",
             "|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for t in thresholds:
        m = evaluate(pairs, t, intent_guard)
        lines.append(f"| {t:.2f} | {m.tp} | {m.fp} | {m.fn} | {m.tn} | {fmt(m.precision)} | {fmt(m.recall)} "
                     f"| {fmt(m.f(1))} | {fmt(m.f(0.5))} |")
    return lines


def build_report(pairs, thresholds, focus_threshold, model_name, warnings, show_errors) -> list[str]:
    split_pairs = {s: [p for p in pairs if p.split == s] for s in SPLITS}
    out = ["# Question grouping evaluation", "",
           f"Model `{model_name}`, {len(pairs)} labelled pairs. "
           "Label 1 = one good answer to A fully answers B (see evaluation/README.md).", ""]

    if warnings:
        out += ["## Data warnings", ""] + [f"- {w}" for w in warnings] + [""]

    out += ["## Dataset", "", "| Split | Category | Pairs | Label 1 | Label 0 |", "|---|---|---:|---:|---:|"]
    for s in SPLITS:
        for cat in sorted({p.category for p in split_pairs[s]}):
            group = [p for p in split_pairs[s] if p.category == cat]
            pos = sum(p.label for p in group)
            out.append(f"| {s} | {cat} | {len(group)} | {pos} | {len(group) - pos} |")
    out.append("")

    out += ["## Cosine scores by category (all splits)", "",
            "| Category | Label | Min | Median | Max | Intent guard would block |",
            "|---|---:|---:|---:|---:|---:|"]
    for cat in sorted({p.category for p in pairs}):
        group = [p for p in pairs if p.category == cat]
        scores = [p.score for p in group]
        blocked = sum(not p.compatible and not p.exact for p in group)
        out.append(f"| {cat} | {group[0].label} | {min(scores):.2f} | {statistics.median(scores):.2f} "
                   f"| {max(scores):.2f} | {blocked}/{len(group)} |")
    out.append("")

    for s in SPLITS:
        for guard in (False, True):
            out += [f"## Threshold sweep: {s}, {guard_name(guard)}", ""]
            out += sweep_table(split_pairs[s], thresholds, guard) + [""]

    out += ["## Threshold chosen on dev (best F0.5), measured on test", "",
            "Precision and recall on test with 95% Wilson intervals.", "",
            "| Method | Threshold | Dev F0.5 | Test precision | Test recall | Test F1 |",
            "|---|---:|---:|---|---|---:|"]
    candidates = [(guard, select_threshold(split_pairs["dev"], thresholds, guard), "dev-selected")
                  for guard in (False, True)]
    candidates.append((True, focus_threshold, "configured"))
    for guard, t, how in candidates:
        dev, test = evaluate(split_pairs["dev"], t, guard), evaluate(split_pairs["test"], t, guard)
        out.append(f"| {guard_name(guard)} ({how}) | {t:.2f} | {fmt(dev.f(0.5))} "
                   f"| {fmt_ci(test.tp, test.tp + test.fp)} | {fmt_ci(test.tp, test.tp + test.fn)} "
                   f"| {fmt(test.f(1))} |")
    out.append("")

    out += [f"## Test accuracy by category at threshold {focus_threshold:.2f}", "",
            "| Category | Pairs | Correct, cosine only | Correct, cosine + intent guard |", "|---|---:|---:|---:|"]
    for cat in sorted({p.category for p in split_pairs["test"]}):
        group = [p for p in split_pairs["test"] if p.category == cat]
        correct = [sum(predict(p, focus_threshold, g) == bool(p.label) for p in group) for g in (False, True)]
        out.append(f"| {cat} | {len(group)} | {correct[0]} | {correct[1]} |")
    out.append("")

    if show_errors:
        out += [f"## Errors at threshold {focus_threshold:.2f}, {guard_name(True)}", "",
                "FP = merged but should be separate; FN = should be merged but kept separate.", "",
                "| ID | Error | Category | Score | Guard | Question A | Question B |", "|---|---|---|---:|---|---|---|"]
        for p in sorted(pairs, key=lambda p: (p.split, p.id)):
            predicted = predict(p, focus_threshold, True)
            if predicted != bool(p.label):
                guard = "same" if p.compatible else "blocks"
                out.append(f"| {p.id} | {'FP' if predicted else 'FN'} | {p.category} | {p.score:.2f} | {guard} "
                           f"| {p.question_a} | {p.question_b} |")
        out.append("")
    return out


def write_sweep_csv(path, pairs, thresholds) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["split", "intent_guard", "threshold", "tp", "fp", "fn", "tn",
                         "precision", "recall", "f1", "f0_5"])
        for s in SPLITS:
            for guard in (False, True):
                for t in thresholds:
                    m = evaluate([p for p in pairs if p.split == s], t, guard)
                    writer.writerow([s, guard, t, m.tp, m.fp, m.fn, m.tn, f"{m.precision:.4f}",
                                     f"{m.recall:.4f}", f"{m.f(1):.4f}", f"{m.f(0.5):.4f}"])


def parse_thresholds(text) -> list[float]:
    values = sorted({round(float(v), 4) for v in text.split(",") if v.strip()})
    if not values or not all(0 < v <= 1 for v in values):
        raise argparse.ArgumentTypeError("thresholds must be comma-separated numbers in (0, 1]")
    return values


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pairs", default=DEFAULT_PAIRS, help="labelled pairs CSV")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--thresholds", type=parse_thresholds, default=DEFAULT_THRESHOLDS,
                        help="comma-separated, e.g. 0.7,0.75,0.8")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD,
                        help="threshold for the per-category table and the error list")
    parser.add_argument("--errors", action="store_true", help="list misclassified pairs")
    parser.add_argument("--report", help="also write the report to this Markdown file")
    parser.add_argument("--csv", help="also write the threshold sweep to this CSV file")
    args = parser.parse_args(argv)

    try:
        pairs = load_pairs(args.pairs)
    except (OSError, ValueError) as e:
        print(f"Could not read pairs: {e}", file=sys.stderr)
        return 2
    errors, warnings = check_pairs(pairs)
    if errors:
        print("Dataset errors, fix them first:\n  " + "\n  ".join(errors), file=sys.stderr)
        return 2

    # Same loader the service uses, so scores match what the API computes.
    score_pairs(pairs, _load_sentence_transformer(args.model))

    report = "\n".join(build_report(pairs, args.thresholds, args.threshold, args.model, warnings, args.errors))
    print(report)
    if args.report:
        Path(args.report).write_text(report + "\n", encoding="utf-8")
    if args.csv:
        write_sweep_csv(args.csv, pairs, args.thresholds)
    return 0


if __name__ == "__main__":
    sys.exit(main())
