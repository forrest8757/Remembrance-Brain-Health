# Remembrance Cognitive Test Suite: Claude Code Build Prompts

> Text copy of [Remembrance_Test_Build_Prompts.pdf](./Remembrance_Test_Build_Prompts.pdf) (the source of truth if the two ever differ). Section 4, the master prompt, lives at the repo root as [CLAUDE.md](../CLAUDE.md), adapted to this repo; see [DEVIATIONS.md](../DEVIATIONS.md) for the adaptations.

**Source spec:** NACC UDSv4 T-Cog Neuropsychological Battery Instructions (Form C2T), Jan 2025 (revisions through 2025-12-10)
**Built for:** Remembrance Health (React/TypeScript · Node.js · PostgreSQL · Twilio · ElevenLabs · Canary Speech)
**Brand:** Navy `#1E3A5F` · Cyan `#1BCEDF` · Cream `#F5F1EA`

---

## 0. How to use this file

1. Save **Section 4 (MASTER PROMPT)** as `CLAUDE.md` at the repo root. Claude Code loads it automatically in every session, so every test build inherits the rules, the architecture and the design system.
2. Build in this order: **P0 Foundation → P1 Session Shell → the tests you pick (T1–T9) → P2 Battery Orchestrator → P3 Review Console**
3. Run one prompt per Claude Code session. Start each one in **plan mode** (Shift+Tab twice). Review the plan, then let it execute.
4. Resolve every `⟦DECISION⟧` marker before you paste a prompt. Section 2 lists all of them.
5. Each test prompt sits between `▶ BEGIN PROMPT` and `◀ END PROMPT`. Copy everything between the markers.

---

## 1. How to prompt Claude Code for top-tier UI/UX and interactivity

1. **Spec beats vibes.** Claude Code is very good at meeting explicit acceptance criteria and only average at guessing taste. Every prompt ends with a Definition of Done.
2. **Split protocol from chrome.** Your tests have a tension: they have to be standardized exactly, and you also want them to be delightful. The fix is two zones:
   - **Protocol zone** (stimulus presentation plus the response window). This is locked down: verbatim scripts, fixed pacing, no feedback on correctness, no extra visuals.
   - **Chrome zone** (onboarding, mic check, practice, transitions, breaks, delay-interval fillers, completion). Go all out here: animation, warmth, progress, micro-interactions. The master prompt calls this split the **Standardization Firewall**.
3. **Design system first, screens second.** Make it build tokens and components, then compose screens from them. Ban hard-coded colors and sizes.
4. **Ask for divergence before convergence.** "Give me 3 visually distinct directions as static screens, then stop." Pick one and let it build.
5. **Close the visual loop.** Tell it to run Playwright, screenshot every state at 390px and 1280px, critique the screenshots against a rubric, fix what it finds, and repeat. Claude Code can see the images.
6. **Name references.** For example: "Calm like Headspace, data clarity like Apple Health, celebration energy like Duolingo, but only in the chrome zone."
7. **Write the scoring tests first.** Have it turn the scoring rules into unit tests before it writes the scorer. For clinical logic, tests are your insurance policy.
8. **Use reviewer subagents.** "Spawn a subagent to audit this implementation line-by-line against the spec in this prompt and list every deviation."
9. **Say what it must NOT do.** Negative constraints ("never show the word list on screen") prevent the most expensive mistakes.
10. **Keep sessions small and commit after each green step.** Large sessions drift.

---

## 2. Test catalog and decision matrix

**Domain key:** these map onto a five-domain model. Remap them to Remembrance's official five if yours differ. `MEM` Episodic Memory · `ATT` Attention & Working Memory · `EXE` Executive Function (incl. processing speed / set-shifting) · `LANG` Language · `ORI` Orientation

> ⚠️ **Coverage gap:** this telephone battery has **no visuospatial measure**. NACC removed Benson Figure, Trails and MINT because they need visual stimuli. If visuospatial is one of your five domains, you'll need a separate app-native task, which is out of scope for this doc.

### 2a. Grouped by domain

| Domain | Tests that measure it (primary ●, secondary ○) |
|---|---|
| **MULTI-DOMAIN** | T1 MoCA-Blind (● ATT, MEM, LANG, EXE, ORI) |
| **MEM** | ● T2 Craft Story (Imm + Del) · ● T4 RAVLT (Imm, Del, Recog) · ● T5 CERAD (Imm, Del, Recog) · ○ T9 VNT (semantic retrieval) |
| **ATT** | ● T3 Number Span Forward · ● T3 Number Span Backward · ○ T8 Oral Trails A · ○ T4 RAVLT Trial 1 (immediate span) |
| **EXE** | ● T8 Oral Trails B · ● T7 Phonemic Fluency · ○ T3 Number Span Backward · ○ T6 Category Fluency · ○ T4 RAVLT List B (interference) |
| **LANG** | ● T6 Category Fluency · ● T9 Verbal Naming Test · ○ T7 Phonemic Fluency |
| **ORI** | ● T1 MoCA-Blind orientation items (no standalone orientation test in battery) |

### 2b. Full matrix

| ID | Test | Domain(s) | Time | NACC status | Self-admin / voice feasibility | Alternate-form strategy | Practice-effect risk | License risk |
|---|---|---|---|---|---|---|---|---|
| T1 | MoCA-Blind | ATT · MEM · LANG · EXE · ORI | 5–10 min | Core | High (vigilance tap needs a UI or mic-tap solution) | Parallel item sets per subtest (word set, digits, letter string, sentences, abstraction pairs, serial start) | High (short, fixed items) | **HIGH**: trademark, license and training required |
| T2a | Craft Story 21 Immediate | MEM | 5 min | Core | High (needs good ASR plus semantic scoring) | Original parallel stories, 44 verbatim bits / 25 paraphrase units each | Very high (story is memorable) | **HIGH**: author permission required |
| T2b | Craft Story 21 Delayed | MEM | 2 min | Core | High | Tied to T2a form | (tied) | (tied) |
| T3a | Number Span Forward | ATT | ~2.5 min | Core | Very high (digits are easy for ASR) | **Procedural generation**, effectively unlimited forms | Low with generation | Medium: author permission for official sequences only |
| T3b | Number Span Backward | ATT · EXE | ~2.5 min | Core | Very high | Procedural generation | Low with generation | Medium |
| T4a | RAVLT Immediate (A1–5, B, A6) | MEM (○ ATT, EXE) | 7 min | Core (choose RAVLT **or** CERAD) | High | Matched 15-word parallel lists (A/B pairs + recognition foils) | High | **HIGH**: published by WPS |
| T4b | RAVLT Delayed + Recognition | MEM | 2 min | Optional | High | Tied to T4a form | (tied) | (tied) |
| T5a | CERAD Word List Immediate (J4) | MEM | 5 min | Core (alt. to RAVLT) | High | Matched 10-word lists × 3 orderings + 10 foils | High | **HIGH**: CERAD/Duke license |
| T5b | CERAD Delayed Recall + Recognition (J6/J7) | MEM | 5 min | Core (alt.) | High | Tied to T5a | (tied) | (tied) |
| T6 | Category Fluency (Animals, Vegetables) | LANG (○ EXE) | 5 min | Core | Very high | Rotate matched category pairs | Moderate | Low (paradigm is public domain) |
| T7 | Phonemic Fluency (F, L) | EXE · LANG | 5 min | Core | Very high | Rotate matched letter pairs | Moderate | Low–Med (paradigm public; script by permission) |
| T8a | Oral Trail Making A | ATT (processing speed) | ~2 min | Optional | Very high | Few real alternates (counting is fixed). Use alt ranges only after equating | Low–Moderate | Low |
| T8b | Oral Trail Making B | EXE (set-shifting) | ~3 min | Optional | High | Alternate start points / ranges, equated | Moderate | Low |
| T9 | Verbal Naming Test (50 items) | LANG (○ MEM) | 10 min | Optional | High | Item bank split into difficulty-matched forms | Moderate–High | Medium: contact author |

**Count:** 13 administrable line items plus the pre-test hearing/environment screen. Immediate/delayed pairs share one build prompt because they share state, forms and timing.

### 2c. Suggested lean B2C battery (a starting point; your call)

About 25 minutes, all five domains, low license exposure if you use original forms: **T1 MoCA-Blind subtests (rebuilt with original items) → T2 Story Recall (original stories) → T3 Number Span F/B → T6 Category Fluency → T8 Oral Trails A/B → T7 Phonemic Fluency → T2b Story Delayed**

---

## 3. Decisions to make before building (`⟦DECISION⟧` markers)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Which tests ship | Any subset of T1–T9 | See 2c |
| D2 | Verbal learning test | RAVLT (15 words, 5 trials, interference) **or** CERAD (10 words, 3 trials, shorter) | CERAD for B2C length; RAVLT for richer data |
| D3 | Channel | Web/app only · Phone (Twilio) only · Both from one engine | **Both.** The battery was designed for phone, and the engine is channel-agnostic |
| D4 | Scoring | Fully automated · Auto + human review queue for low confidence | Auto + review queue (required for anything clinical) |
| D5 | Content | Canonical NACC items (licensed) · Remembrance-original parallel forms · Both behind a flag | Original forms by default, canonical behind a `licensedContent` flag |
| D6 | Visible timer during 60-s fluency / trails | Hidden · subtle ambient ring · numeric countdown | Hidden or ambient ring. Numeric countdowns change behavior |
| D7 | RAVLT presentation rate | 1 word/sec (admin page 27) · 1 word per 1.5–2 sec (TOC, phone-adapted) | **The source document contradicts itself.** Pick one, lock it, log it |
| D8 | MoCA orientation "place" for at-home users | Home address · "What city/town are you in?" · Name of the program ("Remembrance") | Define it and keep it fixed forever |
| D9 | Retest cadence | Weekly · Monthly · Quarterly | Drives the number of forms you need (see Master §8) |
| D10 | Education adjustment (MoCA +1 if ≤12 yrs) | Collect years of education at signup · skip | Collect at signup |
| D11 | MoCA vigilance response | Tap the screen · tap the phone mic (per NACC) · say "yes" | Screen tap in the app; mic-tap onset detection on phone |
| D12 | Session structure | One sitting · MoCA 1–7 days before the rest (NACC allows) | Split for B2C stamina |
| D13 | Examiner voice | One ElevenLabs voice for everything · user-selectable | One fixed voice. Changing voice is a confound |
| D14 | Cues and practice feedback | Standard only | Standard only; not negotiable for validity |

## 3b. Licensing and validity (read before shipping; I'm not a lawyer, so confirm with counsel)

- **This NACC manual itself** says most instruments are "reproduced by permission… do not copy or distribute without author's permission."
- **MoCA** is a registered trademark. Use generally requires a license agreement, and examiners need training/certification. Digital commercial use typically needs a direct agreement with MoCA Cognition. Treat this as the highest-risk item.
- **Craft Story 21** (Suzanne Craft, PhD), **Number Span official sequences** (Joel Kramer, PsyD), **phonemic fluency script** (Argye Hillis, MD), **RAVLT** (published by WPS), **CERAD** (Duke), **VNT** (Brian Yochim, PhD): each needs permission for commercial use.
- **Paradigms aren't copyrightable the way item content is.** "Repeat digits," "name animals in 60 seconds," "learn a word list across trials" are generic methods. **Building Remembrance-original parallel forms solves licensing and practice effects at the same time.** That's why every prompt below has a Form Engine.
- **Validity:** a self-administered, AI-voiced, ASR-scored version is **not the same instrument** as the examiner-administered, validated one. NACC norms don't transfer automatically. You need an equivalence/validation study before you publish normed scores. Until then, use Remembrance-internal baselines and within-person change. Avoid diagnostic claims (FDA SaMD territory). Frame results as wellness and monitoring.

---

## 4. MASTER PROMPT → `CLAUDE.md`

Saved at the repo root as [CLAUDE.md](../CLAUDE.md). The original text (PDF pages 9–17) specifies React 18 and a `packages/` + `apps/` layout; the repo version uses React 19 and `lib/` + `artifacts/` (DEVIATIONS.md P-1, P-2).

---

## 5. Platform prompts (build these first)

### P0: Foundation (design system, engine skeleton, audio scheduler, form engine)

▶ BEGIN PROMPT: P0 Foundation

Read `CLAUDE.md` fully. We're building the foundation every cognitive test will sit on. Don't build any specific test yet.

