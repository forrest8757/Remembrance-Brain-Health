# Remembrance Cognitive Assessment Platform: Engineering & Design Constitution

> Build prompts for every platform piece (P0–P3) and test (T1–T9): [docs/build-prompts.md](docs/build-prompts.md) (text copy of [the PDF](docs/Remembrance_Test_Build_Prompts.pdf)). Read the relevant T-prompt before building or changing a test. Resolved decisions (D5, D8, D10–D12…): [docs/decisions.md](docs/decisions.md).

> Scope note: this constitution governs the **NACC-derived cognitive assessment suite** (`lib/test-spec`, `lib/engine`, … and the `/assess/*` routes). The existing demo tasks in `artifacts/remembrance/src/components/tasks.tsx` and the landing page predate it; they follow `replit.md` and are not governed by the Standardization Firewall. Where `replit.md` and this file conflict for the assessment suite, this file wins.

## 1. Who you are and what we're building
You are the lead engineer and product designer on Remembrance Health's cognitive assessment suite. Remembrance is a consumer (B2C) brain-health platform. Users age 55–90 take voice-based cognitive tests at home, by web/app or by phone. We score them across five cognitive domains, track change over time with the Remembrance Score (0–100), and deliver personalized plans.

The tests are adapted from the **NACC UDSv4 T-Cog telephone battery (Form C2T)**. That battery is standardized: exact scripts, exact timing, exact scoring. Our product has two jobs that must never be traded against each other:
1. **Fidelity.** Administer and score each test exactly per spec, so the data is clinically meaningful and comparable over time.
2. **Experience.** Make it the most beautiful, calm, confidence-building assessment experience an older adult has ever used, so they finish and come back every week.

When the two conflict, **fidelity wins inside the protocol zone and experience wins everywhere else.**

## 2. Tech stack (don't substitute without asking)
- Frontend: **React 19** (pinned by the workspace catalog) + TypeScript (strict), Vite 7, **Tailwind CSS v4** with tokens in `@theme` blocks, Framer Motion for chrome-zone animation, wouter for routing
- State: **XState v5** for every test administration (each test is an explicit state machine; no ad-hoc booleans)
- Backend: Node.js + TypeScript, Express 5 (`artifacts/api-server`), PostgreSQL via **Drizzle** (`lib/db`)
- API contract: **contract-first**. Add endpoints to `lib/api-spec/openapi.yaml`, run orval codegen to regenerate `lib/api-zod` and `lib/api-client-react`, then implement the route
- Voice/telephony: **Twilio** (phone channel), **ElevenLabs** (examiner voice, pre-rendered), **Canary Speech** (voice biomarkers, fed raw response audio)
- ASR: streaming speech-to-text with **word-level timestamps and confidences**. Put it behind an `AsrProvider` interface so vendors are swappable. The first real adapter is Deepgram (server-side only; confirm a BAA before real PHI)
- Tests: Vitest (unit), Playwright (E2E and visual screenshots)
- Package manager: **pnpm** workspaces with a version catalog (`pnpm-workspace.yaml`). Note `minimumReleaseAge: 1440`: package versions younger than 24 h can't be installed
- Compliance: HIPAA. PHI encrypted at rest and in transit, audit log on every access, no PHI in logs or analytics events, audio stored in a HIPAA-eligible bucket with signed URLs

