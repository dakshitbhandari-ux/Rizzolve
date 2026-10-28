# Question grouping evaluation

Measures how well `similarity.py` decides whether two questions belong in the same group.

| File | What it is |
|------|------------|
| `question_pairs.csv` | 194 labelled question pairs (dev 50, test 144) |
| `evaluate_similarity.py` | Precision / recall / F1 / F0.5 per threshold, with and without the intent guard |
| `results.md`, `results_sweep.csv` | Output of the last run (regenerate them after any change) |
| `DATA_COLLECTION_PLAN.md` | Plan for a real-question test set: privacy safeguards, sampling, two annotators |
| `ANNOTATION_GUIDELINE.md` | Instructions for annotators |

```powershell
cd backend
python evaluation/evaluate_similarity.py --errors --report evaluation/results.md --csv evaluation/results_sweep.csv
```

Options: `--thresholds 0.7,0.75,0.8`, `--threshold 0.85` (used for the per-category table and the error list),
`--pairs other.csv`, `--model ...`. `tests/test_evaluation.py` checks that the script's decision is the same as
`SimilarityService.find_match()`, so the numbers describe the real service.

## Labelling rule

**Label 1 (same group)** only if one good answer would fully and appropriately answer both questions:
same information need, same scope. Otherwise **label 0**. (Same rule as `ANNOTATION_GUIDELINE.md`.) In particular:

- A different focus is 0 even on the same topic: types, examples, applications, advantages, causes, effects,
  history, "how does it work", time complexity, a proof, or code.
- A different entity or number is 0: capital of France vs Germany, Newton's first vs second law, 12×8 vs 12×9.
- Wording, politeness, "in simple words", an acronym vs its full name: still 1.
- Pairs that two careful people could label differently were left out (for example "What is photosynthesis?" vs
  "Explain the process of photosynthesis").

## Columns and categories

`id, split, category, label, question_a, question_b, notes`

| Category | Label | Meaning |
|----------|------:|---------|
| `exact_variant` | 1 | Same text apart from case, spaces, punctuation |
| `paraphrase` | 1 | Different wording, same information need |
| `different_intent` | 0 | Same topic, different focus |
| `different_entity` | 0 | Same question shape, different entity or number |
| `related_topic` | 0 | Neighbouring concepts (TCP/UDP, mitosis/meiosis) |
| `unrelated` | 0 | Different subjects |

The script refuses to run on duplicate ids, a repeated pair (in either order), identical questions labelled 0,
or a split without both labels. It warns when a question appears in both dev and test.

## Protocol

1. Choose the threshold on **dev** (the script uses the best F0.5, which weighs precision twice as much as
   recall, because a wrong merge is worse than a missed duplicate).
2. Read **test** once at that threshold. Do not change the guard or threshold because of test errors and then
   report the same test set: build a new test set first.

## Results (2026-10-27, all-MiniLM-L6-v2)

Test split, 95% Wilson intervals:

| Method | Threshold | Precision | Recall |
|--------|---------:|-----------|--------|
| Cosine + intent guard (current default) | 0.80 | 0.85 [0.73, 0.92] | 0.78 [0.66, 0.87] |
| Cosine only | 0.85 | 0.84 [0.72, 0.91] | 0.78 [0.66, 0.87] |
| Cosine + intent guard, threshold chosen on dev | 0.70 | 0.71 [0.60, 0.81] | 0.85 [0.73, 0.92] |
| Cosine only | 0.80 | 0.74 | 0.90 |

What this shows:

- **The intent guard did not beat a higher threshold.** At 0.80 it removes most same-topic false merges that
  cosine alone makes at 0.80 (test: different_entity 14/15 correct vs 9/15, different_intent 36/43 vs 30/43),
  but plain cosine at 0.85 reaches the same precision and recall.
- **The dev split is too small and biased to choose the threshold.** It holds the examples the guard was
  designed from, so dev scores look better than test (guard at 0.70: dev F0.5 0.92, test precision 0.71).
- **The guard splits real paraphrases** because it treats question words as intents ("How fast does light
  travel?" vs "What is the speed of light?"; "Why is the sky blue?" vs "What makes the sky look blue?";
  "How many continents…" vs "the number of continents…") and does not handle word forms
  ("discovered" vs "discoverer"). 11 of the 18 false negatives at 0.80 (dev + test) are guard blocks.
