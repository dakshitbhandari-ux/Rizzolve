# Question grouping evaluation

Model `sentence-transformers/all-MiniLM-L6-v2`, 194 labelled pairs. Label 1 = one good answer to A fully answers B (see evaluation/README.md).

## Dataset

| Split | Category | Pairs | Label 1 | Label 0 |
|---|---|---:|---:|---:|
| dev | different_entity | 5 | 0 | 5 |
| dev | different_intent | 14 | 0 | 14 |
| dev | exact_variant | 2 | 2 | 0 |
| dev | paraphrase | 20 | 20 | 0 |
| dev | related_topic | 4 | 0 | 4 |
| dev | unrelated | 5 | 0 | 5 |
| test | different_entity | 15 | 0 | 15 |
| test | different_intent | 43 | 0 | 43 |
| test | exact_variant | 4 | 4 | 0 |
| test | paraphrase | 55 | 55 | 0 |
| test | related_topic | 15 | 0 | 15 |
| test | unrelated | 12 | 0 | 12 |

## Cosine scores by category (all splits)

| Category | Label | Min | Median | Max | Intent guard would block |
|---|---:|---:|---:|---:|---:|
| different_entity | 0 | 0.51 | 0.73 | 0.94 | 10/20 |
| different_intent | 0 | 0.41 | 0.77 | 0.95 | 37/57 |
| exact_variant | 1 | 1.00 | 1.00 | 1.00 | 0/6 |
| paraphrase | 1 | 0.53 | 0.90 | 0.97 | 11/75 |
| related_topic | 0 | 0.31 | 0.58 | 0.77 | 0/19 |
| unrelated | 0 | -0.02 | 0.07 | 0.23 | 5/17 |

## Threshold sweep: dev, cosine only

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 | F0.5 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.50 | 22 | 21 | 0 | 7 | 0.51 | 1.00 | 0.68 | 0.57 |
| 0.55 | 22 | 21 | 0 | 7 | 0.51 | 1.00 | 0.68 | 0.57 |
| 0.60 | 22 | 19 | 0 | 9 | 0.54 | 1.00 | 0.70 | 0.59 |
| 0.65 | 22 | 18 | 0 | 10 | 0.55 | 1.00 | 0.71 | 0.60 |
| 0.70 | 22 | 13 | 0 | 15 | 0.63 | 1.00 | 0.77 | 0.68 |
| 0.75 | 21 | 13 | 1 | 15 | 0.62 | 0.95 | 0.75 | 0.66 |
| 0.80 | 21 | 10 | 1 | 18 | 0.68 | 0.95 | 0.79 | 0.72 |
| 0.85 | 17 | 3 | 5 | 25 | 0.85 | 0.77 | 0.81 | 0.83 |
| 0.90 | 11 | 1 | 11 | 27 | 0.92 | 0.50 | 0.65 | 0.79 |
| 0.95 | 5 | 0 | 17 | 28 | 1.00 | 0.23 | 0.37 | 0.60 |

## Threshold sweep: dev, cosine + intent guard

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 | F0.5 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.50 | 18 | 6 | 4 | 22 | 0.75 | 0.82 | 0.78 | 0.76 |
| 0.55 | 18 | 6 | 4 | 22 | 0.75 | 0.82 | 0.78 | 0.76 |
| 0.60 | 18 | 5 | 4 | 23 | 0.78 | 0.82 | 0.80 | 0.79 |
| 0.65 | 18 | 5 | 4 | 23 | 0.78 | 0.82 | 0.80 | 0.79 |
| 0.70 | 18 | 1 | 4 | 27 | 0.95 | 0.82 | 0.88 | 0.92 |
| 0.75 | 17 | 1 | 5 | 27 | 0.94 | 0.77 | 0.85 | 0.90 |
| 0.80 | 17 | 1 | 5 | 27 | 0.94 | 0.77 | 0.85 | 0.90 |
| 0.85 | 14 | 0 | 8 | 28 | 1.00 | 0.64 | 0.78 | 0.90 |
| 0.90 | 9 | 0 | 13 | 28 | 1.00 | 0.41 | 0.58 | 0.78 |
| 0.95 | 3 | 0 | 19 | 28 | 1.00 | 0.14 | 0.24 | 0.44 |

## Threshold sweep: test, cosine only

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 | F0.5 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.50 | 59 | 66 | 0 | 19 | 0.47 | 1.00 | 0.64 | 0.53 |
| 0.55 | 58 | 63 | 1 | 22 | 0.48 | 0.98 | 0.64 | 0.53 |
| 0.60 | 58 | 58 | 1 | 27 | 0.50 | 0.98 | 0.66 | 0.55 |
| 0.65 | 58 | 52 | 1 | 33 | 0.53 | 0.98 | 0.69 | 0.58 |
| 0.70 | 57 | 45 | 2 | 40 | 0.56 | 0.97 | 0.71 | 0.61 |
| 0.75 | 54 | 29 | 5 | 56 | 0.65 | 0.92 | 0.76 | 0.69 |
| 0.80 | 53 | 19 | 6 | 66 | 0.74 | 0.90 | 0.81 | 0.76 |
| 0.85 | 46 | 9 | 13 | 76 | 0.84 | 0.78 | 0.81 | 0.82 |
| 0.90 | 33 | 2 | 26 | 83 | 0.94 | 0.56 | 0.70 | 0.83 |
| 0.95 | 10 | 0 | 49 | 85 | 1.00 | 0.17 | 0.29 | 0.51 |

## Threshold sweep: test, cosine + intent guard

