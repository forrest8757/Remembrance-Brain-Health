# T7 Phonemic (Letter) Fluency

**Source:** NACC UDSv4 C2T pp. 48–52 · build prompt [docs/build-prompts.md §T7](../../../../../docs/build-prompts.md) · Domains EXE, LANG · ~4 min.

> **Wording:** instructions, examples and prompts are Remembrance-original (DEVIATIONS L-1, owner decision 2026-10-01); the task, timing and scoring rules follow the build doc.

| Piece | Where |
|---|---|
| Spec (scripts, prompts, reminders) | [`spec.ts`](./spec.ts) |
| Forms (A F+L, B S+W, C A+H; all `equated: false`) | [`lib/forms/src/tests/phonemic-fluency.ts`](../../../../forms/src/tests/phonemic-fluency.ts) |
| Scorer, detectors | [`lib/scoring/src/tests/phonemic-fluency.ts`](../../../../scoring/src/tests/phonemic-fluency.ts) |
| Rule tables (places, numbers, homophones, irregular forms…) | [`lib/scoring/src/lexicons/phonemic-rules.ts`](../../../../scoring/src/lexicons/phonemic-rules.ts) |
| Dictionary + first names (generated from `/usr/share/dict`) | [`lib/scoring/scripts/build-word-lists.mjs`](../../../../scoring/scripts/build-word-lists.mjs) |
| Scoring tests (every example in the rules) | [`phonemic-fluency.test.ts`](../../../../scoring/src/tests/phonemic-fluency.test.ts) |
| Engine tests (simulated call) | [`lib/engine/src/phonemic-fluency.test.ts`](../../../../engine/src/phonemic-fluency.test.ts) |
| DOM Firewall tests | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statechart | [`docs/statecharts/phonemic-fluency.svg`](../../../../../docs/statecharts/phonemic-fluency.svg) |
| Web route | `/assess/phonemic-fluency` |

## State list (restated from the spec)

| # | Step | Zone | What happens |
|---|---|---|---|
| 1 | `intro` | protocol | The rules with T examples (table, tiny, tomorrow; not Tom, Texas, twenty; not talks/talked, taller/tallest). |
| 2 | `firstGo` | protocol | "Your first letter is F, as in fox. Ready? Go." (the clarifying example is always given) |
| 3 | `first` | protocol | Exactly 60 s, then "Stop." The letter is shown large (T7-2). Prompts below. |
| 4 | `secondGo` | protocol | "Now a new letter. Your next letter is L, as in lamp. Ready? Go." |
| 5 | `second` | protocol | As step 3 for the second letter. |

**Prompts per trial (all logged):** 15-s pause → "Keep going." (once), a later 15-s pause → "Can you think of any more words that start with F?" (once); 3 wrong-letter words in a row → "Remember, the letter is F." (once); 3 violations of the same rule in a row → that rule's reminder (names/places, numbers, word endings; once each).

## Scoring rules (restated; rule ids in brackets)

- **Correct** [R-OK]: starts with the letter (by spelling), is in a dictionary, isn't a proper noun of a person/place or a number, isn't repeated.
  - Benefit of the doubt, flagged: names/places that are everyday words ("frank") [R-OK-AMBIGUOUS-PROPER]; "four" alone could be "for"/"fore" [R-OK-AMBIGUOUS-NUMBER]; a homophone spelled with the letter ("phase" → "faze") [R-OK-HOMOPHONE-SPELLING]; a variant where one word has two meanings ("felt"/"feeling") [R-OK-AMBIGUOUS-VARIANT].
  - Also correct: contractions; two-word terms with one meaning said as one unit ("ferris wheel") [R-OK-COMPOUND]; days, months, brands [R-OK-ALLOWED-PROPER]; a repeat whose context shows another meaning ("felt … fabric, felt") [R-OK-CONTEXT].
- **Repetitions**: verbatim [R-REP-VERBATIM]; homophones ("flue"/"flew") [R-REP-HOMOPHONE]; a repeated violation is a repetition [R-REP-VIOLATION].
- **Violations**: wrong first letter, including the same sound ("phone" for F) [R-VIO-LETTER]; names of people [R-VIO-NAME] or places [R-VIO-PLACE]; numbers, including "four" beside other numbers [R-VIO-NUMBER]; plural/tense/comparative of an earlier response [R-VIO-VARIANT] (other shared roots like "bakery" are credited).
- **Self-corrected** violations and repetitions aren't errors (a marker — "no", "I mean", "sorry", "actually", "wait" — retracts the response before it).
- Not in the dictionary → **unverified** [R-UNVERIFIED]: scored 0 and sent to review, never auto-violated (ASR rarely produces non-words, so an unknown word is more often a modern word or a mishearing).
- Speech at or after 60.0 s isn't scored [R-LATE].
- **Fields:** Q10a–c (first letter: correct, repetitions, violations), Q10d–f (second), Q10g–i totals. Not completed → reason code in correct, the rest blank (second letter: totals blank too).
- **Derived:** words per 15-s bin, phonemic clusters (same first two letters, rhyme, homophone) and switches, first-word latency, mean gap, unverified count.

## Ambiguities and how they were resolved

| Spec text | Problem | Resolution |
|---|---|---|
| Which 15-s prompt? `⟦Lock…⟧` | Two phrasings offered. | The doc's suggested fixed sequence: "Keep going." first, then "What other words…" (once each). |
| Show the letter on screen? `⟦DECISION⟧` | Doc recommends yes. | Shown as a large glyph while listening (T7-2). |
| Rule reminders: "pre-render one reminder clip per rule" | No wording given. | Authored, one per rule (T7-3, approved). |
| Where the clarifying example goes | "Additional" example, always included. | In the go line, before "Ready? Go." (T7-5). |
| "Is in a dictionary" | Which dictionary? | Webster's 2nd (1934, public domain) for the forms' letters + a modern-word supplement; unknown → review. |
| Compounds | When are two words one compound? | Webster's two-word terms, merged only when said with < 300 ms between the words (a list has pauses). |
| Variants: "-er" | Agentive ("farmer") vs comparative. | Comparatives only for a list of adjectives. |
| Connectives starting with the letter ("and" under A, "well" under W) | Filler or answer? | Treated as connectives, not scored (T7-6). |

## Known gaps

- **Productivity matching** of letter pairs B/C (±10% Zipf counts) needs word frequencies we don't have; `equated: false` (T7-4). **Mean word frequency** (a derived metric) is missing for the same reason.
- **Name/place detection** uses ~440 first names and a hand list of places; surnames and less common places pass as words.
- **LLM adjudication** for unverified words isn't built; they go to review.
- **Licensing:** the C2T phonemic fluency script needs the author's permission (build doc §3b), so none of its wording is used (DEVIATIONS L-1).
