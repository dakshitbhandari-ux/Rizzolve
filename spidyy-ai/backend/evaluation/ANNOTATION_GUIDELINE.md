# Annotation guideline: do these two questions belong together?

You will see two student questions at a time. Decide whether they should be treated as **the same question**.
Work on your own: don't discuss pairs with the other annotator until the round is finished.

## The rule

> **Would one good answer fully and appropriately answer both questions?**
>
> Yes → **1**. No → **0**. You genuinely cannot tell → **?** (and add a short note).

"Good answer" means the answer a careful teacher would give to that question, at the level the question asks
for. Judge the meaning, not the wording. Spelling mistakes, grammar, politeness and mixed languages
(e.g. "ML kya hai?") don't matter.

## Decide step by step

1. **Same thing asked about?** Same concept, object, person, event and numbers? If not → **0**.
   - "capital of Australia" vs "capital of Austria" → 0
   - "Newton's first law" vs "Newton's second law" → 0
   - "Solve x + 5 = 12" vs "Solve x + 7 = 12" → 0
   - "What is SQL?" vs "What is Structured Query Language?" → same thing, go on
2. **Same kind of answer needed?** A definition, a list of types, an example, how it works, causes, effects,
   advantages, history, a proof, code, a calculation? If one question needs a different kind → **0**.
   - "Define inheritance" vs "Give an example of inheritance" → 0
   - "What is inflation?" vs "What are the causes of inflation?" → 0
   - "What is binary search?" vs "Write code for binary search" → 0
3. **Same scope?** If one question asks for more than the other, an answer to the narrower one is incomplete → **0**.
   - "What is ML?" vs "What is ML and what are its types?" → 0
4. Otherwise → **1**.
   - "What is the speed of light?" vs "How fast does light travel?" → 1
   - "Why is the sky blue?" vs "What makes the sky look blue?" → 1
   - "How many continents are there?" vs "What is the number of continents on Earth?" → 1

## Common cases

| Situation | Label |
|-----------|------:|
| Only wording differs ("Define X" / "What is X?" / "Explain X" / "What do you mean by X?") | 1 |
| "in simple words", "briefly", "please" added | 1 |
| Acronym vs full name, or a common alternative name | 1 |
| Explicitly different level ("for class 6" vs "for an engineering exam") | 0 |
| Different output asked for: code, proof, diagram, worked numerical example, MCQs | 0 |
| "What is X?" vs "How does X work?" | 0 |
| "Advantages of X" vs "Disadvantages of X" | 0 |
| "Advantages of X" vs "Benefits of X" | 1 |
| Neighbouring concepts ("What is TCP?" / "What is UDP?") | 0 |
| Same question, different numbers or values | 0 |
| A question you can't understand, or that could mean two very different things | ? |

Use **?** rarely. It is for pairs where you truly can't decide, not for pairs that need thought.
Always add a note saying why.

## Privacy

If a question contains personal information (a name, phone number, roll number, email, health or personal
problems):
- **don't label it**,
- write `PRIVACY` in the note column,
- move on.

The study team will remove it. Don't copy question text anywhere outside the annotation sheet.

## Practical

- Columns: `pair_id, question_1, question_2, label, note`. Enter only `1`, `0` or `?` as the label.
- The order of the two questions means nothing.
- Work in sessions of at most an hour. Fatigue causes more errors than hard pairs.
- You won't see any model scores. That is deliberate.
