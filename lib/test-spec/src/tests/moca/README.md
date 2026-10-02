# T1 MoCA-Blind

**Source:** NACC UDSv4 C2T pp. 14–18 · build prompt [docs/build-prompts.md §T1](../../../../../docs/build-prompts.md) · Domains ATT, MEM, LANG, EXE, ORI · 5–10 min · max 22. **Decisions:** D5 original forms only · D8 profile-based place/city · D10 +1 for ≤12 yrs education · D11 always tapping · D12 one sitting, MoCA first ([docs/decisions.md](../../../../../docs/decisions.md)).

| Piece | Where |
|---|---|
| Spec (verbatim scripts, timing, rules) | [`spec.ts`](./spec.ts) |
| Forms: Form A (licensed fixture, never served), original B–D, vigilance generator, validators | [`lib/forms/src/tests/moca.ts`](../../../../forms/src/tests/moca.ts) |
| Judges + scorer + record adapter | [`lib/scoring/src/tests/moca.ts`](../../../../scoring/src/tests/moca.ts) |
| Engine tests (simulated phone call) | [`lib/engine/src/moca.test.ts`](../../../../engine/src/moca.test.ts) |
| DOM Firewall test | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statechart | [`docs/statecharts/moca-blind.svg`](../../../../../docs/statecharts/moca-blind.svg) |
| Web route | `/assess/moca-blind` (profile step first, once) |

## State list (restated)

| Subtest | Steps | Notes |
|---|---|---|
| Intro (chrome) | `howItWorks` | "You'll hear my voice. Just talk to me naturally. There are no trick questions." |
| 1 Memory | `memIntro` → `words1` (5 words, 1 per 1.5 s) → `registration1` → `memTrial2` → `words2` → `registration2` → `memLater` | Always two trials. Misheard words (e.g. "vase" for "face") are played as a slower, stressed clip in trial 2. Not scored. |
| 2 Attention | `digitsFwd` (5 digits, 1/s) → `digitsForward` · `digitsBwd` (3 digits) → `digitsBackward` · `vigIntro` → `vigilance` (tap check, then 29 letters at 1 per 2 s) · `serialIntro` → `serial7` | Vigilance: TapPad on web; mouthpiece taps on the phone. If no tap is detected after one retry, vigilance is **not administered** (reason 97) per D11. Serial 7s closes after five answers ("Stop.") using the live transcript. |
| 3 Sentences | `sentence1Intro` → `sentence1Read` → `sentence1` · same for sentence 2 | Sentences are stimulus clips, never captioned. |
| 4 Letter fluency | `fluencyIntro` → `fluencyGo` → `fluency` (exactly 60 s, then "Stop.") | "The letter M, like milk." phone adaptation used on both channels. |
| 5 Abstraction | `absPracticeQ` → `absPractice` (one "another way" retry, then "…also both fruit" only if still wrong) → `abs1Q` → `abstraction1` → `abs2Q` → `abstraction2` | No prompts on scored pairs. |
| 6 Delayed recall | `delayedIntro` → `delayedFree` → `delayedCues` | Category cue, then multiple choice, **only for missed words**. Cue and choice lines are spoken but never captioned. |
| 7 Orientation | `dateQ` → `orientDate` (one follow-up for missing parts) → `placeQ` → `orientPlace` | Follow-up names only the missing parts ("Tell me the year and day of the week."). |

Instructions (not stimuli) may be repeated once if asked; stimuli are never re-presented.

## Scoring rules (restated; C2T fields)