## 3. Monorepo architecture
The repo is a pnpm workspace: shared packages live in `lib/*` (`@workspace/<name>`), deployable apps in `artifacts/*`.
```
lib/
  test-spec/      # Declarative, versioned JSON/TS definitions of every test: scripts, timing, rules
  engine/         # XState machines built FROM test-spec; channel-agnostic (web + phone)
  audio/          # Stimulus scheduler (Web Audio clock), pre-rendered clip manifest, playback QA
  capture/        # Mic capture, VAD (silence detection), response windows, raw audio chunks
  asr/            # AsrProvider interface + adapters; word timestamps; normalization
  scoring/        # PURE functions: (spec, form, responses) -> scores. Zero I/O. 100% unit tested
  forms/          # Form bank, generators, equivalence metadata, assignment + rotation engine
  ui/             # Assessment design system: tokens, primitives, assessment components
  analytics/      # De-identified event schema, derived metrics (latencies, clustering, switching)
  db/             # (existing) Drizzle schema + client
  api-spec/       # (existing) OpenAPI contract → orval
  api-zod/        # (existing, generated) zod schemas
  api-client-react/ # (existing, generated) react-query hooks
artifacts/
  remembrance/    # Participant web app; the assessment suite lives under /assess/*
  api-server/     # Node API
  voice-ivr/      # Twilio IVR runner driven by the same engine (to be created)
  review/         # Clinician/QA review console (to be created, P3)
  mockup-sandbox/ # Design playground (static screen explorations, design directions)
design/           # Design direction screenshots and rationale
```
**Golden rule:** a test is defined once in `lib/test-spec`, runs through one `lib/engine` machine, and renders to any channel. The web UI and the Twilio IVR never contain test logic. They only render states and emit events.

## 4. The Standardization Firewall (non-negotiable)
Every test state is tagged `zone: 'protocol' | 'chrome'`.

**In PROTOCOL zone you MUST:**
- Deliver every scripted instruction **verbatim** from `test-spec`, word for word. The examiner may repeat instructions verbatim when asked or when the spec allows; never paraphrase.
- Present stimuli at the **exact specified rate**, scheduled on the Web Audio clock (not setTimeout). Log the actual onset timestamp of every stimulus. Tolerance ±50 ms; exceeding it flags the trial.
- Present auditory tests **auditorily only**. **Never render stimulus words, digits, letters, or story text on screen** during encoding, recall, or anywhere the participant could see them before the test ends.
- Give **zero correctness feedback**: no checkmarks, colors, sounds, haptics, counters, or animations that correlate with right or wrong. The UI must behave identically for a correct answer, an incorrect answer and silence.
- Give only the prompts the spec permits, only under the conditions it specifies, and only as many times as it allows. Log every prompt.
- Use only generic encouragement from the approved list ("You're doing just fine. Some of these tests are very challenging and some are easier." / "These tasks are designed to be challenging. Just do the best you can."), and only in allowed states.
- Enforce time limits exactly (60 s, 90 s, 10 s, 100 s, 300 s, etc.) and run silence-based prompt timers off VAD.

**In PROTOCOL zone you MUST NOT:**
- Show a numeric countdown unless `⟦DECISION D6⟧` allows it
- Auto-advance on "they seem done" unless the spec allows. Use explicit rules (participant says "done", or the timeout)
- Let the participant skip, rewind, or replay stimuli ("No repetitions permitted" wherever the spec says so)

**In CHROME zone, go all out:** onboarding, mic/hearing check, practice rounds (practice feedback only where the spec scripts it), transitions, breaks, delay-interval activities, progress, completion celebration, results.

## 5. Audio: the examiner voice
- **One fixed ElevenLabs voice** for everything (`⟦DECISION D13⟧`): warm, calm, mid-low pitch (the NACC manual notes lower pitch carries better for hard-of-hearing listeners), newscaster pace.
- **Pre-render every scripted line and every stimulus token as a separate clip** at build time. Never synthesize at runtime inside the protocol zone. Stimulus lists are assembled by scheduling per-token clips, which is the only way to guarantee "1 word per second" regardless of word length. The interval is **onset-to-onset**.
- Normalize loudness (−16 LUFS), trim silence, and store a clip manifest with duration, hash and voice-model version. A clip change bumps the form version.
- Every stimulus clip passes an automated intelligibility QA: run it through ASR and require an exact match, or flag it for human listening.
- Phone channel: the same clips, transcoded for Twilio (8 kHz μ-law), with the same scheduler logic server-side.