| Threshold | TP | FP | FN | TN | Precision | Recall | F1 | F0.5 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.50 | 52 | 34 | 7 | 51 | 0.60 | 0.88 | 0.72 | 0.65 |
| 0.55 | 51 | 32 | 8 | 53 | 0.61 | 0.86 | 0.72 | 0.65 |
| 0.60 | 51 | 28 | 8 | 57 | 0.65 | 0.86 | 0.74 | 0.68 |
| 0.65 | 51 | 23 | 8 | 62 | 0.69 | 0.86 | 0.77 | 0.72 |
| 0.70 | 50 | 20 | 9 | 65 | 0.71 | 0.85 | 0.78 | 0.74 |
| 0.75 | 47 | 11 | 12 | 74 | 0.81 | 0.80 | 0.80 | 0.81 |
| 0.80 | 46 | 8 | 13 | 77 | 0.85 | 0.78 | 0.81 | 0.84 |
| 0.85 | 40 | 3 | 19 | 82 | 0.93 | 0.68 | 0.78 | 0.87 |
| 0.90 | 29 | 0 | 30 | 85 | 1.00 | 0.49 | 0.66 | 0.83 |
| 0.95 | 10 | 0 | 49 | 85 | 1.00 | 0.17 | 0.29 | 0.51 |

## Threshold chosen on dev (best F0.5), measured on test

Precision and recall on test with 95% Wilson intervals.

| Method | Threshold | Dev F0.5 | Test precision | Test recall | Test F1 |
|---|---:|---:|---|---|---:|
| cosine only (dev-selected) | 0.85 | 0.83 | 0.84 [0.72, 0.91] (46/55) | 0.78 [0.66, 0.87] (46/59) | 0.81 |
| cosine + intent guard (dev-selected) | 0.70 | 0.92 | 0.71 [0.60, 0.81] (50/70) | 0.85 [0.73, 0.92] (50/59) | 0.78 |
| cosine + intent guard (configured) | 0.80 | 0.90 | 0.85 [0.73, 0.92] (46/54) | 0.78 [0.66, 0.87] (46/59) | 0.81 |

## Test accuracy by category at threshold 0.80

| Category | Pairs | Correct, cosine only | Correct, cosine + intent guard |
|---|---:|---:|---:|
| different_entity | 15 | 9 | 14 |
| different_intent | 43 | 30 | 36 |
| exact_variant | 4 | 4 | 4 |
| paraphrase | 55 | 49 | 42 |
| related_topic | 15 | 15 | 15 |
| unrelated | 12 | 12 | 12 |

## Errors at threshold 0.80, cosine + intent guard

FP = merged but should be separate; FN = should be merged but kept separate.

| ID | Error | Category | Score | Guard | Question A | Question B |
|---|---|---|---:|---|---|---|
| d008 | FN | paraphrase | 0.75 | same | What is inheritance in OOP? | Define inheritance in object oriented programming |
| d025 | FN | paraphrase | 0.83 | blocks | What is the speed of light? | How fast does light travel? |
| d029 | FN | paraphrase | 0.97 | blocks | Who discovered penicillin? | Who was the discoverer of penicillin? |
| d032 | FN | paraphrase | 0.87 | blocks | How does a refrigerator work? | Explain the working principle of a refrigerator |
| d037 | FP | different_intent | 0.84 | same | What is the French Revolution? | What were the causes of the French Revolution? |
| d048 | FN | paraphrase | 0.97 | blocks | What is the difference between TCP and UDP? | How is TCP different from UDP? |
| t003 | FN | paraphrase | 0.77 | same | What is the chemical formula of water? | Write the formula for water |
| t004 | FN | paraphrase | 0.93 | blocks | Who invented the telephone? | Who is credited with inventing the telephone? |
| t007 | FN | paraphrase | 0.73 | same | What is the Pythagorean theorem? | State Pythagoras theorem |
| t015 | FN | paraphrase | 0.89 | blocks | What causes rainbows? | Why do rainbows form? |
| t026 | FN | paraphrase | 0.90 | blocks | What is the boiling point of water in Fahrenheit? | At how many degrees Fahrenheit does water boil? |
| t036 | FN | paraphrase | 0.90 | blocks | Why is the sky blue? | What makes the sky look blue? |
| t037 | FN | paraphrase | 0.85 | blocks | How do I find the area of a circle? | What is the formula for the area of a circle? |
| t039 | FN | paraphrase | 0.53 | same | What is SQL? | What is Structured Query Language? |
| t045 | FN | paraphrase | 0.91 | blocks | How many continents are there? | What is the number of continents on Earth? |
| t046 | FN | paraphrase | 0.74 | same | What is an object in OOP? | Define object in object oriented programming |
| t047 | FN | paraphrase | 0.73 | same | What is a queue? | Explain the queue data structure |
| t049 | FN | paraphrase | 0.91 | blocks | What is the speed of sound in air? | How fast does sound travel in air? |
| t051 | FN | paraphrase | 0.65 | same | What is DNA? | What is deoxyribonucleic acid? |
| t069 | FP | different_intent | 0.81 | same | What is climate change? | What are the effects of climate change? |
| t072 | FP | different_intent | 0.84 | same | What is an ecosystem? | What are the components of an ecosystem? |
| t078 | FP | different_intent | 0.81 | same | What is the Pythagorean theorem? | Prove the Pythagorean theorem |
| t083 | FP | different_intent | 0.80 | same | What is inflation? | What are the causes of inflation? |
| t088 | FP | different_intent | 0.88 | same | What is a file system? | What are the functions of a file system? |
| t092 | FP | different_intent | 0.85 | same | What is the Industrial Revolution? | When did the Industrial Revolution start? |
| t093 | FP | different_intent | 0.83 | same | What was World War II? | What were the consequences of World War II? |
| t128 | FP | different_entity | 0.86 | same | When did World War I start? | When did World War II start? |

