# T8 Oral Trail Making (Parts A and B)

**Source:** NACC UDSv4 C2T pp. 40–43 · build prompt [docs/build-prompts.md §T8](../../../../../docs/build-prompts.md) · Domains ATT (A), EXE (B) · ~5 min.

> **Wording:** instructions, examples and prompts are Remembrance-original (DEVIATIONS L-1, owner decision 2026-10-01); the task, timing and scoring rules follow the build doc.

| Piece | Where |
|---|---|
| Spec (scripts, timing, branches) | [`spec.ts`](./spec.ts) |
| Form (canonical 1–25 and 1-A…13) | [`lib/forms/src/tests/oral-trails.ts`](../../../../forms/src/tests/oral-trails.ts) |
| Live decoder, pre-test/practice judges, scorer | [`lib/scoring/src/tests/oral-trails.ts`](../../../../scoring/src/tests/oral-trails.ts) |
| Engine step `sequenceTask` | [`lib/engine/src/machine.ts`](../../../../engine/src/machine.ts) |
| Engine tests (every DoD scenario) | [`lib/engine/src/oral-trails.test.ts`](../../../../engine/src/oral-trails.test.ts) |
| Decoder/scorer tests | [`oral-trails.test.ts`](../../../../scoring/src/tests/oral-trails.test.ts) |
| DOM Firewall tests | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statechart | [`docs/statecharts/oral-trails.svg`](../../../../../docs/statecharts/oral-trails.svg) |
| Web route | `/assess/oral-trails` |

## State list (restated from the spec)

| # | Step | Zone | What happens |
|---|---|---|---|
| 1 | `aIntro` | protocol | "…count out loud from 1 to 25 as fast as you can… Ready? Go." |
| 2 | `partA` | protocol | Live sequence 1–25, max 100 s. Wrong next number → "You were at '[n].' Carry on from there." (error; timer keeps running). 5 s without progress → "Please keep going." 5 s more → the last correct number is given (error). 15 s after the prompt → discontinue (996, blanks). |
| 3 | `pretestAsk` / `pretest` | chrome | "Please say the alphabet for me, starting from A." A–L: 0 errors → continue; 1–2 → asked again; ≥3, or any error the second time → Part B not given (997). |
| 4 | `bIntro` | protocol | Part B instructions ending with the practice ("…go up to the number 4… Ready? Go."). |
| 5 | `bPractice` | chrome | Target 1 A 2 B 3 C 4. Wrong → "Not quite. It goes 1, A, 2, B, 3, C, 4." then the practice instruction again; up to 3 attempts; still wrong → Part B not given (996). |
| 6 | `bGo` | protocol | "…keep going until you reach 13. Ready? Go." |
| 7 | `partB` | protocol | Live sequence 1 A 2 B … 12 L 13, max 300 s; corrections "You were at '[n], [letter].' Carry on from there." with the last complete pair; same pause rules. |

Nothing is on screen during the parts except the orb: no numbers, letters, counter or timer (Firewall test).

## How errors are caught live

- Speech → units: number words and digits ("twenty five" → 25), letter names ("bee" → B, "see" → C), run-together pairs ("4d"). Fillers ignored.
- **Wrong next unit** → wait **800 ms** for a self-correction, then interrupt. With ~300 ms of streaming-ASR delay this stays inside the doc's **1.2 s** budget; every correction logs its latency.
- **Self-correction** ("3, 5, 4, 5"): logged, not an error (the doc's proposed default). A swapped pattern ("A, 1, B, 2") is an error at the first element.
- **Precision over recall:** a low-confidence mismatch never interrupts (logged for review); an E-set letter heard for an E-set letter (B/D/E/G/P/T/V/Z, C) with < 0.9 confidence is accepted and flagged.
- **After a correction:** speech is ignored for 2.5 s (the clip is playing), and re-saying the units the correction named ("…3, please continue" → "3, 4") is fine.
- "Where was I?" → the last correct position is given at once (an error).

## Scoring

- Per part: **time** (s, from the start of the window to the end of the last unit, including corrections; capped at 100 / 300, and the cap is the score when not finished), **errors**, **correct** (units said in order, out of 25).
- Discontinued (15-s stall) → time = reason code (996), errors and correct blank. Not given (pre-test / practice) → time = 997 / 996.
- **Derived:** switching cost B − A and ratio B/A (only when both parts finished), set-loss vs sequencing vs lost errors, self-corrections, keep-going prompts, hesitations (gaps > 2 s), number→letter vs letter→number mean latency (Part B), max correction latency.
- **NACC field codes:** not in the source manual; unmapped (an `it.todo` in the scorer tests).
- Review queue: sound-alike acceptances, unclear tokens that weren't corrected, ASR outage.

## Ambiguities and how they were resolved

| Spec text | Problem | Resolution |
|---|---|---|
| Error at the very first element ("A, 1") | The correction has nothing to name. | "Start with 1." (T8-2, approved). |
| Part B error right after a number ("4, 5") | The last complete pair is "3, C", but 4 was right. | Name "3, C" and resume at 4 (the participant re-says 4). |
| "If they don't recall where they are" | Examiner judgement. | 5 s after "Please keep going" with no progress, or "where was I?" → give the last correct position (error). |
| Discontinue code "995–998" | Which one? | 996 until the exit flow lets a person pick (T8-6). |
| Self-correction counts as error? | Source silent; doc proposes not. | Not an error if fixed within the 800-ms grace; logged. |
| "Number-letter." reminder ("may remind") | When? | Not used automatically yet (T8-7). |
| Timer starts on "Begin." | Windows open when the line ends. | ~0.5 s later than the onset of "Begin." (as T6-2). |

## Known gaps

- **Real-browser latency:** the 1.2-s budget is proven on the simulated clock; real Deepgram interim latency needs measuring (it's logged per correction).
- **Barge-in:** speech during a correction is muted by time (2.5 s), not by detecting the clip's end; the participant's words in that window are lost.
- **Phone channel:** the decoder runs in the engine, so the Twilio runner gets it for free once built.