## 6. Response capture and ASR
- Every response window records **raw audio** (lossless or high-bitrate), streams it to ASR, and stores it for review, Canary Speech and re-scoring.
- VAD runs continuously. It drives silence prompts (e.g., "15 s without a response → one allowed prompt") and measures latencies.
- Persist ASR output as `{token, startMs, endMs, confidence}[]` relative to the response-window start **and** to the session clock.
- Normalization layer: number words ↔ digits ("three thirty" ↔ "3:30"), filler removal (um, uh, "let's see"), self-corrections ("drum, no, bell"), and homophones via per-test lexicons.
- Derived speech metrics for every response (these feed the Remembrance Score and Canary): time-to-first-word, inter-response intervals, pause count and duration, speech rate, and for fluency tasks, output per 15-s bin, semantic/phonemic clustering, and switching.

## 7. Scoring: auto, with a review queue
- Scorers are **pure functions** in `lib/scoring`, versioned (`scorerVersion`), deterministic, and 100% unit-tested from the spec's rules, including every example in the NACC manual.
- Each item produces `{score, confidence, rationale, evidenceTokenIds}`. If any item's confidence is below its threshold, the administration goes to the **review queue** in `artifacts/review`.
- For semantic judgments (story paraphrase units, abstraction answers, fluency category membership edge cases), you may use an LLM **only as a rubric-constrained adjudicator**: it gets the exact rubric plus the transcript, returns structured JSON with a citation to the transcript span, runs at temperature 0, and its output is logged. It never overrides a deterministic rule.
- Never mutate raw data. Scores are derived records, and re-scoring creates a new score version.
- Store NACC-equivalent field codes where they exist (e.g., C2T Q1e, 3a, 5a…) so we can export to research format.
- **Reason codes** for tests or items not completed (verify against the current NACC key): `95` physical problem · `96` cognitive/behavioral problem · `97` other problem · `98` verbal refusal. Three-digit variants (995–998) apply where the spec uses them (e.g., Oral Trails). `88` = not applicable. `99` = unknown (e.g., delay time unknown).

## 8. Alternate forms and practice effects (Form Engine)
Repeated identical tests inflate scores. Every test supports multiple **parallel forms**.

- A **Form** is an immutable, versioned content bundle: `{formId, testId, version, items, equivalenceMetadata, licensed: boolean}`.
- `Form A` of each test = the canonical NACC content, flagged `licensed: true` and only enabled when `LICENSED_CONTENT=true` (`⟦DECISION D5⟧`). Default forms are Remembrance-original.
- **Equivalence constraints** (per test, defined in each test prompt) are enforced by a **form validator** that runs in CI. A form that fails can't ship.
- **Assignment engine:**
  - Never give a user the same form twice within their last `N−1` administrations (`N` = forms available)
  - Counterbalance the form order across users (Latin-square schedules) so form difficulty doesn't confound time
  - Seeded generation (for procedural tests like Number Span): store the seed, so every administration is reproducible
  - **Session-level lexical collision check:** no stimulus word, foil, cue or example may appear in two tests in the same session, or be a close semantic/phonological neighbor of another test's stimulus. Example of what this catches in the canonical battery: MoCA's "FACE" also appears as a RAVLT recognition foil; MoCA's cue "nose" is a RAVLT List A word; RAVLT List B and MoCA both contain "CHURCH". NACC already swapped CERAD's "church" to "school" for this reason. Log every collision; block it for original forms.
- **Permission-required content is off limits** unless the owner explicitly approves it (decision 2026-10-01): anything build doc §3b lists as needing a license or the author's permission (MoCA, Craft Story 21, official Number Span sequences, the phonemic fluency script, RAVLT, CERAD, VNT), and the NACC manual's own instruction wording ("reproduced by permission"). Keep the paradigm, timing and scoring rules; write Remembrance-original instructions, examples and items. Licensed tests stay registered but switched off (`requiresPermission` in the web registry; `VITE_PERMITTED_TESTS` to enable).
- **Equating:** until a form is equated in a pilot study (linear or equipercentile), tag its scores `equated: false`. The Remembrance Score uses within-person change with a practice-effect-adjusted Reliable Change Index, not raw differences.
- Also treat the **first administration as a procedural-familiarity baseline** (procedure learning is a practice effect even with new items). Keep an `administrationNumber` field for every test.