- **The guard misses intents that are not in its keyword list**: causes, effects, consequences, components,
  functions, proofs, "when did … start", and Roman numerals (World War I vs II). These are the false merges that remain.
- **Cosine misses acronyms**: "What is SQL?" vs "What is Structured Query Language?" scores 0.53, DNA 0.65.

### What 0.85 precision and 0.78 recall mean

At threshold 0.80 with the intent guard, on the 144 test pairs:
- **Precision 46/54 = 0.85:** of the pairs the service would merge, 46 should be merged and 8 should not.
  Those 8 are the costly errors, because a later phase could show one question's answer to the other.
- **Recall 46/59 = 0.78:** of the pairs that should be merged, 13 are kept apart. Those are cheap errors:
  just an extra group.
- The 4 exact-variant pairs are trivially correct. Without them, precision is 42/50 = 0.84 and recall is
  42/55 = 0.76.

### How the dataset was made, and dev/test overlap

Order of work:
1. 23 hand-picked calibration pairs were scored and used to choose the 0.80 threshold and design the intent
   guard. These pairs are now most of **dev** (d001–d022).
2. Dev and test were then written together by the same author, from the same question templates.
3. Test was evaluated with the threshold and guard already fixed. Its errors were then examined (the error
   list above), and nothing was tuned on them.

Overlap checks:
- **Same pairs or same questions:** none. `check_pairs` reports 0 errors and 0 warnings, and 0 of 248 test
  questions also appear in dev after normalisation.
- **Near-paraphrases across splits:** 6 of 248 test questions (2.4%) have a dev question with cosine ≥ 0.90,
  all on the same concepts (prime numbers ×2, recursion, photosynthesis ×3). Mild topic overlap.
- **Not independent:** same author, same templates, and the guard's keywords came from dev examples. This is
  the main reason the numbers are likely optimistic.

### Rejected change: acronym expansion (2026-10-27)

The known miss "What is inheritance in OOP?" / "Define inheritance in object oriented programming" (0.75) is
caused by the acronym. MiniLM tokenises "OOP" as `o` + `##op`. With the same form on both sides, the pair
scores 0.92–0.95. Other acronyms behave the same way (SQL 0.53, CPU 0.44, DNA 0.65).

Replacing 17 common acronyms with their full names before embedding gave these test results at 0.80 + guard:

| | Precision | Recall | F0.5 |
|---|---|---|---|
| Current | 0.852 (8 FP) | 0.780 (13 FN) | 0.837 |
| With expansion | 0.831 (10 FP) | 0.831 (10 FN) | 0.831 |

- **What went wrong:** expansion created wrong merges. "What is HTTP?" vs "What is HTTPS?" rose from
  0.64 to 0.89. "Class in OOP" vs "object in OOP" also merged, because the long shared phrase outweighs the
  one word that differs.
- **Decision:** not adopted. It trades cheap errors for costly ones, and lowers F0.5.
- **Protocol note:** this decision used test results. On dev alone (22 positives), expansion looked slightly
  better (recall 0.77 → 0.82, same precision), because dev is too small to contain the failure. The
  deviation favours keeping the current design, so no reported number is inflated.
- **Possible later fix, to be validated on new data:** expand acronyms and also treat different acronyms
  as different entities, like the number check does.

## Limitations

- **Who wrote it:** every pair was written and labelled by one author (an AI assistant), the same author who wrote
  the intent guard. Expect optimistic results. Real student questions from the app, labelled by two people
  (with agreement measured, e.g. Cohen's kappa), would be a much stronger test. `DATA_COLLECTION_PLAN.md`
  describes how to build one.
- **Class mix:** the negatives are mostly hard, same-topic pairs, and the positive/negative ratio was chosen
  by hand. Precision depends on that ratio, so it will differ on real traffic.
- **Pairs, not a full store:** each pair is scored against a single group. In the running service a question is
  compared with every group, so with many groups the chance of a wrong merge is higher than these pairwise
  numbers suggest.
- **Size:** 144 test pairs give intervals about ±0.1 wide; differences of a few points are noise.
- English only; school and engineering topics only.