| Field | Rule |
|---|---|
| Q1e digits (0–2) | 1 each for the exact sequence; backward must be the exact reverse. |
| Q1f vigilance (0–1) | Tap in letter *i*'s window [onset *i*, onset *i+1*) = response. A tap in an A window = hit; in a non-A window = commission; no tap in an A window = omission. Several taps in one window = one response (flagged). **1 if errors ≤ 1.** Not administered → reason code. |
| Q1g serial 7s (0–3) | First five answers; each judged against the participant's **own previous answer** (92-85-78-71-64 = 4 correct). 4–5 → 3, 2–3 → 2, 1 → 1, 0 → 0. Stopping early scores what was said. |
| Q1h sentences (0–2) | 1 each for an exact repetition; omissions, substitutions, additions, tense and plural changes are errors. Low ASR confidence (< 0.85) → review (ASR "fixes" grammar). |
| Q1i fluency (0–1) | 1 if ≥ 11 valid words in 60 s. Invalid: repetitions, other letters, numbers ("four" only next to other numbers), people/places, plural/tense/comparative variants. |
| Q1j abstraction (0–2) | Accept/reject lists per form (e.g. "transportation", "travel", "trips" / "wheels"). Novel phrasing → review (the rubric-constrained LLM adjudicator is not wired yet). |
| Q1k delayed free (0–5) | 1 per word recalled without cues. A misheard word that recurred in **both** registration trials is credited. |
| Q1l category-cued | Count correct after the category cue; **88 if no cue was given**. |
| Q1m multiple choice | Count correct after multiple choice; **88 if none was given**. Invariant 1k + 1l + 1m ≤ 5. |
| Q1n–Q1s orientation (6) | Date, month, year, weekday: exact, against the participant's local date at the moment of the question (time zone recorded). Place and city per D8 against the profile; a mismatch goes to **review**, not an automatic 0. |
| Q1d total (0–22) | Sum of 1e–1k and 1n–1s. Any scored item not administered (or the test stopped) → **88**. ASR outage → unscored + review (vigilance still scores). |
| Education-adjusted | +1 if ≤ 12 years (D10), capped at 22; stored separately. |

## Ambiguities and resolutions

| Spec text | Resolution |
|---|---|
| Words "1 per 1.5–2 s" | **1.5 s** on both channels (spec's lower bound; closer to the in-person 1/s). Approved 2026-09-30. |
| Vigilance "≥ 1 per 2 s" | Exactly 2 s. |
| Registration close "⟦propose: 10 s silence after last word⟧" | Adopted; plus 15 s with no speech at all. |
| "Repeat each item once, if asked" | Instructions only, once; never stimuli (spec's own resolution). |
| Serial 7s "stop after 5 responses" | Live count from streaming ASR, then "Stop." On the web without ASR the window closes on 10 s of silence instead. |
| Category cue wording (not scripted) | AUTHORED: "Here's a hint: one of the words was {cue}." Approved 2026-09-30. |
| Tap check wording (spec: "tap once now") | AUTHORED: "Let's make sure your taps come through. Please tap once now." / "Please tap once more." Approved 2026-09-30. |
| Digits "no ascending/descending run ≥ 3" | Read as 3 same-direction **steps** (4 digits): Form A's 2-1-8-5-4 has a 3-digit descending run. Same reading as T3. |
| Vigilance "4 singles" | Form A's runs are one triple, two doubles, four singles (3+4+4 = 11); enforced exactly. |
| Serial 7s start (⟦DECISION⟧ alternate starts vs fixed 100) | Alternate starts with 4 borrows like 100: Forms B–D start at 90, 110, 120. Approved 2026-09-30. |
| Frequency matching (SUBTLEX-US Zipf ≥ 4.0) | **Not enforced**: no frequency data in the repo. Words were chosen as common, concrete, 1–2 syllables; checked for rhymes and foil confusability. |
| Place "at home" (D8) | Profile-based; see decisions.md. |

## Deviations

[DEVIATIONS.md](../../../../../DEVIATIONS.md) T1-1 … T1-10.

## Known gaps

- **Web transcription:** the web app streams to the API relay (`/api/asr/stream` → Deepgram). Without `DEEPGRAM_API_KEY` it can't judge speech live, so it skips practice feedback, misheard-word emphasis, delayed-recall cues, the date follow-up and the serial-7 count stop. Everything spoken goes to review. **Vigilance (taps) scores fully on the web.**
- **Abstraction adjudicator:** novel answers go to review; the LLM adjudicator (CLAUDE.md §7) isn't wired.
- **Fluency proper nouns:** a small seed list; T7 will bring the full gazetteer/NER and spelling resolver.
- **Word frequency:** see the ambiguity table.
- **Phone taps:** the simulated call proves the flow; mouthpiece-tap detection lives in the Twilio port (not built).
- **Section transition shimmer** between subtests (UX note) is not implemented.
- **MoCA-30 conversion** omitted (spec: only with the official equation).
