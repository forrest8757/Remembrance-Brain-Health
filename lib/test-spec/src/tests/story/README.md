# T2 Story Recall (immediate + delayed)

**Source:** NACC UDSv4 C2T pp. 19–23, 44–47 (structure only) · build prompt [docs/build-prompts.md §T2](../../../../../docs/build-prompts.md) · Domain MEM · ~3 min + ~2 min, ≈20 min apart.

> **No licensed content.** Craft Story 21, its scoring table and the C2T wording need permission (CLAUDE.md §8), so none of it is used or stored: the four stories, their rubrics and every line are Remembrance-original. Only the NACC story's word and syllable counts were measured, as matching targets.

| Piece | Where |
|---|---|
| Specs (immediate, delayed) | [`spec.ts`](./spec.ts) |
| Stories, rubrics, validator | [`lib/forms/src/tests/story.ts`](../../../../forms/src/tests/story.ts) |
| Scorer, judges | [`lib/scoring/src/tests/story-recall.ts`](../../../../scoring/src/tests/story-recall.ts) |
| Scoring tests (every 1-pt and 0-pt example of all 100 units) | [`story-recall.test.ts`](../../../../scoring/src/tests/story-recall.test.ts) |
| Engine tests | [`lib/engine/src/story.test.ts`](../../../../engine/src/story.test.ts) |
| DOM Firewall tests | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statecharts | [`docs/statecharts/story-immediate.svg`](../../../../../docs/statecharts/story-immediate.svg), [`story-delayed.svg`](../../../../../docs/statecharts/story-delayed.svg) |
| Web routes | `/assess/story-immediate`, `/assess/story-delayed`; in a session, the orchestrator places them ~20 min apart |

## State list

| Test | Step | Zone | What happens |
|---|---|---|---|
| Immediate | `ready` | chrome | "Ready to listen?" card. |
| | `intro` | protocol | "Now I'm going to tell you a short story… You can use my words or your own. Here's the story." |
| | `story` | protocol | The story as one continuous clip (~17.5 s). Never captioned, never repeated. **Interrupted here → invalid (97).** |
| | `recallPrompt` | protocol | "Now please tell me the story. Try to remember as much as you can." |
| | `recall` | protocol | Open until "I'm finished" or 20 s of silence (3-min cap). No prompts. Interrupted → the window reopens; both parts count. |
| | `later` | protocol | "I'll ask you about this story again a bit later, so try to keep it in mind." |
| Delayed | `intro` | protocol | "A little while ago, I told you a short story. Please tell me what you remember about it now." |
| | `recall` | protocol | As above. "What story?" / "I don't remember" / 10 s of nothing → "It was a story about a young boy/girl. Please tell it to me now." (once; cue needed = 1). A question or repeat request → only "Just tell me as much of the story as you can remember." |

## The stories

| Form | Story (child, activity, animals) | Words | Syllables | Narration |
|---|---|---|---|---|
| story.1 | Tommy flies kites; geese | 58 | 78 | 17.6 s |
| story.2 | Lily rides bikes; cats | 57 | 78 | 17.2 s |
| story.3 | Danny swims laps; swans | 56 | 78 | 17.9 s |
| story.4 | Rosie tosses horseshoes; goats | 56 | 78 | 17.7 s |

Targets (validator): 44 verbatim bits, 25 units (7 required-word), words within 56 ± 3 and syllables within 75 ± 5% of the reference story, names with ≥ 2 variants, every unit crediting the story's own word. Narrations are within 0.7 s of each other.

## Scoring rules

- **Exact words (/44, Q3a / Q8a):** a point per bit whose key word appears anywhere in the recall. Allowed: verb variations ("loves" for "loved"), plurals, a dropped possessive ("farmer" for "farmer's"). Names must be exact ("Tom" isn't "Tommy"). Repeated words ("he" ×2) are credited up to their count in the recall.
- **Ideas (/25, Q3b / Q8b):** a point per unit when any 1-point phrase of the rubric appears (lemmatized, articles ignored). Exact words also earn the idea. Independent of the exact-word score, not added.
- **Review:** a unit with related words but no rubric match (confidence 0.6 < 0.85) goes to a person; the doc's LLM adjudicator isn't built (T2-4).
- **Delayed extras:** delay minutes (Q8c; 99 = unknown) and cue needed (Q8d).
- Not completed → reason code in the exact-word field, ideas blank. An interrupted story → 97.
- **Derived:** intrusions (words in neither the story nor an accepted paraphrase), recall length, retention % (ideas later ÷ ideas right after).
- **The doc's** "verify the Form A rubric examples" tests are replaced by tests of every example in our four rubrics.

## Ambiguities and how they were resolved

| Spec text | Resolution |
|---|---|
| Recall window "no time limit" | Closes on "I'm finished" or 20 s of silence after speaking (doc's proposal), with a 3-minute safety cap (T2-3). |
| "Bit-level timing map" of the narration | Not built: the clip is one piece; onsets per bit need forced alignment (T2-5). |
| Interruption during recall | Reopens the window; the scorer joins every window of the step. |
| Delayed cue wording | Ours, per form ("a young boy" / "a young girl"). |

## Known gaps

- **LLM adjudicator** for paraphrase units outside the rubric lists; until then unclear units go to review.
- **Human review of rubrics** before `status: 'approved'` (doc): not done; forms are `equated: false`.
- **Zipf frequency matching** (no frequency data) and serial-position analytics.
