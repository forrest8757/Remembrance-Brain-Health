# T6 Category Fluency (Animals + a second category)

**Source:** NACC UDSv4 C2T pp. 32–36 · build prompt [docs/build-prompts.md §T6](../../../../../docs/build-prompts.md) · Domains LANG (○ EXE) · ~4 min.

> **Wording:** instructions, examples and prompts are Remembrance-original (DEVIATIONS L-1, owner decision 2026-10-01); the task, timing and scoring rules follow the build doc.

| Piece | Where |
|---|---|
| Spec (scripts, timing, prompts) | [`spec.ts`](./spec.ts) |
| Forms (A Vegetables, B Fruits, C Occupations) | [`lib/forms/src/tests/category-fluency.ts`](../../../../forms/src/tests/category-fluency.ts) |
| Lexicons (credit rules, Troyer subcategories) | [`lib/scoring/src/lexicons/`](../../../../scoring/src/lexicons/) |
| Judges, detectors, scorer | [`lib/scoring/src/tests/category-fluency.ts`](../../../../scoring/src/tests/category-fluency.ts) |
| Scoring tests (every credit/no-credit example) | [`category-fluency.test.ts`](../../../../scoring/src/tests/category-fluency.test.ts) |
| Engine tests (simulated phone call) | [`lib/engine/src/category-fluency.test.ts`](../../../../engine/src/category-fluency.test.ts) |
| DOM Firewall tests | [`lib/ui/src/firewall.test.tsx`](../../../../ui/src/firewall.test.tsx) |
| Statechart | [`docs/statecharts/category-fluency.svg`](../../../../../docs/statecharts/category-fluency.svg) |
| Web route | `/assess/category-fluency` |

## State list (restated from the spec)

| # | Step | Zone | What happens |
|---|---|---|---|
| 1 | `practiceIntro` | protocol | "…for clothing you could say sock, jacket, or belt. Can you name a couple of other kinds of clothing?" |
| 2 | `practice` | chrome | Window: up to 20 s, closes at two responses or "I'm finished". Classified into code 0–4; the matching scripted line plays (codes 1/3 with neutral frames, T6-1). |
| 3 | `animalsGo` | protocol | Animals instruction ending "Ready? Go." |
| 4 | `animals` | protocol | Exactly 60 s, then "Stop." One prompt per trial ("Any other animals you can think of?") on 15 s of silence **or** "I can't think of any more" (shared allowance). "Yes." to a question about a creditable member ("do birds count?"). The instruction sentence may be repeated once if asked. |
| 5 | `secondGo` | protocol | Same instruction for the form's second category (`{{categoryTitle}}`, `{{categoryPlural}}`). |
| 6 | `second` | protocol | As step 4 for the second category. |

No counter, timer or recognized word is ever on screen; the orb ripples with the voice only (Firewall test).

## Scoring rules (restated)

- **Animals (0–77) → C2T Q9a.** Credit: breeds (terrier); male/female/infant names (bull, cow, calf); superordinate **and** subordinate (dog **and** terrier); birds, fish, reptiles, insects. No credit: repetitions, mythical animals.
- **Vegetables (0–77) → C2T Q9b.** Credit: superordinate and subordinate (peppers and jalapeños); less specific names (greens); nuts; grains; gourds; sugarcane; herbs; seaweed; tomato, avocado, pumpkin; legumes; dictionary-verifiable cultural vegetables (jicama). No credit: repetitions, prepared products (pickles, tomato sauce, ketchup), spices.
- **Fruits / Occupations (Forms B/C):** rules written in the same style at the top of each lexicon file.
- Plurals collapse for repetitions ("cats" after "cat"). Multi-word names merge through the lexicon ("polar bear", "brussels sprouts"); hyphenated ASR tokens split first. Fillers and connectives are dropped.
- Words starting at or after **60.0 s** are kept in the raw transcript and not scored.
- Words from another category's lexicon (e.g. "shirt" during Animals) are **intrusions**: logged, no credit.
- **Review queue:** out-of-lexicon words, judgement-call members (dinosaurs, olives as vegetables…), members named only inside a question, low ASR confidence, ASR outage.
- Not completed → the trial's field holds the reason code (95–98).
- **Derived:** words per 15-s bin, Troyer mean cluster size and switches, first-word latency, mean inter-word gap, repetition / intrusion / no-credit / unrecognized counts.

## Ambiguities and how they were resolved

| Spec text | Problem | Resolution |
|---|---|---|
| Practice feedback with "___" (the participant's words) | Needs runtime TTS (`⟦DECISION⟧`). | Neutral frames, no echo (T6-1). Authored lines need owner approval. |
| Practice codes 3 vs 4 | 2 correct + 1 incorrect fits both. | Code 3: anything incorrect gets the correction. |
| "Yes." to "do birds count?" | What if they ask about a non-member ("do unicorns count?")? | "Yes." only when the asked-about item is creditable; otherwise no reply (no "No" is scripted). |
| Is the member named in the question credited? | Not stated. | Not credited automatically; sent to review (T6-5). |
| Repeat "if the participant specifically asks" | Repeating the whole instruction mid-minute (incl. "Ready? Begin.") is odd. | Repeat the instruction's own sentence "Name as many … as you can in one minute." once (T6-7). |
| Timer "starts on the onset of Begin" | Response windows open when a line ends. | Window opens at the end of the line (~0.5 s later) (T6-2). |
| Rotating second category, "productivity within ±15%" | Needs Zipf frequencies we don't have. | Forms B/C ship `equated: false`; check deferred (T6-3). |
| Interruption mid-trial | Not specified. | The trial restarts with a fresh 60 s; the interruption is flagged (T6-4). |
| Self-corrections ("cat, no, dog") | Not specified for fluency. | Both words scored; "no" ignored. |

## Deviations from the paper protocol

See [DEVIATIONS.md](../../../../../DEVIATIONS.md) T6-1 … T6-8.

## Known gaps

- **LLM adjudicator** for out-of-lexicon words isn't built; they score 0 and go to review.
- **Questions asked during the instructions** (before "Begin.") aren't detected; only during the minute.
- **Voice repeat requests** aren't detected; the on-screen repeat button triggers the repeat.
- **Phone channel:** proven in the simulated call; Twilio runner not built.
- Screenshots of every state (§14.5) still to capture once the flow is tried in a real browser.
