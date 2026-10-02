# P2 Battery Orchestrator (`@workspace/battery`)

Build prompt: [docs/build-prompts.md §P2](../../docs/build-prompts.md). Pure TypeScript; the web app's `/assess/session` page drives it.

| Piece | Where |
|---|---|
| Test catalog, duration estimates, delay rules | [`src/catalog.ts`](./src/catalog.ts) |
| Presets: NACC Table 1 (RAVLT), Table 2 (CERAD), lean B2C | [`src/presets.ts`](./src/presets.ts) |
| Resolve/validate, session state, `reduce`, `plan`, progress, time remaining | [`src/orchestrator.ts`](./src/orchestrator.ts) |
| Fake-time tests (both presets end to end, windows, filler, resume, overrun) | [`src/battery.test.ts`](./src/battery.test.ts) |
| Web session | [`artifacts/remembrance/src/pages/session.tsx`](../../artifacts/remembrance/src/pages/session.tsx) |

## How it works

- **Resolve:** a preset is resolved against the tests the app can run (built, and not switched off for needing permission). Unavailable tests are skipped; a delayed test whose immediate partner is skipped is skipped too. Validation: delayed after immediate, same visit, and the tests in between fit inside any upper delay bound.
- **Delay manager:** the delay clock starts when the immediate test ends. If a delayed test comes up early, the session waits with allowed filler only — non-verbal (breathing pacer) for word lists, a neutral pause for story recall — and never pulls other tests forward. If an upper bound is about to be crossed by the next test, the delayed test moves up (flag `moved_up_to_protect_window`); if it was already crossed (e.g. a long interruption), it runs at once (flag `window_overrun`). Actual delay minutes are recorded (99 = unknown).
- **Resilience:** the session state is plain JSON, saved after every event. A reload counts as an interruption: a test that was running restarts (flag `restarted_after_interruption`); delay clocks keep running; a filler resumes its original wait.
- **Visits (D12):** a preset may split items into visits; an emptied visit (e.g. MoCA switched off) disappears.
- **UX:** test N of M on the rail, a "Next up" card per test (no hint of a coming delayed recall), a breather offered between tests, one mic check per session, time remaining only in the chrome zone, and results only at the end.

## Delay rules

| Pair | Window | Filler |
|---|---|---|
| story-immediate → story-delayed | ≥ 20 min (actual recorded) | neutral pause only |
| ravlt-immediate → ravlt-delayed | 20–30 min | non-verbal |
| cerad-immediate → cerad-delayed | ≥ 5 min | non-verbal |

## Known gaps

- Story recall, word lists and naming aren't built yet, so today's lean session runs Number Span, Naming Things, Counting Quickly and Words by Letter (MoCA is off: needs a license).
- **Lexical collisions** across the session's forms are checked and logged, not yet blocked/re-picked (CLAUDE.md §8 says block for original forms).
- **Mid-test resume** restarts the test rather than continuing it.
- **Visit reminders** (notification between visits) and the phone channel's callback resume aren't built.
- Table 1's "non-interfering questionnaires" are provided by the non-verbal filler, not a fixed questionnaire item.

# P1 Session Shell (`src/shell.ts`)

Build prompt: [docs/build-prompts.md §P1](../../docs/build-prompts.md). Screens: [`artifacts/remembrance/src/pages/session-shell.tsx`](../../artifacts/remembrance/src/pages/session-shell.tsx). All wording is Remembrance-original (CLAUDE.md §8).

**Flow:** identity (first name + birth year) → interruption plan → device setup → hearing questions (spoken + Yes/No) → repeat-after-me sentence ("The blue cup is on the kitchen table.", two tries; then a volume/earbuds card and one more round; then a graceful end, validity 1) → environment checklist (7 items, each settled before moving on; caregiver hand-off: "Please leave the room now") → recording consent (hard gate) → integrity statement (soft B2C version `soft-v1`, logged) + rapport → **battery** → self-report (interrupted, help, aids, tired, how they felt) → complete, with the automatic validity rating.

**Returning participants** skip the interruption plan, device tips, hearing questions and consent already on file, but always redo the hearing repetition and environment check (build doc).

**Validity (CLAUDE.md §12):** categories 1 hearing, 2 distractions (unsettled environment, leaving the app mid-test), 3 interruptions (session or test, self-report, a delayed recall run late), 5 fatigue, 6 emotional (very stressed), 7 unapproved assistance (help, notes/aids). Rating 3 Invalid for 7 or a failed hearing check; 2 Questionable for anything else noted; 1 Very valid otherwise. Shown only in the preview's results (for review).

**Tests:** `src/shell.test.ts` (flows, returning shortcuts, validity) and the Playwright flows `scripts/src/e2e-session-shell.mjs` (happy path, hearing fail → graceful exit, caregiver → hand-off, consent declined; `?debug=1` simulates only the spoken repetition, since headless Chromium here has a frozen audio clock).
