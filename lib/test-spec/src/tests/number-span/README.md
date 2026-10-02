# T3 Number Span Forward & Backward

**Source:** NACC UDSv4 C2T pp. 24–26 · build prompt [docs/build-prompts.md §T3](../../../../../docs/build-prompts.md) · Domains ATT (backward also EXE) · ~5 min.

> **Wording:** instructions, examples and prompts are Remembrance-original (DEVIATIONS L-1, owner decision 2026-10-01); the task, timing and scoring rules follow the build doc.

| Piece | Where |
|---|---|
| Spec (scripts, timing, rules) | [`spec.ts`](./spec.ts) |
| Forms: Form A (licensed), generator, frozen B–D, constraints | [`lib/forms/src/tests/number-span.ts`](../../../../forms/src/tests/number-span.ts) |
| Judge + scorer | [`lib/scoring/src/tests/number-span.ts`](../../../../scoring/src/tests/number-span.ts) |
| Engine tests (simulated phone call) | [`lib/engine/src/number-span.test.ts`](../../../../engine/src/number-span.test.ts) |
| DOM Firewall tests | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statechart | [`docs/statecharts/number-span.svg`](../../../../../docs/statecharts/number-span.svg) |
| Web route | `/assess/number-span` |

## State list (restated from the spec)

| # | Step | Zone | What happens |
|---|---|---|---|
| 1 | `fwdIntro` | protocol | Forward instructions with examples, ending "If I say 3–9–5, what would you say?" |
| 2 | `fwdPractice` | chrome | Response window. Judged live. Wrong → "That one would be 3–9–5." Right or unknown → no feedback. |
| 3 | `fwdOnly` | protocol | "From now on, just say the numbers back to me each time." |
| 4 | `forward` | protocol | For each of 14 items (lengths 3–9, two trials each): "Ready?" → digits at 1/s → response window → judge → 700 ms neutral pause. Discontinue when both trials at one length fail. |
| 5 | `switchBreak` | chrome | "Nice. A slightly different one next." Continues on the participant's tap. |
| 6 | `bwdIntro` | protocol | Backward instructions with examples, ending "If I say 7–1–5, what would you say?" |
| 7 | `bwdPractice` | chrome | As step 2; wrong → "That one would be 5–1–7." |
| 8 | `bwdOnly` | protocol | "From now on, just say the numbers back to me in reverse order each time." |
| 9 | `backward` | protocol | 14 items (lengths 2–8). As step 4, plus: a forward-order answer on item 1 or 2 gets **one** reminder ("Remember, say the numbers in reverse order, starting with the last one. Ready?") and the window reopens **without re-presenting**; the retry is the item's answer. |

**Response window:** opens after the last digit. Closes 3 s after the participant stops speaking, 10 s after opening if they never speak, on "I'm finished", or at a 30 s safety cap. A request to repeat gets only "Just do your best." (once per window); the item is never re-presented.

## Scoring rules (restated)

- **Item** = 1 if the digits heard equal the item (forward) or its exact reverse (backward), else 0.
- **Parsing:** number words and numerals split into digits ("one eighty four" → 1-8-4, "sixty-four" → 6-4), "oh" = 0, fillers and other words ignored.
- **Self-corrections:** a marker ("no", "sorry", "wait", "actually", "I mean") or restarting from the attempt's first digit starts a new attempt. The **final complete attempt** is scored (the last attempt of the item's length, else the last attempt), and the item is flagged for review.
- **Totals:** forward 0–14 → C2T Q5a; backward 0–14 → Q6a.
- **Longest span:** the longest length with at least one correct trial → Q5b / Q6b (the source's "longest span forward" under backward is a typo; this uses the backward span).
- **Not completed** (stopped before the end or the discontinue point) → the total field holds the reason code; longest span is blank.
- **Review queue:** ASR outage (direction left unscored), an item whose presentation failed onset QA (not scored), self-corrections, or ASR confidence < 0.7.
- The live judge and the post-hoc scorer are the **same function**, so the discontinue decision and the score can't disagree.

## Ambiguities and how they were resolved

| Spec text | Problem | Resolution |
|---|---|---|
| "No ascending/descending run of 3+" | Read as 3 digits in one direction, **16 Form A items fail** (e.g. 2-7-9). | Read as 3 **steps** (4 digits) in one direction; Form A passes. Also rejected: whole items that step evenly (3-6-9), which Form A never uses. |
| "No repeated 2-digit substrings between the two trials of the same length" | **Form A breaks this 4 times** (e.g. 6-8-4-1-9-3-5-2-7 / 1-3-9-2-7-5-8-6-4 share "27"). | Enforced for generated forms; Form A exempt. |
| "Practice items… never generate them as test items" | **Form A's backward item 3-7-4 was the C2T backward example (our examples are now 6-1-4 / 3-9-5 / 4-9-2 / 7-1-5).** | Enforced for generated forms; Form A exempt. With Form A the instruction caption shows a test item on screen, so the DOM Firewall test runs on Form B. |
| 5/9 confusability "within Form A's range" | Range per what? | Per sequence length: Form A's min–max count of 5s and 9s at that length. |
| "Year/date/phone fragment" | Open-ended. | Rejects sequences of length ≥4 starting 1-9. No 0s means no "20xx"; no repeats means no "555". |
| Response window "3 s" / "10 s" | Marked ⟦propose⟧. | Adopted as proposed. The 30 s hard cap is added. |
| Repeat request reply | Marked ⟦confirm approved phrase⟧. | "Just do your best." (user-approved default, 2026-09-30). |
| Digit rate | Not stated in the source. | 1 digit/s onset-to-onset (user-approved default). |
| Unknown judgement (ASR outage) during the test | The discontinue rule needs live scoring. | Unknown never counts as a failure: the block runs to the end and goes to review. |

## Deviations from the paper protocol

See [DEVIATIONS.md](../../../../../DEVIATIONS.md) T3-1 … T3-9.

## Known gaps

- **Early answers** (speaking before the last digit) aren't captured: the window opens after presentation. Needs capture to start at the first onset.
- **Dropped-digit replacement:** a presentation that fails onset QA is left unscored and sent to review; the optional replacement item from the generator isn't implemented.
- **Phone channel:** proven in the simulated call; the Twilio `TelephonyPort` (8 kHz clips, server-side VAD/ASR) is not built yet.
- **Web transcription:** the web app streams to the API relay (`/api/asr/stream` → Deepgram). Without `DEEPGRAM_API_KEY` every item is "unknown", nothing discontinues, and every administration goes to review.