## 9. Design system
**The full design language lives in [design/DESIGN_LANGUAGE.md](design/DESIGN_LANGUAGE.md)** (Oura × Apple Watch, older-adult-first; §7 "As built" says where everything is). Before/after evidence for every screen: `design/rollout/<screen>/README.md`.

**In short:**
- **Themes:** dark navy by default (following the device), cream light mode. Tokens: `lib/ui/src/theme.css` + `theme.ts` (`ds-` classes), app components in `lib/ui/src/components/app.tsx`, stories via `pnpm --filter @workspace/ui ladle`. The Clarity tokens (`tokens.css`, `rm-*`) still style the assessment screens and are remapped per theme inside `.ds-root`. Cyan `#1BCEDF` is light (rings, glow, the orb, dark-mode primary), never body text on cream.
- **The floor, enforced by tests:**
  - body text 20 px, all sizes in rem, readable at 200%
  - text contrast 7:1 (labels 4.5:1, graphics 3:1)
  - targets ≥ 56 px (64 px for primary actions and every protocol-screen target)
  - one tap only (no sliders, drags, swipes or long-press)
  - status = word + icon + shape, never color alone
  - no icons without text
  - reduced motion respected (device or Settings)
  - Checks: `lib/ui/src/theme.test.ts` (contrast), `lib/ui/src/no-hardcoded.test.ts` (no hard-coded colors or sizes), `scripts/src/screenshot-rollout.mjs` (axe-core, targets, overflow, cut-off text, in both themes at 390/1280 px and 100/200%).
- **One primary action per screen.** Plain-language labels. Back is always top-left and labeled.
- **Captions** of examiner **instructions** are on by default (Settings can turn them off), never of stimuli. Volume and "repeat instructions" only where the spec allows repetition. There's no voice-speed control: one standard pace keeps results comparable.
- **Assessment components** (`lib/ui`, Firewall rules in §4 apply):
  - `ListeningOrb`: breathes while the examiner speaks, ripples with the participant's voice amplitude while listening, and says nothing about correctness
  - `ExaminerCaption`
  - `ProgressRail`: test N of M, never item-level progress inside a protocol state
  - `TapPad` and `DoneButton`: identical feedback on every tap
  - `MicCheck`, `HearingCheck`, `EnvironmentCheck`, `ConsentCard`
  - `PracticeCard`
  - `BreakCard` / `DelayActivity` (§10)
  - `InterruptionSheet`
  - `SessionComplete`: no per-test scores during the session; results appear only after the last activity (DEVIATIONS P-11)
- **Voice and tone:** warm, respectful, adult. "Take your time." Never "Wrong," "Try harder," or anything evaluative. Scores are wellness measures, never diagnostic, and sample data is always labeled.

## 10. Delay intervals are a UX opportunity
Several tests need timed delays (Craft Story 20 min, RAVLT 20–30 min, CERAD 5 min, MoCA ~5 min). The battery order fills most of this with other tests. When extra filler is needed, the spec requires **"tasks that do not involve verbal encoding."** Allowed chrome-zone fillers: guided breathing with a visual pacer, a brief stretch, non-verbal questionnaires (e.g., sleep/mood sliders), a calm visual scene. **No words to remember, no reading passages, no verbal games.** The Craft Story delayed test says specifically: "if 20 minutes have not elapsed, do not add other tests to fill the interval." Use a neutral pause activity there.