**Phase 1: Design direction (stop after this for my review)**

1. Produce **three visually distinct design directions** for the assessment experience as static React screens (no logic). Each shows: Welcome, Mic Check, an examiner-speaking state, a participant-listening state (with the ListeningOrb reacting to fake amplitude), a Break screen, and Session Complete. All use the brand palette (Navy #1E3A5F, Cyan #1BCEDF, Cream #F5F1EA) and the §9 accessibility floor.
   - Direction A, "Sanctuary": maximal calm, lots of cream space, the orb as hero, serif display type
   - Direction B, "Clarity": Apple Health–style precision, crisp navy, strong typographic hierarchy
   - Direction C, "Warm Companion": softer shapes, gentle gradients, friendlier illustration
2. Screenshot each at 390 px and 1280 px, put them in `/design/directions/`, and write a one-paragraph rationale per direction. **Stop and wait for me to pick.**

**Phase 2: Design system (after I pick)**

3. Build `packages/ui`: tokens (color with verified contrast ratios, type scale, spacing, radii, elevation, motion durations/easings), then primitives (Button, Card, Stack, Text, Icon+Label), then the assessment components listed in CLAUDE.md §9. Include Storybook (or Ladle) stories for every component state.
4. The **ListeningOrb** is the signature element. Build it with Canvas or SVG plus Framer Motion. States: `idle`, `examinerSpeaking` (slow breathe, synced to the examiner clip envelope), `listening` (ripples driven by live mic RMS, smoothed), `thinking/processing` (subtle), `paused`. It must look **identical** whether the participant is right or wrong, since it reacts only to amplitude. It degrades to a static ring under reduced motion.

**Phase 3: Engine and audio core**

5. `packages/test-spec`: a TypeScript schema (with zod validation) for test definitions: scripts (keyed lines with verbatim text plus clip IDs), stimulus lists, timing params, prompt rules (trigger, max count, text), discontinue rules, scoring config, zone tags, NACC field map.
6. `packages/engine`: a factory that turns a test-spec into an XState v5 machine, plus a `useAdministration()` hook for web and an `IvrAdapter` for Twilio. Build a **toy test** ("Say three colors") to prove the whole pipeline end to end.
7. `packages/audio`: pre-render pipeline (script → ElevenLabs → normalized clips → manifest), a Web Audio scheduler with onset logging, and a test proving ±50 ms onset accuracy across a 15-token list at 1.0 s and 2.0 s rates.
8. `packages/capture` + `packages/asr`: mic capture, VAD with configurable silence thresholds (emits `silence:5s`, `silence:15s`), the AsrProvider interface with a mock provider (reads fixture transcripts with timestamps) and one real adapter.
9. `packages/forms`: form schema, validator runner (CI), assignment engine (no-repeat window, Latin-square counterbalancing, seeds), and the session-level lexical collision checker (exact match plus lemma plus a configurable semantic-similarity threshold using embeddings).
10. `packages/scoring`: the scorer interface, the confidence model, and review-queue emission.

**Definition of Done:** the toy test runs end to end on web and in a simulated Twilio call. Storybook shows every component. Onset timing tests pass. The form validator runs in CI. Screenshots pass a self-critique against CLAUDE.md §9.

◀ END PROMPT: P0

### P1: Session Shell (pre-test screening, consent, environment, validity)

▶ BEGIN PROMPT: P1 Session Shell

Read `CLAUDE.md`. Build the **Session Shell** that wraps every battery: everything before the first test and after the last one. This follows NACC C2T pages 7–12. Chrome zone except where noted.

**Flow**

1. **Welcome and identity.** Greet by first name. Confirm identity (name plus date of birth) per NACC practice.
2. **Interruption plan.** Tell the participant what happens if the call or app drops. App: "We'll save your place, and you can pick up where you left off." Phone: "If we get disconnected, we'll call you right back."
3. **Device setup.** Help them find a comfortable setup: speaker vs earbuds, phone near their mouth. Show a live `MicCheck` using the ListeningOrb. Require a clean signal before continuing.
4. **Hearing screen** (verbatim; audio via the examiner voice):
   - "Before we begin, I have a few questions about your hearing to make sure you can hear me well enough." (Adapt "over the telephone" to the channel and log the adaptation.)
   - "Do you usually have trouble hearing over the phone?" (Yes/No)
   - "Can you hear me well enough?" (Yes/No)
   - "Do you use a hearing device?" → If YES: "Is it in place?" → If NO: "Would you please put it on?"
   - Repetition task: **"Would you please repeat the following statement: 'I have a cat, so all I need is a dog.'"** Score it by ASR exact match (normalized).
   - If it fails, repeat once: **"I have a cat, so all I need is a dog."**
   - If it passes, proceed. If it fails twice: offer a volume boost plus earbuds guidance and retry once in the chrome zone (log this as a deviation). If it still fails, end gracefully with a warm adaptation of NACC's script: "Thank you very much, [Name], but you may not be able to hear me well enough to complete the memory tasks right now, so we won't continue at this time. Thank you for taking time with us today." Offer a reschedule and set validity flag 1.
5. **Environment check** (verbatim questions, big Yes/No buttons plus voice answers). Set the minutes from the selected battery: core 30 / core + word list 45 / core + all optional 60.
   - "Are you in a quiet place where you will not be disturbed for about ___ minutes?"
   - "Do you have pets that need to be taken care of before we begin?" → YES: offer a "Take your time, tap when ready" pause
   - "Other than the device you are using, do you have a cell phone, TV, radio, or computer turned on in front of you?" → YES: "Can you turn them off so they won't distract you while we're working together?"
   - "Do you have anyone nearby?" → YES: "Can you please ask them to move to another room, as we don't want you distracted." (A caregiver may help with setup and must then leave. Offer a "Caregiver setup mode" that hands off with a clear "Please leave the room now" screen.)
   - "Do you need to use the bathroom or get a drink of water?" → YES: pause
   - "These tasks should only be done in your head. Do you have any pencils, pens, or paper in front of you now?" → YES: "I need you to remove them since we'll only be talking for these tasks."
   - "Do you have any calendars or newspapers in sight or a watch with a date feature?" → YES: "I need you to put them out of sight for me."
6. **Recording consent.** Present the NACC recording-consent language, adapted for Remembrance's consent documents (`⟦legal review⟧`). This is a hard gate: no recording, no automated scoring. Provide a no-recording path only if the product supports manual scoring; otherwise end politely.
7. **Integrity statement** (optional, `⟦DECISION⟧`): "These tests have built-in indicators that help us know whether you provide answers in accordance with testing rules and guidelines — that is, that you not write things down or use other aids…" Softer B2C wording is allowed in the chrome zone, but log the version used.
8. **Rapport and orientation** (verbatim): **"I am going to ask you to complete some memory and thinking tests. Some of the questions I ask you may be very easy and some of the questions are very hard. No one gets everything correct, I just want you to try the best you can on these tests. Do you have any questions?"** → "Good, [Name], I think we are ready to get started. Are you ready?"
9. → Hand off to the Battery Orchestrator (P2).
10. **Post-battery.** Ask self-report validity questions: interruptions, help from others, writing things down, fatigue, how they felt. Compute the auto validity rating (CLAUDE.md §12). Show the warm `SessionComplete`: thank them, confirm when results will be ready, and show a streak/consistency acknowledgment (no scores).

**Interactivity to nail**

- Environment check as a calm "getting your space ready" checklist that ticks off with satisfying but gentle motion.
- Hearing check as a friendly sound-level moment. The orb shows that their repeat was heard.
- The whole shell under 3 minutes for a returning user. Skip already-confirmed setup, but **always** re-run the hearing repetition and the environment check.

**Definition of Done:** CLAUDE.md §14 items that apply, plus Playwright flows for: happy path, hearing fail → graceful exit, caregiver setup → handoff, consent declined.

◀ END PROMPT: P1

### P2: Battery Orchestrator (order, delays, timers across tests)

▶ BEGIN PROMPT: P2 Battery Orchestrator

Read `CLAUDE.md`. Build the orchestrator that sequences tests into a battery and manages **cross-test timing dependencies**. Build it after at least two tests exist; add the rest as they land.

**Canonical NACC orders** (encode both as battery presets; `⟦DECISION D2⟧` picks one):

- **Table 1 (RAVLT):** 1 MoCA-Blind → 2 Craft Story Immediate → 3 Number Span F&B → 4 RAVLT Immediate → 5 Category Fluency (Animals, Vegetables) → 6 Oral Trails (opt.) → 7 Craft Story Delayed → 8 Phonemic Fluency F&L → 9 non-interfering questionnaires (to meet the RAVLT delay) → 10 RAVLT Delayed Recall & Recognition → 11 Verbal Naming Test (opt.)
- **Table 2 (CERAD):** 1 MoCA-Blind → 2 Craft Story Immediate → 3 Number Span F&B → 4 CERAD Immediate → 5 Category Fluency → 6 CERAD Delayed → 7 Oral Trails (opt.) → 8 Craft Story Delayed → 9 Phonemic Fluency F&L → 10 Verbal Naming Test (opt.)
- Custom batteries (for example the lean B2C battery) are allowed, but the orchestrator must **validate** them: every delayed test comes after its immediate partner, delay windows are satisfiable, and there are no lexical collisions.

**Delay manager**

- Timers start at the spec-defined moments: Craft delay starts when the immediate recall ends (record the time). RAVLT delay starts after Trial 6 recall (per the 2025-02-03 revision). CERAD delay starts after J4 Trial 3 recall.
- Windows: Craft ≈ 20 min (record actual minutes; 99 = unknown). RAVLT 20–30 min. CERAD ≥ 5 min.
- If the next delayed test comes due early, insert **allowed filler only**: non-verbal chrome activities (CLAUDE.md §10). For Craft Delayed specifically: **don't add other tests to fill the interval**; use a neutral pause.
- If a window is about to be exceeded (e.g., RAVLT > 30 min because of an interruption), administer the test immediately and flag it. Never silently drop it.
- Show the participant only a gentle "Next up" card. Never reveal that a delayed recall is coming beyond the scripted "Later on, I will ask you…" lines.

**Session splitting** (`⟦DECISION D12⟧`): MoCA-Blind may run 1–7 days before the rest. Support a two-visit battery with a reminder notification between visits.

**Progress and pacing UX:** a ProgressRail of test N of M; micro-breaks offered between (not within) tests; an estimated time remaining shown only in the chrome zone.

**Resilience:** full session state is persisted after every event. Resume works across device refresh (web) and callback (phone). Resuming re-validates the delay windows.

**Definition of Done:** simulated full-battery runs for both presets with fake-time acceleration; tests proving delay windows, filler rules, interruption → resume, and window-overrun flagging.

◀ END PROMPT: P2

### P3: Review Console (human-in-the-loop scoring and QA)

▶ BEGIN PROMPT: P3 Review Console

Read `CLAUDE.md`. Build `apps/review`, the clinician/QA console for adjudicating low-confidence scores.

- Queue of administrations flagged `needsReview`, sortable by test, age and confidence
- Per-administration view: audio waveform with ASR tokens overlaid (click a token to seek), the auto-score per item with its rationale and evidence spans highlighted, the rubric for that item shown inline (e.g., the Craft Story paraphrase table), accept/override per item with a required reason, and a final sign-off
- Every override creates a new score version (`scorer: 'human'`), is audit-logged, and feeds a "disagreement dataset" for improving the auto-scorer
- Inter-rater mode: double-score a random 10% blind, then report agreement (κ / ICC) per test
- Examiner-style validity override (1/2/3 + categories)
- Export: NACC C2T field-coded CSV per session

◀ END PROMPT: P3

---

## 6. Test build prompts

Every test prompt has the same structure: **Domains → Spec (verbatim) → State machine → Scoring → Alternate forms → UX/Interactivity → Edge cases → Definition of Done.**

### T1: MoCA-Blind · MULTI-DOMAIN (ATT · MEM · LANG · EXE · ORI)

*Source: C2T pp. 14–18 · Core · 5–10 min · Max 22 (≥18 considered normal, a suggestive and not-yet-validated cutoff)*

▶ BEGIN PROMPT: T1 MoCA-Blind

Read `CLAUDE.md`. Build **T1 MoCA-Blind**: the 30-item MoCA adapted for telephone / low vision, with the visual items removed. It's a composite of 7 subtests. Build each subtest as its own child machine so we can also score and report at the domain level.

> ⚠️ Licensing: MoCA is trademarked. Canonical content (Form A) must be gated behind `LICENSED_CONTENT`. Default forms are Remembrance-original parallel items. `⟦DECISION D5⟧`

#### Domain mapping (for Remembrance domain scores)

| Subtest | Domain | Points |
|---|---|---|
| Memory registration (2 trials) | MEM (encoding) | 0 (not scored) |
| Digits forward / backward | ATT | 2 |
| Vigilance (letter A tapping) | ATT | 1 |
| Serial 7s | ATT / EXE | 3 |
| Sentence repetition | LANG | 2 |
| Letter fluency | LANG / EXE | 1 |
| Abstraction | EXE | 2 |
| Delayed recall (uncued) | MEM | 5 |
| Orientation | ORI | 6 |
| **Total** | | **22** |

#### Global rules

- The examiner may repeat each item's **instructions** once if the participant asks. `⟦Ambiguity: the source says "repeat each item once, if asked." Stimulus lists such as digits and letters must NOT be re-presented, since that would invalidate the item. Implement instruction-repeat only, one time, and log it.⟧`
- **Phone-adapted rates** (source p.15): words at **1 per 1.5–2 s** (not 1/s); vigilance letters at **≥1 per 2 s**. Use these rates on **both** channels so there's a single standard. Log the deviation from the in-person MoCA.
- May be administered 1–7 days before the rest of the battery (`⟦DECISION D12⟧`).

#### 1. Memory (registration, not scored)

- SAY: **"This is a memory test. I am going to read a list of words that you will have to remember now and later on. Listen carefully. When I am through, tell me as many words as you can remember. It doesn't matter in what order you say them."**
- Present the 5 words (Form A: **FACE, VELVET, CHURCH, DAISY, RED**) at 1 per 1.5–2 s.
- Open the response window. Mark each word recalled (trial 1). Close when the participant indicates they're finished (voice "done", DoneButton) or after the silence rule `⟦propose: 10 s silence after last word⟧`.
- SAY: **"I am going to read the same list for a second time. Try to remember and tell me as many words as you can, including words you said the first time."** Re-present and record trial 2. **Always do 2 trials, even if trial 1 is perfect.**
- SAY: **"I will ask you to recall those words again at the end of the test."**
- Misheard-word rule: if the participant says a similar-sounding word (e.g., "vase" for "face"), **enunciate that word more clearly during trial 2**. That means a pre-rendered "emphasized" clip variant for each stimulus word. If the same misheard word recurs, record it. On delayed recall, credit the misheard word as correct. If they don't produce it, give the cues for the **original** word.
- Start the MoCA delayed-recall timer (~5 min, filled by the subtests below).

#### 2. Attention

- **Forward digits:** SAY **"I am going to say some numbers and when I am through, repeat them to me exactly as I said them."** Present 5 digits at 1/s (Form A: **2 1 8 5 4**).
- **Backward digits:** SAY **"Now I am going to say some more numbers, but when I am through you must repeat them to me in the backwards order."** Present 3 digits at 1/s (Form A: **7 4 2**, correct = **2 4 7**).
- **Vigilance:** SAY **"I am going to read a sequence of letters. Every time I say the letter A, tap your hand once. If I say a different letter, do not tap your hand."**
  - Digital adaptation (`⟦DECISION D11⟧`): web → tap the giant `TapPad`; phone → tap the microphone/mouthpiece, detected by transient onset in the audio. **Before the trial, run a tap check** ("tap once now") and confirm it was detected (NACC does this on the phone).
  - Present letters at ≥1 per 2 s. Form A: **F B A C M N A A J K L B A F A K D E A A A J A M O F A A B** (29 letters, 11 targets).
  - Attribution window for letter *i* = [onset *i*, onset *i+1*). A tap in an A window = hit. A tap in a non-A window = commission error. No tap in an A window = omission error. Multiple taps in one window count as one response (flag it).
  - TapPad feedback must be **identical** for every tap (the same soft pulse), whether hit or error.
- **Serial 7s:** SAY **"Now I will ask you to count by subtracting seven from 100, and then, keep subtracting seven from your answer until I tell you to stop."** Give the instructions twice if necessary. Stop after 5 responses. Form A correct chain: **93, 86, 79, 72, 65**.

#### 3. Sentence repetition

- SAY **"I am going to read you a sentence. Repeat it after me, exactly as I say it [pause]: I only know that John is the one to help today."**
- Then **"Now I am going to read you another sentence. Repeat it after me, exactly as I say it [pause]: The cat always hid under the couch when dogs were in the room."**

#### 4. Verbal fluency (letter)

- SAY **"Tell me as many words as you can think of that begin with a certain letter of the alphabet that I will tell you in a moment. You can say any kind of word you want, except for proper nouns (like Bob or Boston), numbers, or words that begin with the same sound but have a different suffix, for example, love, lover, loving. I will tell you to stop after one minute. Are you ready?"** [Pause] **"Now, tell me as many words as you can think of that begin with the letter F."** Phone adaptation: add **"The letter F, like fox."** [60 s] **"Stop."**
- Must be administered even if T7 (Phonemic Fluency F/L) comes later in the battery (NACC requirement). For original forms, choose a letter that doesn't collide with this session's T7 letters.

#### 5. Abstraction

- Practice: **"Tell me how an orange and a banana are alike."** If the answer is concrete, say once: **"Tell me another way in which those items are alike."** If the answer still isn't "fruit": **"Yes, and they are also both fruit."** No other clarification.
- **"Now, tell me how a train and a bicycle are alike."** → then **"Now tell me how a ruler and a watch are alike."** No further instructions or prompts.

#### 6. Delayed recall

- SAY **"I read some words to you earlier, which I asked you to remember. Tell me as many of those words as you can remember."**
- Free recall → mark each word.
- For each word not recalled: give its **category cue** → mark. For each word still not recalled: give **multiple choice**: **"Which of the following words do you think it was, NOSE, FACE, or HAND?"**
- Form A cues:

| Word | Category cue | Multiple choice |
|---|---|---|
| FACE | part of the body | nose, face, hand |
| VELVET | type of fabric | denim, cotton, velvet |
| CHURCH | type of building | church, school, hospital |
| DAISY | type of flower | rose, daisy, tulip |
| RED | a color | red, blue, green |

#### 7. Orientation

- SAY **"Tell me the date today."** If incomplete, prompt for the missing parts: **"Tell me the [year, month, exact date, and day of the week]."** Then **"Now, tell me the name of this place, and which city it is in."**
- Place (`⟦DECISION D8⟧`): define what counts at home, fix it forever, and document it in DEVIATIONS.md. City = the city where they are / live.

#### Scoring (pure functions, unit-test every line)

- Memory trials: 0 points (store per-word hits per trial for analytics).
- Digits: 1 each for an exact sequence (backward must be the reverse). → C2T **Q1e** (0–2)
- Vigilance: **1 point if ≤1 error** (errors = commissions + omissions). → **Q1f**
- Serial 7s: each subtraction judged **independently** against the participant's previous answer (e.g., "92, 85, 78, 71, 64" = 1 error, 4 correct → 3 pts). 4–5 correct = 3 · 2–3 = 2 · 1 = 1 · 0 = 0. → **Q1g**
- Sentences: 1 each for an **exact** repetition. Omissions ("only," "always"), substitutions/additions ("John is the one who helped today," "hides" for "hid"), and plural changes are errors. → **Q1h** (0–2)
  - ⚠️ **ASR auto-correction hazard.** ASR language models "fix" grammar. Use the most verbatim ASR mode available. Any token with confidence below threshold → review queue.
- Fluency: 1 point if **≥11** valid words in 60 s (reuse T7's phonemic scoring rules for validity). → **Q1i**
- Abstraction: only the 2 test pairs are scored. Accept: train–bicycle = "means of transportation," "means of traveling," "you take trips in both"; ruler–watch = "measuring instruments," "used to measure." Reject: "they have wheels," "they have numbers." Use a rubric-constrained LLM adjudicator for novel phrasings, with a review flag when confidence is low. → **Q1j** (0–2)
- Delayed recall: 1 per word recalled **without cues**. → **Q1k** (0–5). Category-cued correct count → **Q1l** (88 if no category cue given). MC-cued correct count → **Q1m** (88 if none given). **Invariant: 1k + 1l + 1m ≤ 5.** If all 5 are free-recalled, 1l = 1m = 88.
- Orientation: 1 each for date, month, year, day, place, city. **Exact.** An error of one day on day or date = 0. Evaluate against the participant's **local** date/timezone at the moment of the response. → **Q1n–1s**
- Total = sum → **Q1d** (uncorrected, max 22). If any scored item (1e–1k, 1n–1s) wasn't administered → total = **88**. Also compute the education-adjusted display score (+1 if ≤12 yrs education, `⟦DECISION D10⟧`), stored separately.
- Also store the MoCA-30 conversion only if you implement the official equation (see mocacognition.com FAQ). Otherwise omit it.

#### Alternate forms (build ≥ 3 originals: Forms B, C, D)

- **Word set:** 5 words, one each from body part / fabric / building / flower / color. Each word: 1–2 syllables, high frequency (SUBTLEX-US Zipf ≥ 4.0 except fabric/flower, where you match Form A's frequency band), concrete, and **phonologically distinct over 8 kHz audio** (no minimal pairs among the five, and none with their MC foils). Each has a category cue plus 3 MC options (the target and 2 same-category foils of matched frequency). No overlap with any other test's items in the session (lexical collision check).
- **Digits:** forward 5, backward 3, generated with constraints: no repeated digit, no ascending/descending run ≥3, no 0, not a date/year pattern.
- **Vigilance string:** 29 letters, 11 A-targets, the **same run structure** as Form A (one triple-A, two double-A runs, 4 singles). Sound-alike lures (J, K) appear exactly twice each, and there are no other letters rhyming with "A" over the phone (avoid H and 8-like sounds). Letters are drawn from Form A's distractor set.
- **Serial 7s:** start values in 80–120 whose 5-step chain has the **same number of borrow operations** as 100 (4 borrows). Otherwise keep 100 fixed and accept the practice effect (`⟦DECISION⟧`).
- **Sentences:** 2 sentences matched to Form A on word count (11 and 13), syllable count ±2, syntactic structure (a relative clause + a subordinate "when" clause), and **error-prone function words** (an "only"-type and an "always"-type adverb, one past-tense irregular verb, one plural).
- **Abstraction:** practice pair + 2 scored pairs, each with a clear superordinate category (transport/measurement difficulty). Each pair ships with its acceptable and unacceptable answer lists.
- **Fluency letter:** from the matched-productivity pool used by T7, never colliding with the session's T7 letters.

#### UX / interactivity

- The MoCA is the first test. It sets the emotional tone, so the orb and the pacing matter most here.
- A brief chrome-zone **"How this works"** card before starting: "You'll hear my voice. Just talk to me naturally. There are no trick questions."
- A subtle **section transition** between subtests (orb shimmer, ~600 ms). No subtest names that telegraph memory ("Now a memory test") beyond the verbatim scripts.
- Vigilance: full-screen TapPad, calm and big. Practice the tap check, then protocol. No visible letters on screen.
- Serial 7s / orientation: purely voice, with an optional big-button "I'm done" fallback.

#### Edge cases

Stops mid-serial-7s ("I'm lost") → score what was produced. Says the date in any format ("the 29th," "Sept 29," "9/29") → normalize. Tapping on the phone channel isn't detectable → offer a voice "yes" fallback, logged as a deviation (it changes the task). Recalls a word from the practice/abstraction content → intrusion (log it, no points). Timezone near midnight.

#### Definition of Done

CLAUDE.md §14, plus: unit tests for every scoring example above (including "92-85-78-71-64" = 3), the 1k+1l+1m invariant, the 88 logic, the vigilance attribution windows, and the misheard-word ("vase") credit path.

◀ END PROMPT: T1

---

### T2: Craft Story 21 Recall (Immediate + Delayed) · MEM

*Source: C2T pp. 19–23, 44–47 · Core · Immediate 5 min + Delayed 2 min (≈20-min delay) · Verbatim /44, Paraphrase /25 (each condition)*

▶ BEGIN PROMPT: T2 Craft Story Recall

Read `CLAUDE.md`. Build **T2a Story Recall – Immediate** and **T2b Story Recall – Delayed** as one test module with two administrations linked by a delay timer (the orchestrator owns the timer; you expose `delayStartedAt`).

> ⚠️ Licensing: Craft Story 21 is reproduced by permission of Suzanne Craft, PhD. Form A is behind `LICENSED_CONTENT`. Default = Remembrance-original stories. `⟦DECISION D5⟧`

#### T2a Immediate: administration (verbatim)

1. Make sure you have the participant's attention (chrome-zone "Ready to listen?" with the orb settling).
2. SAY: **"I am going to read you a story. Listen carefully, and when I am through, I want you to tell me everything you can remember. Try to use the same words I use but you may also use your own words. The story is …"**
3. Read the story **once**, slowly, articulating clearly with normal inflection. **No repetitions permitted.** No text, images or illustrations on screen (a visual would add a second encoding channel).
   - Pre-render the story as **one continuous narrated clip** (natural prosody matters here), with a bit-level timing map (the onset of each of the 44 bits) for analytics.
4. SAY: **"Now tell me the story I just told you. Try to remember as much as you can."**
5. Open the response window. There's no time limit in the spec and **no prompts are specified**, so don't prompt. Close on the participant's "done" (voice or DoneButton) or after `⟦propose: 20 s⟧` of silence, with a gentle chrome-zone "Take your time. Tap 'I'm finished' when you're done." (Log this as a deviation; it's not an examiner prompt.)
   - The NACC examiner line "A little slower, please" exists only for handwriting speed. We record audio, so **don't use it**, and log that in DEVIATIONS.md.
6. SAY: **"Later on, I will ask you to tell me this story again, so try not to forget it."**
7. Record the time the immediate administration ended → `delayStartedAt`.

#### T2b Delayed: administration (verbatim)

- Given ≈20 min after immediate. **If 20 minutes haven't elapsed, don't add other tests to fill the interval.** Use neutral non-test time (CLAUDE.md §10). Record the **actual elapsed minutes**.

1. SAY: **"I read you a story a few minutes ago. Can you tell me what you remember about that story now?"**
2. If the participant doesn't recall the story or having been told one (detect via ASR phrases like "what story," "I don't remember any story," or silence ≥ `⟦propose 10 s⟧`, plus a review flag): SAY **"It was a story about a boy. Can you tell it to me now?"** → cueNeeded = 1.
3. If the participant asks a question about the story or asks for a repeat: SAY **"Please tell me as much as you remember about the story."** (That's the only allowed reply.)
4. Same response-window closing rules as immediate.

#### Form A content (licensed): story with 44 verbatim bits (slashes mark bits)

> Maria's / child / Ricky / played / soccer / every / Monday / at 3:30. / He / liked / going / to the field / behind / their / house / and joining / the game. / One / day, / he / kicked / the ball / so / hard / that it / went / over / the neighbor's / fence / where three / large / dogs / lived. / The dogs' / owner / heard / loud / barking, / came / out, / and helped / them / retrieve / the ball.

Scored content word per bit (44): Maria's · child · Ricky · played · soccer · every · Monday · three thirty · he · liked · going · field · behind · their · house · joining · game · one · day · he · kicked · ball · so · hard · it · went · over · neighbor's · fence · three · large · dogs · lived · dogs' · owner · heard · loud · barking · came · out · helped · them · retrieve · ball

#### Scoring (verbatim and paraphrase are **independent, not additive**; score each separately, for both immediate and delayed)

**Definitions:** *content words* = nouns, adjectives, adverbs, verbs, pronouns, prepositions with semantic load (scored). *Non-content words* = conjunctions, articles, helping verbs, prepositions without semantic load (ignored).

**Verbatim (/44):** 1 point per bit whose content word is recalled **exactly and completely**, anywhere in the recall (order doesn't matter). Allowed: verb variations ("likes" for "liked," "join" for "joining"), minor omissions ("neighbor" for "neighbor's"), number changes ("games" for "game"). → Immediate **C2T Q3a**; Delayed **Q8a** (verify codes against the current C2T form). If not completed, enter reason code 95–98 and leave paraphrase blank.

- Duplicated content words ("he" ×2, "ball" ×2): credit up to the number of distinct occurrences in the recall. `⟦Flag ambiguity for review in the unit-test README⟧`
- "three thirty" ↔ "3:30" ↔ "half past three" (for verbatim, accept only "three thirty"/"3:30" forms, and flag others for review).

**Paraphrase (/25):** 1 point per unit that captures the element, not necessarily in the exact words. A verbatim match also earns the paraphrase point. Rubric (Form A), implemented as a data table and not as code branches:

| # | Unit | General rule | Alternative 1-pt | 0-pt |
|---|---|---|---|---|
| 1 | Maria's | "Maria" or a variant of the name | Mary, Marie | Martha, Anna |
| 2 | child | "child" or a phrase denoting a young person | son, kid, boy, teenager, young man | guy, children, daughter |
| 3 | Ricky | "Ricky" or a variant | Rick, Rich, Richie, Richard, Ricardo | Randy, Rusty, Robert |
| 4 | played | "played" required | to play, plays | did (soccer) |
| 5 | soccer | "soccer" required | futbol | baseball, volleyball, other sport |
| 6 | every Monday | "Monday" or indication it occurred on a weekday | — | every day, another day of the week |
| 7 | at 3:30 | indication the activity was in the afternoon | after school, every afternoon | after dinner, at night, in the morning |
| 8 | he liked going to the field | indication he went to an outdoor area | went outside, went to the yard, going to the backyard | went to the school, gym |
| 9 | behind their house | "house" or word denoting a house | home, residence, where they lived | any other building |
| 10 | and joining | indication he participated in a game | played w/ other kids, became part of the team, playing w/ the team | watching, played in the park |
| 11 | the game | "game" in any context | — | — |
| 12 | One day | "One day" required | — | — |
| 13 | he kicked | indication he performed the activity with his foot | booted, punted | threw, hit (with no mention of the foot) |
| 14 | the ball | "Ball" required | football, soccer ball | baseball, volleyball |
| 15 | so hard | indication that force was used | so much force, so strongly, (kicked it) so far | — |
| 16 | that it went over | "Over" required | — | — |
| 17 | the neighbor's | indication the person lived in the same area | nearby resident | friend's |
| 18 | fence | "fence" or a word denoting a fence of some kind | garden wall, wall | property line, street |
| 19 | where three | "Three" required | three (boys) | — |
| 20 | large dogs lived | indication that dogs were present | hounds, doggies | puppies, cats, kittens, other animals |
| 21 | The dogs' owner | indication the person was responsible for the dogs | neighbor (if owner implied and "neighbor" mentioned twice) | a bystander, the police |
| 22 | heard loud barking | indication the dogs were making noise | yelping, baying, yapping, heard the dogs | saw the dogs running around |
| 23 | came out | word/phrase indicating the owner was present | (owner) saw the ball | his mother came out, the dogs came out |
| 24 | and helped them | word/phrase indicating help was provided | assisted, aided, had to help | — |
| 25 | retrieve the ball | indication they got the ball back | gave him the ball, return the ball, (helped him) get the ball | — |

→ Immediate **Q3b**; Delayed **Q8b**; delay minutes **Q8c** (99 = unknown); cue needed **Q8d** (1 = Yes / 0 = No).

**Paraphrase engine:** deterministic pass first (exact/alternative lists, lemmatized). Then a **rubric-constrained LLM adjudicator** for the remaining units: input = the unit's general rule + the 1-pt and 0-pt examples + the transcript; output = `{unit, awarded, evidenceSpan, confidence}`. Any unit with confidence < 0.85 → review queue. Unit tests must include **every** example in the table as a positive or negative case.

**Derived analytics (not NACC fields):** retention % (delayed/immediate, both scales), intrusions (story elements not in the story), confabulations, serial position of recalled units, speech metrics (§6).

#### Alternate forms (build ≥ 4 originals; this story is highly memorable, so practice effects are strong)

Each original story must match Form A on:

- **Structure:** named adult (possessive) → named child → recurring activity → day → time → a place near home → joining others → "one day" event → object goes somewhere it shouldn't → a place with animals/obstacle → a responsible adult hears a noise → comes out → helps → retrieves the object.
- **Counts:** exactly **44 verbatim bits** and **25 paraphrase units**, with the same distribution of "required-word" units (≈7 of the 25, like "One day," "Over," "Three," "Ball," "soccer," "played") vs "gist" units.
- **Lexical:** word count ±3 of Form A, syllables ±5%, mean content-word Zipf frequency ±0.2, names with 2–3 common variants each (to populate the rubric), no word overlap with other tests' stimuli in the session.
- **Narration:** read duration ±1.5 s of Form A's clip.
- **A full paraphrase rubric per form** (general rule / 1-pt alternatives / 0-pt examples for all 25 units), reviewed by a human before `status: 'approved'`.
- Form validator in CI enforces all counts and metrics.
- Pairing rule: immediate and delayed **always** use the same form in a session.

#### UX / interactivity

- This is the most "cinematic" moment in the protocol, and it's also the moment you must keep visually the emptiest. During narration, the orb breathes with the voice's envelope and nothing else moves. Afterwards, the orb turns to "your turn" with a warm ripple as they speak.
- The Delayed intro should feel natural. No "surprise test!" framing.

#### Edge cases

Retells a different story → intrusions, and score whatever matches. Asks to hear it again → no (immediate) / the approved reply (delayed). Interruption during narration → the immediate is **invalid** (no repetitions permitted): reason code 97, and don't re-administer the same form in this session. Interruption during recall → resume the recall window, with a validity flag.

#### Definition of Done

CLAUDE.md §14, plus unit tests for all 44 verbatim allowances and all 25 × (1-pt + 0-pt) rubric examples; the delay-minutes recording; cue path; and the "no repetition" enforcement.

◀ END PROMPT: T2

---

### T3: Number Span Forward & Backward · ATT (Backward also EXE)

*Source: C2T pp. 24–26 · Core · ~5 min · Scores: total trials correct + longest span, for each direction*

▶ BEGIN PROMPT: T3 Number Span

Read `CLAUDE.md`. Build **T3a Number Span Forward** and **T3b Number Span Backward**. This is our most generator-friendly test: an unlimited number of parallel forms, with practice effects mostly eliminated.

#### Presentation rate

The source doesn't state a digit rate for Number Span. Use **1 digit per second** (the digit-span convention, and the MoCA rate in the same manual). Log it in DEVIATIONS.md. `⟦confirm⟧`

#### T3a Forward: administration (verbatim)

1. SAY: **"I am going to ask you to repeat some numbers for me. Wait until I finish saying the numbers and then repeat them in the same order. For example, if I say 1–8–7, you would say 1–8–7. If I say 2–9–8, what would you say?"**
2. If the answer is wrong: SAY **"Actually, you would say 2–9–8."** (Practice feedback is scripted, so it's allowed here only.)
3. SAY: **"Repeat only the numbers I say each time."**
4. Before **each** item SAY **"Ready?"** Then present the item.
5. Two trials per length. **Discontinue after both trials at the same length are failed.**

Form A forward items (licensed):

| Len | Trial 1 | Trial 2 |
|---|---|---|
| 3 | 1-8-4 | 2-7-9 |
| 4 | 4-1-6-2 | 8-1-9-5 |
| 5 | 6-4-9-2-8 | 7-3-8-6-1 |
| 6 | 3-9-2-4-7-5 | 6-2-8-3-1-9 |
| 7 | 9-6-4-7-1-5-3 | 7-4-9-2-6-8-1 |
| 8 | 4-7-2-5-8-1-3-9 | 2-9-5-7-3-6-1-8 |
| 9 | 6-8-4-1-9-3-5-2-7 | 1-3-9-2-7-5-8-6-4 |

#### T3b Backward: administration (verbatim)

1. SAY: **"I am now going to ask you to repeat some numbers for me but to reverse them from the way I say them. Wait until I finish saying the numbers and then repeat them in reverse order, or backward. For example, if I say 3–7–4, you would say 4–7–3. If I say 7–3–6, what would you say?"**
2. If the answer is wrong: SAY **"Actually, you would say 6–3–7."**
3. SAY: **"Repeat only the numbers I say each time, backward, in reverse order."**
4. "Ready?" before each item.
5. **Special rule:** if the participant repeats in **forward order on either of the first two test items**, you may remind them **once**: **"Remember, after I say the number sequence, repeat the sequence backwards. Ready?"** Don't re-present the sequence. Score **correct** if they then give the correct reverse order. After that single reminder is used (or after item 2), forward-order responses are errors.
6. Discontinue after both trials at a length are failed.

Form A backward items (licensed):

| Len | Trial 1 | Trial 2 |
|---|---|---|
| 2 | 2-5 | 4-7 |
| 3 | 2-9-6 | 3-7-4 |
| 4 | 7-1-8-6 | 5-1-6-3 |
| 5 | 5-2-4-9-1 | 9-1-7-3-6 |
| 6 | 6-8-5-7-9-2 | 8-1-6-3-5-9 |
| 7 | 1-5-2-9-7-3-8 | 7-3-1-6-8-5-2 |
| 8 | 3-6-4-9-5-2-7-1 | 6-3-5-7-1-8-2-9 |

#### Scoring

- Item = 1 if the digit sequence is exactly correct (after normalization: "one eight four," "184," "one-eighty-four" ⇒ parse to digits; handle "oh" = 0 even though 0 isn't used; self-corrections: take the **final complete attempt** within the window, and flag it).
- **Total correct** (forward 0–14 → **C2T Q5a**; backward 0–14 → **Q6a**; verify codes).
- **Longest span** = the longest length with at least one correct trial before the discontinue (forward → **Q5b**; backward → **Q6b**). *(The source says "longest span forward" under backward scoring; that's a typo. Implement the backward longest span.)*
- Not completed → reason code 95–98 and leave the longest span blank.
- Derived: per-position error analysis (transpositions vs omissions vs intrusions), response latency, and inter-digit timing (chunking) from ASR timestamps.

#### Response window

Opens at the onset of the last digit + its duration. Closes at the end of speech + `⟦propose 3 s⟧` silence, or at a 10-s max with no speech. **No "Ready?" before the participant responds.** The "Ready?" line comes before the next item.

#### Alternate forms: procedural generator (seeded; store the seed per administration)

Constraints (reverse-engineered from Form A; codify them and test them against Form A as a fixture that must pass):

- Digits 1–9 only (no 0). **No repeated digit within a sequence** (length 9 uses each digit exactly once).
- **No adjacent digits differing by ±1** (Form A has none, which prevents "3-4-5" chunking).
- No ascending/descending run of 3+, no palindromes, no repeated 2-digit substrings between the two trials of the same length.
- The two trials at the same length start with different digits.
- No sequence reads like a year/date/phone fragment (e.g., 1-9-x-x as a year).
- **Over-the-phone confusability** balance: the count of 5/9 (the "five"/"nine" confusion) per sequence stays within Form A's range.
- Practice items (1-8-7, 2-9-8, 3-7-4, 7-3-6) are fixed. Never generate them as test items.
- Also ship 3 frozen static forms (B, C, D) from the generator for research reproducibility.

#### UX / interactivity

- Rhythm is everything: a steady, metronomic digit delivery. The orb pulses once per digit with the **same** pulse for every digit (no count shown).
- After each response, a neutral 700 ms "breath" transition, then "Ready?". Identical after correct and incorrect responses.
- Between forward and backward: a chrome-zone micro-break card ("Nice. A slightly different one next.").

#### Edge cases

Starts answering before the list ends → capture it and flag it. Says the digits in chunks ("sixty-four, ninety-two…") → parse into digits and accept. The phone channel's audio clipping drops a digit → onset QA flags the trial (don't score it; re-administering a new same-length item from the generator is allowed, and logged as a deviation). Asks "can you repeat that?" → not allowed. The UI shows nothing, and the examiner says only "Just do your best." `⟦confirm approved phrase⟧`.

#### Definition of Done

CLAUDE.md §14, plus property-based tests (fast-check) proving that every generated sequence satisfies all the constraints; tests for the discontinue logic (fail both at a length → stop; fail one → continue); the backward forward-order reminder being used at most once and only on items 1–2; and the longest-span calculation.

◀ END PROMPT: T3

---

### T4: Rey Auditory Verbal Learning Test (Immediate, Delayed, Recognition) · MEM (○ ATT, EXE)

*Source: C2T pp. 27–29, 53–56 · Core (choose RAVLT **or** CERAD, `⟦DECISION D2⟧`) · Immediate ≈7 min, Delayed + Recognition ≈2 min after a 20–30-min delay*

▶ BEGIN PROMPT: T4 RAVLT

Read `CLAUDE.md`. Build **T4a RAVLT Immediate** (List A Trials 1–5, List B, Trial 6) and **T4b RAVLT Delayed Recall + Recognition** as one module linked by a delay timer.

> ⚠️ Licensing: RAVLT is published by WPS. Form A is behind `LICENSED_CONTENT`. `⟦DECISION D5⟧`

#### Presentation rate: `⟦DECISION D7⟧`

The source contradicts itself: the admin page says **1 word per second**, while the TOC summary says **one word every 1.5–2 s** for telephone. Implement the rate as a spec parameter, set it once, and never change it for a given user's longitudinal record (store it on every administration).

#### Definitions

- **Intrusion:** a word offered that isn't on the target list.
- **Repetition:** a list word said more than once in the same trial. Mark it "R", don't give it an extra point, and don't count it in the recall order.
- **Order of recall:** record the ordinal position (1, 2, 3…) of each **correct** first mention.

#### T4a Immediate: administration (verbatim)

**List A, Trial 1.** SAY: **"I am going to read a list of words. Listen carefully, for when I stop, you are to say back as many as you can remember. It doesn't matter in what order you repeat them. Just try to remember as many as you can."** Present List A, then open the recall window.

**List A, Trials 2–5.** SAY (each time): **"I am going to read the same list again, and once again when I stop, I want you to tell me as many of the words as you can remember, including words you have said before. It doesn't matter in what order you say them, just say as many words as you can remember, whether or not you said them before."** (Trials 3–5 may begin **"Now I am going to read the same list again…"**. Pick one exact wording and lock it.)

**List B.** SAY: **"Now I am going to read a second list of words. This time, again you are to say back as many words of this second list as you can remember. Again, the order in which you say the words does not matter. Just try to remember as many as you can."**

**Trial 6.** SAY: **"Now tell me all the words you remember from the first list."** (List A is **not** re-presented.)

→ Record the time **after Trial 6 recall** = delay start (per the 2025-02-03 revision).

**Recall window rule:** the spec gives no time limit. Close on "done" / DoneButton / `⟦propose 15 s⟧` of silence after the last word, with no verbal prompt.

Form A (licensed):

| List A | List B |
|---|---|
| DRUM | DESK |
| CURTAIN | RANGER |
| BELL | BIRD |
| COFFEE | SHOE |
| SCHOOL | STOVE |
| PARENT | MOUNTAIN |
| MOON | GLASSES |
| GARDEN | TOWEL |
| HAT | CLOUD |
| FARMER | BOAT |
| NOSE | LAMB |
| TURKEY | NAIL |
| COLOR | PENCIL |
| HOUSE | CHURCH |
| RIVER | FISH |

#### T4b Delayed Recall: administration

- 20–30 min after the delay start. Fill the gap with tasks that **don't involve verbal encoding** (the orchestrator handles this). **Don't cue.**
- SAY: **"A short while ago, I read a list of words to you several times, and you were trying to learn these words. Tell me the words from this list again."** Record the correct words in order, repetitions, and intrusions.

#### T4b Recognition: administration

- SAY: **"I'm going to read to you a list that contains the words from the first list, the one I read several times. If the word was on the first list, say 'yes,' and if it was not on the first list, then say 'no.'"**
- Present each word in this fixed order and capture Yes/No by voice (with big Yes/No buttons as an accessible fallback: the **same styling, no feedback**): TEACHER, RIVER, BRIDGE, FARMER, PEN, FOREHEAD, KERCHIEF, HOUSE, MOON, COLOR, BEET, CURTAIN, FLOOR, SOLDIER, DRUM, COFFEE, ROAD, HAT, TURKEY, MINUTE, NOSE, SCHOOL, BELL, FACE, GARDEN, CLASSROOM, PARENT, CHILDREN, BROOMSTICK, NAIL (Targets = the 15 List A words; foils = TEACHER, BRIDGE, PEN, FOREHEAD, KERCHIEF, BEET, FLOOR, SOLDIER, ROAD, MINUTE, FACE, CLASSROOM, CHILDREN, BROOMSTICK, NAIL.)
- **Clarification descriptions (recognition only; never during learning or recall trials):** if the participant asks what a word was ("curtain" vs "person"), play its description clip: TEACHER "A person who teaches, especially in a school" · RIVER "A large natural stream of water flowing to a sea or lake" · BRIDGE "A structure over a river or road" · FARMER "A person who owns or manages a farm, raising animals or growing crops" · PEN "A writing instrument" · FOREHEAD "The part of the face above the eyebrows" · KERCHIEF "A piece of fabric used to cover the head" · HOUSE "The building people live in" · MOON "In the sky at night" · COLOR "Like the color blue or red" · BEET "The plant that grows in the ground" · CURTAIN "A piece of material that covers windows" · FLOOR "What you walk on in a room" · SOLDIER "A person who serves in an army" · DRUM "An instrument" · COFFEE "A hot drink made in the morning" · ROAD "What cars drive on" · HAT "What someone wears on their head" · TURKEY "The bird" · MINUTE "As in, 60 seconds" · NOSE "The part of the face between the eyes" · SCHOOL "Where children go to learn" · BELL "An instrument that rings" · FACE "The part of your head where your eyes and nose are" · GARDEN "Where to grow vegetables, herbs, and flowers" · CLASSROOM "A room in a school" · PARENT "A mother or father" · CHILDREN "Kids or a child" · BROOMSTICK "What is used to sweep the floor" · NAIL "A small piece of metal for holding wood together"
- Accept only yes/no. For "I don't know" / "maybe", `⟦propose⟧` one neutral re-ask: "Please answer yes or no." Log it.

#### Scoring

- Each recall trial: correct words (1 point each, repetitions not re-counted) and intrusions. Trials A1–A5, B1, A6 → **C2T Q6a–6n** as (total, intrusions) pairs. Verify the exact field mapping against the current C2T form.
- Delayed: total correct → **Q13a**; intrusions → **Q13b**; recognition hits (correct "yes" to targets) → **Q13d**; false positives ("yes" to foils) → **Q13e**. Verify codes; store the delay minutes.
- Derived (analytics layer): Trials 1–5 sum (learning total), learning slope, best trial, proactive interference (B1 vs A1), retroactive interference (A6 vs A5), forgetting (Delayed vs A5, and vs A6), recognition discriminability (hits − FP, and d′), serial-position curves (primacy/recency), and semantic clustering in recall order.
- Normalization: plurals/singular (e.g., "drums" = DRUM, flagged), homophones over the phone (e.g., "bell"/"belle"), and compounds ("broom stick" = BROOMSTICK). Any low-confidence token → review.

#### Alternate forms (≥ 4 originals; published RAVLT alternate lists exist but need permission)

Each form = List A (15), List B (15), 15 recognition foils, and descriptions for all 30 recognition words.

- **List A / List B matching** (vs Form A): Zipf frequency mean ±0.15 and SD ±0.2; concreteness and imageability means ±0.2 (Brysbaert norms); syllable distribution identical (count of 1-, 2-, 3-syllable words); **no two words from the same tight category within a list**; no rhymes within a list; no minimal pairs in 8 kHz audio.
- **Recognition foil structure** (mirror Form A's design; categorize Form A's foils and match the counts): foils **semantically related to List A words** (e.g., TEACHER/CLASSROOM↔SCHOOL, FOREHEAD/FACE↔NOSE, CHILDREN↔PARENT, BRIDGE↔RIVER, BEET↔GARDEN, KERCHIEF↔HAT), foils **from List B** (e.g., NAIL), foils related to List B (e.g., PEN↔PENCIL), and unrelated foils (e.g., MINUTE, SOLDIER). Encode the relation type as metadata on every foil.
- **Session collision check:** Form A itself collides with MoCA (FACE is a foil; NOSE is the MoCA cue for FACE; CHURCH is in List B and the MoCA list). Original forms must pass the collision check against **the session's actual forms** of every other test.
- Human review sign-off on every form.

#### UX / interactivity

- The 5 learning trials can feel repetitive. Make the *chrome* between trials feel like forward motion: a soft "breath" transition and a subtle ProgressRail tick per trial (the trial count is fine; the **word count recalled must never show**).
- The List B switch is a known "gotcha" moment. The scripted instruction is enough, so keep the visuals identical so nothing hints at the interference design.
- Recognition: a large Yes / No button pair under the orb (voice-first, buttons as fallback), with the same tap animation for both.

#### Edge cases

Says List B words during Trial 6 → intrusions (tag them "List B intrusion" in analytics). Says words while the list is still being read → capture them, don't count them, and flag it. The delay window overruns 30 min → administer immediately and flag it. The participant says "yes" to everything → valid data (FP will be high), plus an analytics flag.

#### Definition of Done

CLAUDE.md §14, plus tests for repetition vs intrusion accounting, order-of-recall capture, the delay-start timestamp at the end of Trial 6, recognition hits/FP, and description playback allowed **only** in recognition.

◀ END PROMPT: T4

---

### T5: CERAD Word List (Immediate J4, Delayed Recall J6, Recognition J7) · MEM

*Source: C2T pp. 30–31, 37–39 · Core alternative to RAVLT (`⟦DECISION D2⟧`) · Immediate ≈5 min; Delayed + Recognition ≈5 min after a ≥5-min delay*

▶ BEGIN PROMPT: T5 CERAD Word List

Read `CLAUDE.md`. Build **T5a CERAD Word List Memory (J4)**, **T5b Word List Recall (J6)** and **T5c Word List Recognition (J7)**.

> ⚠️ Licensing: CERAD (Duke University, Gerda Fillenbaum, PhD). Form A is behind `LICENSED_CONTENT`. `⟦DECISION D5⟧`

#### Presentation rate

The admin page says **1 word every second** (the TOC says 2 s, which refers to the in-person flip-book reading). Implement it as a spec parameter; default 1.0 s. `⟦confirm⟧` Log it.

#### T5a J4 Word List Memory: administration

- Trial 1 SAY: **"I am going to read you 10 words. Later I will ask you to recall all 10 words."** Present the Trial 1 order at the set rate, then ask them to recall as many as they can.
- Trials 2 and 3: the source says to continue "in the same way, changing your instructions slightly to encourage the participant," **but gives no verbatim text.** Author and **lock** one standardized script per trial, e.g., Trial 2: **"Now I'm going to read the same 10 words again, in a different order. Afterwards, tell me as many as you can remember, including ones you said before."** Trial 3: **"Here are the same 10 words one last time. Try to remember as many as you can."** `⟦approve wording⟧` Record it in DEVIATIONS.md.
- **Recall window: max 90 s per trial.** It closes at 90 s or on "done". Record the correct words (with order of recall) and intrusions. Don't record repetitions/intrusions in the order sequence.
- Record the time after Trial 3 recall = delay start.

Form A (licensed) orderings:

| Trial 1 | Trial 2 | Trial 3 |
|---|---|---|
| Butter | Ticket | Queen |
| Arm | Cabin | Grass |
| Shore | Butter | Arm |
| Letter | Shore | Cabin |
| Queen | Engine | Pole |
| Cabin | Arm | Shore |
| Pole | Queen | Butter |
| Ticket | Letter | Engine |
| Grass | Pole | Ticket |
| Engine | Grass | Letter |

#### T5b J6 Word List Recall: administration

- **After ≥ 5 minutes**, filled with tasks that **don't involve verbal encoding** (in the NACC order this is Category Fluency).
- SAY: **"A few minutes ago I asked you to learn a list of ten words. Now I want you to try to recall as many of those 10 words as you can. OK, now tell me as many of those ten words as you can remember."**
- Max **90 s**. Record the words in recall order, plus intrusions. Record the time the delayed recall was initiated (delay end).

#### T5c J7 Word List Recognition: administration

- SAY: **"Now I am going to read you a set of words. Some of the words are from the list you heard earlier and some are words I haven't read to you before. I want you to say YES if the word I read to you is from the list you heard earlier (read the first word). Is this one of the words you heard earlier?"**
- For each subsequent word: repeat the question or say **"How about this one?"** (pick one, lock it).
- Fixed order (targets marked \*): School, Coffee, Butter\*, Dollar, Arm\*, Shore\*, Five, Letter\*, Hotel, Mountain, Queen\*, Cabin\*, Slipper, Pole\*, Village, String, Ticket\*, Troops, Grass\*, Engine\* (NACC changed "church" → "school" on 2025-10-09 to avoid MoCA interference. Your form system should make this kind of fix a one-line form-version bump.)
  - *Transcription note: the PDF's asterisks were partly lost to italic formatting ("targets marked ): School, Coffee, Butter"). Butter is a List word, so it's a target; School and Coffee are foils. This gives 10 targets and 10 foils.*
- **Only YES or NO is acceptable.** Urge the participant to answer yes or no, since "don't know" is unscorable. `⟦lock urge phrase, e.g., "Please say yes or no."⟧`

#### Scoring

- J4: per-trial correct (0–10) and intrusions; Trials 1–3 total (0–30).
- J6: correct (0–10) and intrusions.
- J7: **YES correct** (targets endorsed, 0–10) and **NO correct** (foils rejected, 0–10). Derived: total correct (0–20), discriminability.
- Derived: savings (J6 / J4 Trial 3), learning slope, serial position, intrusion types.
- NACC field codes aren't listed in this manual for CERAD. **Look them up in the current C2T data-element dictionary** and map them; leave a TODO test that fails until they're mapped.

#### Alternate forms (≥ 4 originals)

- 10 target nouns matched to Form A on Zipf frequency, concreteness, syllables (Form A: mostly 1–2 syllables), and **no semantic category overlap** within the list.
- Three fixed orderings per form that follow Form A's constraints: no word keeps the same serial position across trials; the first and last positions rotate.
- 10 recognition foils matched on frequency/concreteness to the targets, with none semantically or phonologically close to the session's other stimuli (collision check). Also match Form A's pattern of foil-target interleaving.

#### UX / interactivity

Same as T4. Since the 90-s cap exists, the UI can show a **non-numeric** ambient ring **only if** `⟦DECISION D6⟧` allows it. Default: hidden. When the cap hits, the examiner voice moves on neutrally ("Thank you.") with the same line regardless of performance.

#### Definition of Done

CLAUDE.md §14, plus tests for the 90-s cap, the ≥5-min delay enforcement, yes/no-only acceptance, and the three distinct orderings being honored.

◀ END PROMPT: T5

---

### T6: Category Fluency (Animals, Vegetables) · LANG (○ EXE)

*Source: C2T pp. 32–36 · Core · ~5 min · Animals 0–77, Vegetables 0–77*

▶ BEGIN PROMPT: T6 Category Fluency

Read `CLAUDE.md`. Build **T6 Category (Semantic) Fluency**: a scripted practice with clothing, then Animals (60 s), then Vegetables (60 s).

#### Practice (chrome-zone wrapper; scripted feedback allowed here only)

SAY: **"I am going to give you a category and I want you to name, as fast as you can, all of the things that belong in that category. For example, if I say 'articles of clothing,' you could say 'shirt,' 'tie,' or 'hat.' Can you think of other articles of clothing?"** Allow up to **20 s** for two responses. Classify them, then play the matching scripted line:

| Code | Condition | Examiner says |
|---|---|---|
| 0 | No response | "You could have said 'shoes' or 'coat' since they are articles of clothing." |
| 1 | ≥1 incorrect, no correct | "No, ___ is (are) not an article(s) of clothing. You could have said 'shoes' or 'coat' since they are articles of clothing." |
| 2 | ≥1 correct, no incorrect (fewer than 2 correct) | "That's right. You also could have said 'shoes' or 'coat.'" |
| 3 | ≥1 correct and ≥1 incorrect | "___ is (are) correct, but ___ is (are) not an article of clothing. You also could have said 'shoes' or 'coat.'" |
| 4 | ≥2 correct responses | "That's right." |

The fill-in blanks ("___") need the participant's own words, so this is the **only** place where runtime TTS may be used. Pre-render the frame and splice in the word via TTS with the same voice, or use a neutral frame without echoing the word (`⟦DECISION⟧`, logged).

#### Animals (verbatim)

SAY: **"Now I want you to name things that belong to another category: Animals. You will have one minute. I want you to tell me all the animals you can think of in one minute. Ready? Begin."**

- The timer starts on the onset of "Begin." It stops at exactly 60.0 s.
- **One prompt allowed: "Tell me all the animals you can think of"**, if there's no response for **15 s** (VAD) **or** the participant expresses incapacity ("I can't think of any more"; detect intent via ASR phrase list + classifier). Max one per trial.
- Repeating the instruction/category is allowed **if the participant specifically asks.**
- **Don't cue** that more than mammals count. If they ask beforehand or during ("do birds count?"), the examiner may say **"Yes."** (Pre-render it; detect yes/no-question intent.)

#### Vegetables (verbatim)

SAY: **"Now I want you to name things that belong to another category: Vegetables. You will have one minute. I want you to tell me all the vegetables you can think of in one minute. Ready? Begin."** Same timing, same single prompt (**"Tell me all the vegetables you can think of"**), same repeat rule.

#### Scoring (defer until the whole battery finishes, per spec)

**Animals (0–77) → C2T Q9a.** Credit: breeds (terrier); male/female/infant names (bull, cow, calf); superordinate **and** subordinate both credited (dog **and** terrier); birds, fish, reptiles, insects. No credit: repetitions, mythical animals. **Vegetables (0–77) → C2T Q9b.** Credit: superordinate and subordinate (peppers **and** jalapeños); less specific names (greens); nuts (peanuts, acorns); grains (corn, rice, wheat, oats); gourds; sugarcane; herbs; seaweed; tomato, avocado, pumpkin; legumes; culturally specific vegetables **if dictionary-verifiable** (e.g., jicama; in the review console, the reviewer can confirm spelling/meaning). No credit: repetitions, prepared products (pickles, tomato sauce, ketchup), spices.

- **Implementation:** curated lexicons (`animals.lexicon.json`, `vegetables.lexicon.json`) with lemma, synonyms, a taxonomy node, and flags (`mythical`, `prepared`, `spice`, `herb`, `grain`…), plus a fallback rubric-constrained LLM classifier for out-of-lexicon tokens, whose low-confidence results go to review. Plurals collapse to the singular for repetition detection ("cats" after "cat" = repetition).
- Not completed → reason code 95–98.
- **Derived (important for Remembrance's domain model):** words per 15-s bin (output decay), mean inter-word latency, **clustering and switching** (Troyer method: animal subcategories such as pets/farm/African/water/birds; vegetable subcategories), mean word frequency of outputs (lower = richer lexicon), repetition and intrusion counts, and first-response latency.

#### Alternate forms

Semantic fluency practice effects are modest, and Animals is the most validated category.

- **Recommended:** keep **Animals fixed** as the longitudinal anchor, and rotate the **second** category among productivity-matched alternatives after equating (candidates: vegetables, fruits, things in a kitchen, things you'd find in a supermarket, clothing, **but not clothing if it's also the practice category**, tools, furniture, occupations). `⟦DECISION⟧`
- Each alternate category ships with a lexicon, credit rules (written in the same style as the vegetable rules above), a clustering taxonomy, and its own practice category with the 0–4 feedback script (a practice category must differ from both test categories).
- The form validator checks the productivity estimate (the count of lexicon entries at Zipf ≥ 3) within ±15% of the category being replaced. Mark `equated: false` until piloted.

#### UX / interactivity

- These are the most "alive" 60 seconds in the battery. The orb should visibly ripple with every word they say, confirming it's hearing them, without any counter or chime that tracks the number of words.
- Timer display per `⟦DECISION D6⟧` (default: none. The examiner says "Stop" at 60 s. Optional: a slow ambient ring around the orb).
- Never show recognized words on screen.

#### Edge cases

Talks past 60 s → ignore tokens after 60.0 s, but keep them in the raw data. Lists with filler ("um, dog, uh, and, cat") → normalize. Multi-word names ("polar bear," "sea lion," "brussels sprouts") → the tokenizer must merge them using the lexicon. Says the category's examples (shirt, tie, hat) during Animals → irrelevant intrusions (log them). Speaks another language → review queue.

#### Definition of Done

CLAUDE.md §14, plus unit tests for every credit/no-credit example in the rules above, multi-word merging, the single-prompt limit, the "Yes" to the "do birds count" path, and the 60.0-s cutoff precision (±50 ms).

◀ END PROMPT: T6

---

### T7: Phonemic (Letter) Verbal Fluency (F, L) · EXE · LANG

*Source: C2T pp. 48–52 · Core · ~5 min · F correct 0–40, L correct 0–40, totals 0–80*

▶ BEGIN PROMPT: T7 Phonemic Fluency

Read `CLAUDE.md`. Build **T7 Phonemic Fluency**: letter F (60 s), then letter L (60 s).

#### Administration: Letter F (verbatim)

SAY: **"I'm going to say a letter of the alphabet. When I ask you to start, tell me as many words as you can that begin with that letter. You will have 1 minute before I tell you to stop. None of the words can be numbers, names of people, or places." "For example, if I gave you the letter B, you could say brown, bottle, or bake, but you wouldn't say Barbara, Boston, or billion. Also, please try not to give me the same word with different endings, so if you said bake, you wouldn't also say baked or bakes, and if you said big, you wouldn't also say bigger and biggest." "Let's begin. Tell me all the words you can, as quickly as you can, that begin with the letter 'F'. Ready? Begin."**

- Administration note: an additional clarifying example is allowed (**"The letter F, like fox."**). Always include it on the phone channel (F/S/TH confusion), and include it on web for consistency. Log it.
- The timer starts **after the instructions are complete** (on "Begin."). Stop at 60 s.

**Prompts:**

- 15-s pause → **"Keep going."** or **"What other words beginning with 'F' can you think of?"** `⟦Lock which one, or allow both in a fixed sequence (first 15-s pause → "Keep going," second → "What other words…")⟧`
- 3 consecutive words that don't start with the designated letter → **"We are now using the letter F."** **Only once** per trial.
- Rule-violation reminder: when a rule violation (proper noun, wrong letter, etc.) occurs on **3 consecutive responses**, remind the participant of that rule. **Each rule can be reminded only once per trial.** Pre-render one reminder clip per rule.

#### Letter L

SAY: **"Now I want you to do the same for another letter. The next letter is L. Ready? Begin."** (+ **"The letter L, as in like."**) Same prompts with L.

#### Scoring (implement exactly; unit-test every sentence)

**Correct:** begins with the specified letter, is in a dictionary, isn't a proper noun or number, and isn't a repetition within the trial. **Benefit of the doubt:** ambiguous responses are scored correct on first instance (e.g., "frank" = name / food / adjective → correct). The sound "fôr" could be for/fore/four: correct, **unless** it's given alongside other numbers ("four, five") → number → rule violation. Context can resolve ambiguity. **Self-corrected** rule violations or repetitions are **not** errors. **Also correct:** contractions; compound or conjoined words with a single meaning (ferris wheel); slang if it's in a dictionary; **proper nouns that aren't names of people or places** (days of the week, months, brand names). **Repetitions:** any response repeated verbatim within the 60 s. A repeated word with multiple meanings or a homophone ("still," "flue/flew") = a repetition **unless** the participant indicates a different meaning or the context strongly suggests it ("felt, feeling, fresh, fabric, felt" → the second "felt" is correct). **Repeated rule violations count as repetitions**, not violations. **Rule violations:** words beginning with another letter, including same initial sound with a different letter ("phone" for F); non-words; proper nouns that are names of people or places; numbers; grammatical variants of a previous response, **only** plurals, tense changes, and comparatives/superlatives (bake→bakes, bake→baking, big→bigger). Anything else sharing a root is **credited** ("bakery" after "bake" is correct). Ambiguous → not a violation.

**Output fields (verify codes against the current C2T):**

- **Q10a** F correct (0–40) · **Q10b** F repetitions (0–15) · **Q10c** F non-F / rule-violation errors (0–15)
- **Q10d** L correct (0–40) · **Q10e** L repetitions · **Q10f** L violations
- **Q10g–10i** totals: correct F+L (0–80), repetitions (0–30), violations (0–30)
- If F isn't completed: reason code in 10a, 10b–10c blank. If L isn't completed: reason code in 10d, 10e–10i blank.

**Implementation:**

- ASR tokens → a **spelling resolver** (phonemic fluency is judged by spelling, but ASR hears sound: "phone" and "fone" sound the same). Use an orthographic lexicon (e.g., a frequency-ranked English word list), a homophone table, and first-letter checks on the **resolved spelling**. If the ASR's spelling is ambiguous across letters (e.g., "cent"/"scent"/"sent"), then when at least one spelling starts with the target letter and is valid, award benefit of the doubt, and flag it.
- Proper-noun detection: a name/place gazetteer + a capitalization-agnostic NER model + "people or places only" filtering (brands/days/months pass). Ambiguous items get benefit of the doubt.
- A grammatical-variant detector limited to plural/tense/comparative morphology (use a lemmatizer, then check which morphological relationship applies). Non-inflectional derivations pass.
- Every decision stores its rule ID for audit (e.g., `R-REP-HOMOPHONE-CONTEXT`).
- **Derived:** words per 15-s bin, phonemic clustering (shared first two letters, rhymes, homonyms) and switching (Troyer), latency, mean word frequency, and the error profile. These are the key executive-function markers for Remembrance.

#### Alternate forms

- Letter pairs are matched to F+L on **combined productivity** (estimate = the count of dictionary words at Zipf ≥ 3 starting with the letter, excluding proper nouns), within ±10%, then equated empirically.
- Candidate letters from common parallel-form sets (validate them yourself): F, A, S, C, L, P, R, W, B, H, M, T. **Avoid** letters with heavy sound–spelling mismatch over the phone (C: /k/ vs /s/; K: silent-K words; the X, Q, Z extremes).
- Constraint: letters must never collide with T1's MoCA fluency letter in the same session, and the two letters in a pair differ in first-sound class.
- Each letter ships with its clarifying example ("P, like pan") and pre-rendered prompt clips.

#### UX / interactivity

Same philosophy as T6: the orb ripples per word, there's no counter, no timer by default (`⟦DECISION D6⟧`), and the letter is spoken with the example. The letter **may** be shown on screen as a large glyph in the protocol zone (it's the task cue, not a memory stimulus): `⟦DECISION⟧` (recommend yes. It reduces F/S/TH mishearing and working-memory load. Log it as a deviation).

#### Definition of Done

CLAUDE.md §14, plus a unit test for **every** example in the scoring rules (frank, fôr/four-five, ferris wheel, brand names, days/months, still/flue-flew, felt…felt, phone-for-F, bake/bakes/baking, big/bigger, bakery-after-bake, repeated violation → repetition, self-correction), the 3-consecutive prompt limited to once, and per-rule reminder caps.

◀ END PROMPT: T7

---

### T8: Oral Trail Making Test (Parts A & B) · EXE (Part B set-shifting) · ATT (Part A processing speed)

*Source: C2T pp. 40–43 · Optional · ~5 min · Part A max 100 s; Part B max 300 s*

▶ BEGIN PROMPT: T8 Oral Trails

Read `CLAUDE.md`. Build **T8a Oral Trails Part A**, the **Part B Pre-test**, and **T8b Oral Trails Part B**. This test is technically the hardest: the examiner has to **interrupt errors in real time**, so we need low-latency streaming ASR plus sequence-aware decoding.

#### Real-time architecture requirements

- Streaming ASR with interim results. **Error detection → examiner correction audio must start within ≤ 1.2 s** of the erroneous token's end. Measure and log this latency.
- **Constrained decoding:** the expected next token is known, so bias ASR toward the expected vocabulary (numbers 1–25; letters A–L). Resolve E-set letter confusions over the phone (B/D/E/G/P/T/V/Z; "see"→C, "bee"→B) using sequence context. If the heard token is phonetically compatible with the expected token, accept it, with a confidence flag.
- Pre-render **every** correction clip: "You last said '[n],' please continue from there." for n = 1…25 (Part A), and "You said '[n] [letter]'; Continue from there." for every pair up to 12 L (Part B), plus "Please keep going." and "Number-letter."
- The timer keeps running during corrections (per spec). Barge-in handling: pause ASR while the examiner speaks, then resume.

#### Part A (verbatim)

SAY: **"OK, here is something a little different. I'd like you to count from 1 to 25 as quickly as you can. 1, 2, 3, 4, and so on. Ready? Begin."**

- The timer starts on "Begin."
- **Error** (a wrong next number): stop them and SAY **"You last said '[last correct number],' please continue from there."** Count it as an error. The timer doesn't stop.
- **5-s pause** before completion → **"Please keep going."**
- If they don't recall where they are → give the last correct response: **"You last said '[n],' please continue from there."** and score it as an error.
- A **further 15 s** without progress → **discontinue**, reason code **995–998**; leave errors and correct responses blank.
- **Max 100 s.** If not finished by 100 s, the score is **100**.
- Record: completion time (s, including corrections), total errors, total correct, and **where** errors occurred (position in the 1–25 grid).

#### Part B Pre-test (alphabet check)

SAY: **"Please tell me the alphabet starting with the letter A."** Target A–L.

- 0 errors (A→L) → continue.
- ≥3 errors → discontinue Part B, code **997**.
- 1–2 errors → ask them to say it again. **Any** error on the second attempt → discontinue, code **997**.

#### Part B (verbatim)

SAY: **"Now I'd like you to switch between numbers and letters when you count. So you would say the number 1, and then say the letter A, then number 2, then letter B and so on, as quickly as you can. Let's do a practice trial first. Count to the number 4, switching between numbers and letters. Ready? Begin."**

- Practice target: **1 A 2 B 3 C 4**. On a mistake SAY **"No, that was incorrect, it should be 1, A, 2, B, 3, C, 4."** Allow **up to 3 practice attempts**. "Repeat instructions with guidance twice." If they still don't understand → discontinue Part B, code **995–998**, blanks.
- If practice passes, SAY **"Now I want you to switch between numbers and letters when you count 1, A, 2, B, 3, C, and so on until you reach the number 13. Ready, begin."**
- Target: **1 A 2 B 3 C 4 D 5 E 6 F 7 G 8 H 9 I 10 J 11 K 12 L 13** (25 elements).
- Error → **"You said '[n] [letter]'; Continue from there."** Error counted; the timer runs.
- 5-s pause → **"Please keep going."** Lost → give the last correct pair (as above) and score an error. You may remind **"Number-letter"** to keep them on task.
- A further 15 s → discontinue, code 995–998, blanks.
- **Max 300 s.** Not finished → score **300**.
- Record: time (s), total errors, total correct, error locations. Also record practice attempts (1–3) and the result of each.

#### Scoring and derived metrics

- Part A: time (≤100), errors, correct. Part B: time (≤300), errors, correct. NACC field codes aren't in this manual; look them up and map them (with a failing TODO test until mapped).
- **Derived:** B − A time (the switching cost; the core EXE marker), B/A ratio, per-transition latencies (number→letter vs letter→number), error type (sequencing vs set-loss: e.g., "4, 5" instead of "4, D" is a set-loss), and hesitation profile.

#### Alternate forms

Counting sequences are inherently fixed, so item-level alternate forms are limited, and most of the practice effect is procedural.

- **Recommended default:** keep canonical A and B, and handle practice effects statistically (a practice-adjusted RCI in the Remembrance Score).
- **Optional equated alternates behind a flag:** Part A variants (e.g., a different 25-number range, though counting above 25 adds multi-syllable load); Part B variants starting at a different anchor (e.g., "5 E 6 F…" or a letter-first order "A 1 B 2…"). These **change difficulty** and **must** be equated before use. `⟦DECISION⟧`

#### UX / interactivity

- A speed task, so make the moment before "Begin" feel like a calm starting line (orb gathers, then releases), never a race.
- During the task, nothing on screen except the orb rippling with speech. **No visible numbers or letters** (a visual sequence would turn it into a visual trail test).
- Corrections must sound neutral and unhurried: the same prosody every time.
- Pre-test and practice live in the chrome zone, where scripted feedback is allowed.

#### Edge cases

Says numbers in a run-on stream ("onetwothree") → rely on ASR token timestamps; review if confidence is low. Says "A-one" ordering in B (letter-first) → error at the first element, then the correction flow. Mis-decodes due to phone audio → the correction logic must **not** fire on low-confidence tokens that are phonetically compatible with the expected token (a false interruption is worse than a missed error, so tune for precision and log disagreements for review). Participant self-corrects immediately (within ~1 s) → no examiner correction; `⟦count as error or not? The source doesn't say. Propose: not an error if self-corrected before the examiner speaks, but log it⟧`.

#### Definition of Done

CLAUDE.md §14, plus simulated-audio E2E tests for: a clean run, an error mid-sequence with the correction clip within the latency budget, 5-s prompt, 15-s discontinue, the 100/300-s caps, the pre-test branches (0 / 1–2 then pass / 1–2 then fail / ≥3 errors), practice pass on attempt 3, and practice fail → discontinue.

◀ END PROMPT: T8

---

### T9: Verbal Naming Test (VNT) · LANG (○ MEM, semantic retrieval)

*Source: C2T pp. 57–59 · Optional · ~10 min · 50 items; scores: correct without cue, correct with cue*

▶ BEGIN PROMPT: T9 Verbal Naming Test

Read `CLAUDE.md`. Build **T9 Verbal Naming Test**: auditory naming to description, the phone-friendly substitute for picture naming.

> ⚠️ Licensing: VNT, Yochim et al. (2015); contact Dr. Brian Yochim. Form A is behind `LICENSED_CONTENT`.

#### Administration (verbatim)

SAY: **"Now we are going to do something different. I'm going to describe an object or a verb and I want you to tell me the name of what I am describing."** For each item, say **"What is the name of…"** + the description. (You can stop saying "What is the name of" once the participant understands the task. Implement this as: drop it after 3 consecutive items answered within 10 s, and log it.)

- After each description, allow **10 s** to respond.
- **Incorrect response** → **"No, it's something else,"** and they get the remainder of the initial 10 s.
- The description **may be repeated** on request, but the stopwatch keeps running (10-s limit holds).
- No correct response within the initial 10 s → **phonemic cue**: **"It starts with the sound…"** + the cue segment (underlined part), then another **10 s**.
- No correct response 10 s after the cue → next item.
- **Discontinue after 6 consecutive failures** (spontaneous or after the phonemic cue).

#### Phonemic cue audio

The cue is a **partial word sound** ("Co…" for collar). TTS handles fragments poorly, so generate each cue by recording/synthesizing the full word, then **trimming** it to the underlined segment, with a human listening QA sign-off per clip. Store the cue text and IPA.

#### Form A items (licensed): description → target (cue segment in brackets)

1 The part of your shirt that goes around your neck → collar [Co] · 2 The thing you hold over your head when it rains → umbrella [Um] · 3 The country where the Great Pyramids are → Egypt [E] · 4 The animal in the desert with a hump on its back → camel [Ca] · 5 What you do when you put your nose up to a flower → smell [Sme] · 6 What a ship does if it can no longer float → sink [Si] · 7 A structure you drive over to cross a river → bridge [Br] · 8 A period of ten years → decade [De] · 9 A small amount of money left for the waiter at a restaurant → tip [Ti] · 10 What you use to sweep the floor → broom [Br] · 11 A baby cat → kitten [Ki] · 12 The item of clothing to wrap around your neck in the winter → scarf [Sca] · 13 A piece of land surrounded by water → island [I] · 14 What you do with a razor → shave [Sha] · 15 A large animal in Africa with a trunk → elephant [El] · 16 What you use to chop wood → ax [A] · 17 What you do to water to make it hot and steaming → boil [Boi] · 18 What you do with your money with charities or the church → donate [Do] · 19 What ice does when it gets hot → melt [Me] · 20 What you wipe your mouth with when eating → napkin [Na] · 21 What you use to measure how many inches something is → ruler [Ru] · 22 What you put your head on to sleep at night → pillow [Pi] · 23 A long, severe snowstorm → blizzard [Bli] · 24 The part of your shirt that covers your arms → sleeves [Slee] · 25 The tool used to collect leaves on the ground → rake [Ra] · 26 A pool of water on the ground → puddle [Pu] · 27 The kind of mountain that explodes with lava → volcano [Vo] · 28 The animal in Australia that hops around and has a pouch → kangaroo [Ka] · 29 The African animal that's like a horse and has black and white stripes → zebra [Ze] · 30 The person who works at a drugstore to fill prescriptions → pharmacist [Pha] · 31 A device that measures the temperature → thermometer [Ther] · 32 A collection of thousands of stars → galaxy [Ga] · 33 A device used to help you add and subtract numbers → calculator [Ca] · 34 A moving set of stairs → escalator [Es] · 35 What a fish uses to breathe → gills [Gi] · 36 What someone sings into to make their voice louder → microphone [Mi] · 37 What you do to a pencil or knife when it becomes dull → sharpen [Sha] · 38 A place people go to gamble money → casino [Ca] · 39 A small hill made of sand → dune [Du] · 40 What a horse does when it runs really fast → gallop [Ga] · 41 A toy that has a string and floats in the air when it is windy → kite [Ki] · 42 A baby cow → calf [Ca] · 43 An animal in Africa with a very long neck → giraffe [Gir] · 44 What you wear while cooking that prevents food from getting on your clothes → apron [A] · 45 A book that is made up of different maps → atlas [A] · 46 A desert plant that has spikes → cactus [Ca] · 47 The poison a snake uses to kill its prey → venom [Ve] · 48 The document you receive when you graduate from high school → diploma [Di] · 49 A kitchen appliance that cleans plates and glasses → dishwasher [Di] · 50 The river in Egypt that is one of the longest in the world → Nile [Ni]

#### Scoring

- Per item: `correctNoCue` (1 if correct within the initial 10 s) or `correctWithCue` (1 if correct within 10 s after the cue). Totals: **TOTAL CORRECT — WITHOUT CUE** and **WITH CUE**. Map the NACC codes (look them up; failing TODO test until mapped).
- Acceptable responses: the target plus morphological variants (sleeve/sleeves, axe/ax). Build a per-item **acceptable-alternates list** (e.g., "hatchet" for ax? "measuring tape" for ruler?) that a clinician reviews. **Anything not on the list → review queue**, and the default is not credited. `⟦clinician sign-off⟧`
- Items after the discontinue point are scored 0 (store `notAdministered: true` for analytics).
- Derived: response latency per item (a key word-finding marker), tip-of-the-tongue behaviors (circumlocution, semantic paraphasia like "zebra"→"horse", phonemic paraphasia), cue benefit (with-cue − no-cue), and the difficulty curve.

#### Alternate forms (item bank approach)

- Author an **original item bank of ≥150 description→target items** spanning nouns and verbs, across difficulty (target Zipf frequency from ~5.5 down to ~2.5), with Form A's category mix (body/clothing, animals, geography, actions, tools, household, science).
- Pilot the items, and estimate difficulty with a 1-PL IRT model. Assemble **3 parallel 50-item forms** matched on difficulty curve and category mix, **ordered easy → hard** (this ordering matters because of the 6-consecutive-failure discontinue rule).
- Fairness screens: avoid items that depend on culture, religion or region (Form A item 18 references "the church"; items 3/50 depend on geography knowledge). Tag every item for the potential-bias review.
- Each item: description (≤ 16 words, plain language, **no words that share the target's root**), target, alternates list, cue segment, and audio.

#### UX / interactivity

- A gentle, conversational rhythm. After each item, a neutral transition identical for right and wrong answers, and the orb resets.
- "No, it's something else" must sound kind and neutral. Record 2–3 prosody takes and pick the least evaluative.
- Show progress only at the test level in the ProgressRail, never "item 23 of 50" (that would telegraph difficulty and discontinue logic).

#### Edge cases

Says the target plus extra words ("an umbrella, obviously") → correct. Says a correct-but-different word (a synonym not on the list) → review. Answers exactly at 10.0 s → define the boundary as the **onset** of the correct token < 10.0 s. Asks "is it X?" → treat X as the response.

#### Definition of Done

CLAUDE.md §14, plus timing tests (10 s + "No, it's something else" keeping the original clock, 10-s post-cue window), the discontinue after exactly 6 consecutive failures (a cued success resets the count), and the cue-clip QA manifest.

◀ END PROMPT: T9

---

## 7. Utility prompts

### U1: Apply my administration changes to a test

▶ BEGIN PROMPT: U1 Modify Test

Read `CLAUDE.md` and `DEVIATIONS.md`. I'm changing how **[TEST ID]** is administered: [paste your changes]

For each change: (1) classify it as **chrome-zone** (UX only) or **protocol-zone** (affects validity); (2) for protocol-zone changes, explain the likely effect on comparability with NACC norms and with this user's previous administrations, and propose the least-invasive way to get what I want; (3) wait for my confirmation on the protocol-zone items; (4) then update `test-spec` (bump `specVersion`), the machine, scorer tests and UI; (5) append an entry to `DEVIATIONS.md` with date, rationale and expected impact; (6) rerun the full Definition of Done for this test.

◀ END PROMPT: U1

### U2: Design polish pass

▶ BEGIN PROMPT: U2 Polish

Screenshot every state of **[TEST ID]** at 390 px and 1280 px, with reduced motion on and off. Critique each screenshot as a senior product designer specializing in older-adult health products, against CLAUDE.md §9 and this rubric: legibility at arm's length · one clear action · emotional calm · zero correctness leakage · brand consistency · motion quality · the transition feel between states. List the top 10 issues ranked by impact, fix them, re-screenshot, and show before/after pairs. Do not touch protocol-zone logic.

◀ END PROMPT: U2

### U3: Fidelity audit (run with a subagent)

▶ BEGIN PROMPT: U3 Fidelity Audit

Spawn a subagent with **no access to the implementation's reasoning**, only the code, `test-spec`, and the source spec text in the relevant T-prompt. Ask it to produce a line-by-line conformance table: spec requirement → where it's implemented → PASS / FAIL / DEVIATION (with a DEVIATIONS.md reference). Pay special attention to: verbatim scripts, rates, time limits, prompt conditions and caps, discontinue rules, scoring rules and field codes, and firewall leakage (DOM text, feedback that differs by correctness). Then fix every FAIL.

◀ END PROMPT: U3

### U4: Form generation run

▶ BEGIN PROMPT: U4 Generate Forms

For **[TEST ID]**, generate **[N]** new candidate parallel forms that satisfy every equivalence constraint in the test's prompt. For each candidate: run the form validator, run the session collision check against every other test's active forms, report the metric deltas vs Form A in a table, and mark it `status: 'candidate'`. Don't mark anything `approved`, because human review is required. Explain which constraints were hardest to satisfy.

◀ END PROMPT: U4

---

## 8. Quick reference: timing and limits

| Test | Stimulus rate | Response limit | Prompts allowed | Discontinue |
|---|---|---|---|---|
| T1 MoCA words | 1 per 1.5–2 s (phone) | until done | instruction repeat ×1 | — |
| T1 Digits | 1/s | — | — | — |
| T1 Vigilance | ≥ 2 s per letter | per-letter window | — | — |
| T1 Letter fluency | — | 60 s | — | — |
| T2 Craft Story | continuous narration, no repeats | until done | Delayed: "boy" cue; one approved reply | — |
| T3 Number Span | 1/s (confirm) | per item | Backward: forward-order reminder ×1 (items 1–2) | 2 fails at the same length |
| T4 RAVLT | 1/s or 1.5–2 s (D7) | until done | Recognition word descriptions only | — |
| T5 CERAD | 1/s (confirm) | **90 s** per recall | urge yes/no in recognition | — |
| T6 Category | — | **60 s** each | 1 prompt at 15 s silence/incapacity; "Yes" if asked about non-mammals | — |
| T7 Phonemic | — | **60 s** each | 15-s pause prompt; wrong-letter ×1; per-rule reminder ×1 | — |
| T8 Trails A | — | **100 s** | 5 s → "keep going"; correction on error | 15 s more stall |
| T8 Trails B | — | **300 s** | same + "Number-letter"; ≤3 practice attempts | 15 s more stall / pretest fail (997) |
| T9 VNT | — | **10 s** + 10 s post-cue | "No, it's something else"; description repeat (clock runs) | 6 consecutive failures |

**Delays:** MoCA recall ≈5 min (inside the MoCA) · Craft ≈20 min (don't fill with tests) · RAVLT 20–30 min after Trial 6 · CERAD ≥5 min after Trial 3.
