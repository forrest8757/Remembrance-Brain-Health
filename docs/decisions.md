# Decisions

Resolved `⟦DECISION⟧` markers from [build-prompts.md](./build-prompts.md) §3. Each entry is fixed once made: changing one later is a protocol change (U1 prompt) and must be logged in [DEVIATIONS.md](../DEVIATIONS.md).

| # | Decision | Choice | Date | Notes |
|---|---|---|---|---|
| D5 | Content | **Remembrance-original forms only.** No licensed NACC content (MoCA, Craft Story, etc.) is served. | 2026-09-30 | Form A of each test may exist in code behind `licensed: true` for reference/validation, but the app never assigns it. |
| D8 | MoCA orientation "place" (at home) | **Profile-based.** Script stays verbatim ("tell me the name of this place, and which city it is in"). | 2026-09-30 | See below. |
| D10 | Education adjustment | **Yes: +1 point if ≤ 12 years of education.** Stored as a separate display score; the raw total (Q1d) is unchanged. | 2026-09-30 | Years of education collected once in the profile step. |
| D11 | MoCA vigilance response | **Always tapping.** Web: tap the on-screen TapPad. Phone: tap the mouthpiece, detected from the audio. No voice "yes" fallback. | 2026-09-30 | If the phone tap check can't detect a tap, vigilance is **not administered** with a reason code (so the MoCA total is 88 per NACC rules); the rest of the test still counts. |
| D12 | Session structure | **One sitting; MoCA first.** | 2026-09-30 | No 1–7 day split. |

## D8 detail: orientation "place" and "city"

The item tests whether someone knows where they are. It never needs a street address.

- **Profile step (once, before the first session):** city/town, and "Where will you usually do these activities?" (At home / Somewhere else, with its name). Also years of education (D10). Never a street address; the step says so ("We'll never ask for your address").
- **Place:** credited for any natural answer naming where they are: "home", "my house", "my apartment", or a named place ("Sunrise Senior Living").
- **City:** credited when it matches the profile city.
- **Mismatch with the profile → human review, not an automatic 0.** People travel or stay with family.
- **Privacy:** if someone volunteers an address, it is redacted from the stored transcript.
- Asking about location at the start of a session is not allowed: it would cue the answer.

## T1 approvals (2026-09-30)

- Memory words at **1 per 1.5 s** (spec allows 1.5–2 s).
- Authored lines: category cue "Here's a hint: one of the words was {cue}."; tap check "Let's make sure your taps come through. Please tap once now." / "Please tap once more."
- Serial 7s start values vary by form (90, 110, 120), each with 4 borrows like 100.
- T3 defaults (earlier): 1 digit per second; repeat requests answered only with "Just do your best."


## Comparisons and brain age (2026-09-30)

- Results are scored exactly as the build doc says (official fields, no 0–100 scale).
- Compare with **Remembrance's own participants** (§3b), not published NACC norms: first completed administration per person per test, by age band and sex; a group is shown once it has 30 people (`MIN_COHORT`, `lib/scoring/src/norms.ts`).
- Stored in a **hosted Postgres** (`DATABASE_URL` in `artifacts/api-server/.env`; table `reference_results`, created with `pnpm --filter @workspace/db push`).
- Brain age (later): the age at which the reference's typical score equals the participant's (`estimateBrainAge`, needs ≥200 reference results; not shown to participants yet). Next: a composite across tests and sex-specific curves.

## T6 Category Fluency (2026-10-01)

- Built after T1 and T3 instead of T2 Story Recall: T2 needs the P2 orchestrator for its 20-minute delay and an LLM judge for paraphrase units.
- Animals is the fixed anchor (only Animals is compared with other people). The second category rotates: Form A Vegetables (NACC), Form B Fruits, Form C Jobs or occupations (originals, `equated: false`).
- All three second categories rotate (A Vegetables, B Fruits, C Jobs or occupations) via the no-repeat / Latin-square assignment; Form A is served without the license flag. **Owner approved 2026-10-01.**
- Practice feedback uses the neutral frames (DEVIATIONS T6-1). **Owner approved 2026-10-01** as the interim version; revisit when voice agents (runtime TTS) arrive.

## T8 Oral Trails (2026-10-01)

- Built after T6 (lean battery order: T6 → T8 → T7).
- One canonical form (doc's recommended default), served without the license flag.
- Real-time error handling defaults: 800 ms self-correction grace, low-confidence never interrupts, E-set sound-alikes accepted and flagged (DEVIATIONS T8-1).
- Comparisons use Part A and Part B times (faster is better).
- "Start with {{first}}." approved 2026-10-01: names the sequence's first element (1 today; A for a letter-first variant).

## T7 Phonemic Fluency (2026-10-01)

- Forms: A (F, L; NACC pair), B (S, W), C (A, H), rotating. Avoids C/K/X/Q/Z, the MoCA fluency letters (M, P, R) and B (the instructions' example letter).
- The letter is shown on screen while listening (doc's recommendation; DEVIATIONS T7-2).
- 15-s pause prompts: "Keep going." then "What other words beginning with '…'?" (the doc's suggested sequence).
- Dictionary: Webster's 2nd (public domain) subset, loaded only on the T7 page.
- Rule reminders approved; the script was replaced by Remembrance-original wording (see below).

## No permission-required content (2026-10-01)

- Owner rule: don't use anything marked as needing permission unless the owner says so. Recorded in CLAUDE.md §8.
- T3, T6, T7 and T8 instructions, examples and prompts rewritten in Remembrance-original wording (owner chose this for the NACC manual's general "reproduced by permission" notice too). Same tasks, timing and scoring. DEVIATIONS L-1.
- T1 MoCA-Blind switched off (MoCA trademark/license). Enable with `VITE_PERMITTED_TESTS=moca-blind` only after the owner approves.
- T7 rule reminders approved as written.

## Onboarding background questions (2026-10-02)

- Owner asked for a more complete onboarding: sex, education, age, and family brain-health history ("so we know if we are dealing with someone who is a little more genetically inclined to have cognitive decline").
- Built as onboarding steps 4–7 (design/rollout/onboarding/README.md):
  - Birth year, sex and education (by degree, mapped to years) go into the participant profile, so the session asks only city and usual place.
  - Family history covers close and wider family, early onset (before 65), and other conditions.
  - An optional self-reported APOE test result.
- Descriptive context only: no risk score, no diagnosis. Health, family and genetic answers are PHI; production storage must be server-side, encrypted and audited, and kept out of analytics.
- Owner left two calls to me:
  - **No voice-speed setting:** activity audio stays at one standard pace (Firewall).
  - **The design lint stays a Vitest check:** no new ESLint dependency.
