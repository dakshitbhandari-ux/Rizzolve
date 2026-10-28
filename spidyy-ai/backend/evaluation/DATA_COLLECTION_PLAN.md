# Plan: a labelled question-pair set from real student questions

Status: **plan only, nothing is collected yet.** No code in this repository logs question text today
(`/api/ask` logs only group ids and scores).

## 1. Why, and what "done" looks like

The current set (`question_pairs.csv`) was written and labelled by the same author who wrote the intent guard,
so its results are probably optimistic (see `README.md`, Limitations). This plan replaces it as the main
test set with pairs built from questions students actually asked, labelled independently by two people.

It should answer three questions, decided **before** we look at the test results:

| Question | Decided by |
|----------|-----------|
| Does the intent guard beat plain cosine with a higher threshold? | Paired comparison of the two settings on the same test pairs (McNemar's test), each at its dev-chosen threshold |
| Which threshold should the service use? | Best F0.5 on dev only |
| Is grouping precise enough to ever reuse answers? | Lower 95% bound of test precision ≥ a target that you and your supervisor set now (suggestion: 0.95). If it is lower, answers are not reused |

**Done means:**
- A test split with about 250 duplicate pairs (label 1) and enough non-duplicate pairs, labelled by two
  annotators, with their agreement reported (Cohen's kappa).
- No question appears in both dev and test.
- Results rerun with `evaluate_similarity.py`, extended for the new columns (section 6).

**Sample size.** To estimate recall within about ±0.05 (95% Wilson interval) at recall ≈ 0.8, the test split
needs about 250 true duplicate pairs. For precision ≈ 0.85 within ±0.05, it needs about 200 pairs that the
model merges. Real-traffic yield is unknown, so section 4 starts with a pilot that measures it.

## 2. Privacy and ethics safeguards

Student questions are personal data once they can be linked to a person, and they sometimes contain personal
details ("my roll number is…", health or exam-stress disclosures). Rules:

1. **Approval first.** Discuss the plan with your faculty supervisor and ask whether it needs
   Institutional Ethics Committee review. Check what the Digital Personal Data Protection Act, 2023 and its
   current rules require (notice, consent, purpose limitation, erasure). This plan is not legal advice.
2. **Adults only.** Collect only from students aged 18 or over. Children's data needs verifiable parental
   consent under the DPDP Act, so leave school-level users out of collection.
3. **Opt-in with a notice.** Participants get a short notice before they take part, covering:
   - what is stored and why,
   - who can see it,
   - how long it is kept,
   - that taking part is voluntary and does not affect grades,
   - how to withdraw.
4. **Store as little as possible.**
   - **Keep:** question text, date (day only, no time), and a random session id.
   - **Never keep:** name, email, roll number, IP address, device data or the Gemini answer.
   - The session id is generated per session in the browser and never linked to an account.
   - Uvicorn's access log records client IPs but not question text. Keep it separate from the question log,
     and don't keep it longer than you normally would.
5. **Separate, restricted storage.**
   - Write the raw question log outside the repository, in a path covered by `.gitignore`.
   - Keep it on university-managed storage with access limited to the named study team.
   - Never put it in personal cloud accounts or in prompts to external AI tools.
6. **Scrub, then review by hand.**
   - Automatic redaction: emails, phone numbers, URLs and the university's roll-number format.
   - Don't blank out all numbers: "What is 12 × 8?" needs them.
   - Then a person reads every question that will be used and drops any that contain personal or sensitive
     content. Only reviewed questions go into the pair set.
7. **Time limits.** Delete the raw log once the reviewed set is built, within a fixed deadline that you agree
   with your supervisor (suggestion: 90 days). The final pair set contains only reviewed, de-identified
   questions. Keep it private unless approval covers publishing it.
8. **Withdrawal.** Show participants their session id, so a session's questions can be deleted on request
   before the deadline. Without it, entries can't be linked back to a person, and the notice must say that
   withdrawal is only possible during the session.

## 3. How questions are collected

**Option A (recommended to start): supervised collection sessions.**
- Run a separate study instance of Spidyy AI with question logging switched on. The normal instance keeps
  logging off.
- Recruit volunteers, for example from a class or club. They sign the consent form and then use the app for
  their own study questions for 30–45 minutes.
- **Advantages:** consent is clear, only adults take part, and nothing changes for other users.
- **Disadvantage:** questions asked in a session are less natural than everyday use.

**Option B (later): opt-in logging in the normal app.**
- The frontend shows the notice and an "Allow my questions to be used for research" switch, off by default.
- **Advantage:** more natural questions.
- **Disadvantages:** it needs frontend work (you asked not to change the frontend yet) and its own approval.

Code needed for either option (not written yet, see section 6):
- A `QUESTION_LOG_ENABLED` flag, off by default.
- A background writer that appends one JSON line per answered question, like `record_question_group`. It
  must never affect the answer.

**Session ids:** they need a small frontend change, because the browser must generate and send them. Without
them the plan still works: you lose rephrasing pairs (section 4, source 2) and the ability to delete one
session's questions.

## 4. Turning questions into pairs

Random pairs are almost all unrelated, so they are useless for measuring duplicates. Pairs proposed only by
the model are biased the other way: they hide the duplicates the model misses. So we use three sources and
record where each pair came from.

| Source | How | Why |
|--------|-----|-----|
| 1. Score bands | Embed all reviewed questions. For each question, take its 5 nearest neighbours. Sample a fixed number of pairs from each cosine band: <0.5, 0.5–0.6, 0.6–0.7, 0.7–0.8, 0.8–0.9, ≥0.9 | Covers both sides of every threshold, including low-scoring duplicates such as acronyms (SQL 0.53) |
| 2. Rephrasings | Consecutive questions in the same session where the student asked again in other words, found before looking at scores | Real paraphrases picked without the model, which gives a fairer estimate of recall |
| 3. Random | A small random sample of pairs | Shows how rare duplicates are overall |

**Other rules:**
- Count exact duplicates (after normalisation) and report how often they occur, but don't fill the set with
  them: the exact-text check already handles them.
- Keep the band and the sampling rate of every pair. Band sampling over-represents high scores, so the
  evaluation must report results per band and a weighted overall estimate. Each pair counts as
  1 ÷ (its sampling rate).
- **Dev/test split by question cluster, not by pair.**
  - Link pairs that share a question, and send each connected group wholly to dev or wholly to test, so no
    question appears in both splits.
  - `check_pairs()` already warns about overlap.
  - Suggested sizes: about 1/3 dev, 2/3 test.
- Expected size: about 1,000 pairs (roughly 300 dev and 700 test). The number of student questions this
  needs is unknown. A guess is 2,000–5,000, and the pilot (section 5) will show the real yield.

## 5. Annotation with two annotators

**Who:**
- Two annotators who did **not** build the similarity service or the intent guard.
- They should know the subjects well enough, for example senior students or teaching assistants from CS and
  the sciences.
- A third person settles disagreements.

**Blinding:**
- Annotators don't see cosine scores, bands, sources or each other's labels.
- Pair order and A/B order are shuffled separately for each annotator.

**Labels:** `1` (same group), `0` (different), `?` (can't decide), plus an optional note.
The rule and examples are in `ANNOTATION_GUIDELINE.md`.

**Steps:**
1. **Training (about 30 minutes).** Annotators read the guideline and label 20 practice pairs taken from
   `question_pairs.csv`, then discuss them.
2. **Pilot (about 60 real pairs).** Both annotators label the same pairs independently.
   - Compute Cohen's kappa.
   - Discuss every disagreement and update the guideline where it was unclear.
   - Pilot pairs go to **dev**, never to test.
   - A working target is kappa ≥ 0.7. If it is below about 0.6, the rule is unclear: revise it and run
     another pilot before going on.
3. **Main round.** Both annotators label **all** pairs independently, in sessions of at most an hour to
   avoid fatigue. At about 10–15 s per pair, 1,000 pairs take about 3–4 hours per annotator.
4. **Adjudication.**
   - Where both annotators agree, that is the final label.
   - Disagreements go to the third person. Keep both original labels.
   - Pairs that either annotator marked `?` are left out of the main metrics and reported separately.
5. **Report:**
   - Kappa on the main round.
   - The share of pairs adjudicated.
   - Results against the final labels.
   - The model's agreement with each annotator separately. This gives an idea of the best score possible,
     since even two people don't agree 100%.

**Tools:** a spreadsheet on university-managed storage is enough. Use one sheet per annotator, exported to
CSV. A small script then computes kappa and merges the labels.

## 6. Code still to write (after approval)

| File | Purpose |
|------|---------|
| `backend/question_log.py` + `main.py` flag | Opt-in JSONL logging of answered questions (`QUESTION_LOG_ENABLED`, `QUESTION_LOG_PATH`), in a background task that never affects answers |
| `evaluation/scrub_questions.py` | Redaction (emails, phones, URLs, roll numbers) and a review sheet for the manual check |
| `evaluation/build_candidate_pairs.py` | Nearest neighbours, score-band sampling, rephrasing and random pairs, cluster-based dev/test split, sampling rates |
| `evaluation/annotation_sheets.py` | Blinded, shuffled sheets for each annotator, and a merge step that computes kappa and lists disagreements |
| `evaluate_similarity.py` (extend) | Read `annotator_1`, `annotator_2`, `final_label`, `source`, `band`, `weight`; report per band and weighted; McNemar's test between settings |

The new CSV keeps the current columns and adds `source, band, weight, annotator_1, annotator_2, final_label`.
`label` becomes the final label.

The current `question_pairs.csv` stays as a hand-made **challenge set** for regression tests, not as the main
measure.

## 7. Timeline (rough)

| Week | Work |
|------|------|
| 1 | Supervisor/ethics discussion, consent notice, logging and scrubbing code |
| 2 | Collection sessions (Option A) and the pilot candidate pairs |
| 3 | Annotator training, pilot, guideline revision |
| 4–5 | Main collection, manual review, building the pairs |
| 6 | Main annotation round, adjudication, kappa |
| 7 | Evaluation, decision on guard vs threshold, write-up |

## 8. Risks

| Risk | Mitigation |
|------|-----------|
| Too few volunteers or duplicates | The pilot measures the yield early. Run more sessions or combine with Option B |
| Personal data slips through | Manual review of every used question; raw log deleted on schedule |
| The model biases which pairs exist | Rephrasing and random sources are chosen without the model; per-band reporting |
| Annotators drift or tire | Short sessions; recheck a few pilot pairs halfway through |
| Exam-season questions differ from the rest of the term | Record collection dates; collect over more than one period if possible |
| Pairwise results understate wrong merges in a large store | Later: replay real question order through the service and have people check a sample of its actual merges |

## 9. Decisions for you

1. Who supervises this, and does it need ethics committee review?
2. Option A, Option B, or A then B?
3. Who are the two annotators and the third person?
4. Raw-log deletion deadline, and the precision target for reusing answers.
5. Is a small frontend change acceptable later, for session ids and the opt-in switch?