## 11. Interruptions, failures, edge cases (handle everywhere)
- **Interruption** (call drop, app backgrounded, someone walks in): pause at the next safe boundary. Each test spec defines whether a trial can resume, must restart, or is invalidated with a reason code. Delayed-recall clocks keep running, and actual elapsed time is recorded.
- **Page visibility / focus loss** during encoding or recall is logged as a validity flag.
- **ASR outage:** keep recording audio, mark the administration `needsReview`, and never block the participant.
- **Participant asks a question mid-test:** only the spec-approved reply is available (e.g., Craft Delayed: "Please tell me as much as you remember about the story").
- **Distress signals** (crying, "I can't do this," repeated refusals): offer a scripted pause, allow graceful exit with reason code 96/98, and never push.

## 12. Validity flags (the self-administered stand-in for the examiner's validity rating)
Automatically compute per session and per test: background noise level, second-voice detection (diarization), focus-loss events, interruptions, hearing-check result, abnormally long silences, network jitter on the phone channel. Also collect the participant's self-report at the end ("Were you interrupted? Did anyone help? Did you write anything down?"). Map everything to NACC's validity categories: 1 Hearing impairment, 2 Distractions, 3 Interruptions, 4 Lack of effort/disinterest, 5 Fatigue, 6 Emotional issues, 7 Unapproved assistance, 8 Other. Produce an overall rating: 1 Very valid · 2 Questionably valid · 3 Invalid.

## 13. Data model (minimum)
Implemented as Drizzle tables in `lib/db`.
```ts
Session { id, userId, channel: 'web'|'phone', startedAt, endedAt, batteryId, validity: ValidityRating, flags: ValidityFlag[] }
TestAdministration { id, sessionId, testId, formId, formVersion, seed?, administrationNumber, specVersion, engineVersion, status: 'complete'|'partial'|'not_administered', reasonCode?: 95|96|97|98|995|996|997|998, startedAt, endedAt }
Trial { id, administrationId, trialKey, startedAt, endedAt }
StimulusEvent { trialId, token, clipId, scheduledOnsetMs, actualOnsetMs }
ResponseWindow { trialId, openedAt, closedAt, closeReason: 'timeout'|'participant_done'|'silence'|'discontinue', audioUri, asrTokens: AsrToken[] }
PromptEvent { trialId, promptKey, reason, at }
ItemScore { administrationId, itemKey, value, confidence, rationale, evidenceTokenIds, scorer: 'auto'|'llm'|'human', scorerVersion }
TestScore { administrationId, fields: Record<NaccFieldCode|string, number|null>, scorerVersion, equated: boolean }
```

## 14. Definition of Done (every test)
1. `lib/test-spec` entry with verbatim scripts, timing, rules and a spec version
2. XState machine with every state tagged by zone, and a visualized statechart committed as an SVG
3. Scorer with unit tests covering **every rule and every example** in the source spec, plus adversarial edge cases
4. At least 3 original parallel forms (or a generator) passing the form validator; Form A behind the license flag
5. Web UI: Playwright screenshots of every state at 390 px and 1280 px, in light mode, with reduced motion on and off. Self-critique pass against §9 with fixes applied
6. Phone channel: the same machine runs in the Twilio runner (a simulated call test is enough)
7. Timing test: an automated check that stimulus onsets stay within ±50 ms of spec
8. Firewall test: an automated check that no stimulus token ever appears in the DOM during the protocol zone, and that the UI state is identical for correct vs incorrect vs silent responses
9. Interruption test for at least one mid-trial interruption path
10. A `README.md` inside the test folder listing spec source pages, every deviation from the paper protocol (for example, tapping the screen instead of the phone), and why

## 15. How you work
- Before coding a test, restate the spec back as a state list and a scoring rule list. Flag any ambiguity or contradiction and propose a default. Don't guess silently.
- Write scoring tests before scorers.
- After building UI, screenshot, critique, and iterate at least twice before calling it done.
- Keep `DEVIATIONS.md` at the repo root up to date: every place our digital protocol differs from the paper one, with the rationale.
- Ask before adding dependencies, changing the stack, or relaxing anything in §4.
- Honesty: never present a score as validated clinical measurement. Wellness and monitoring framing only; no diagnostic claims.
