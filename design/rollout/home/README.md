# Rollout 1: Home

Chosen direction: **A "Oura Calm" with B's mini domain rings** ([directions](../../directions/home/README.md)). Built from `lib/ui` (`src/theme.css`, `src/theme.ts`, `src/components/app.tsx`). Page: [`artifacts/remembrance/src/pages/dashboard.tsx`](../../../artifacts/remembrance/src/pages/dashboard.tsx), route `/dashboard`.

| | Files |
|---|---|
| Before | `before-390.png`, `before-1280.png` (the old light dashboard) |
| Pass 1 | `pass1-{dark,light}-{390,1280}-{100,200}.png` |
| After (pass 2) | `after-{dark,light}-{390,1280}-{100,200}.png` + `-first-screen.png`; `after-checks.json` |

**Checks, all 8 variants, both passes:** axe-core 0 violations · every link/button ≥ 56 × 56 px · no sideways scrolling. Theme contrast: `lib/ui/src/theme.test.ts` (42 pairs). Existing suites unchanged: 1,139 tests and the P1 shell flows pass.

## What changed from before

- **Score:** the old "— /100" placeholder becomes a hero ScoreRing with a status word, one sentence, and a clear "sample scores" note.
- **Areas:** five areas, now the real ones (Orientation, not the old demo's "Perpetual Motor"), each with a mini ring, a sentence and a status chip (word + icon + shape).
- **One primary action** (Start your session, opening the real weekly check-in). The check-in, insight, context and consistency follow as a calm feed.
- **The dev "Try every test" list,** which dominated the old page, is collapsed under "Preview tools (testing only)" at the bottom.
- **Dark by default** (following the device), cream light mode. Settings → Display (`/settings`) offers Match my device / Dark / Light and text size Standard / 125 / 150 / 200%.

## Critique and fixes

**Pass 1 found:**
1. **The greeting had no name.** It read the old demo store; it now uses the participant profile.
2. **"0 of the last 5 weeks. Showing up is what counts."** read like a scold for a new user. With no sessions it now says "Your first session starts your weekly rhythm", and the count comes from real completed check-ins (`rm.session.completions`), not the demo history.
3. **The sample-scores note** was in `text-2`, which is 6.7:1 on cream, under the 7:1 body rule. It now uses `text`.
4. **The desktop rail's background stopped partway down** long pages. It now spans the page, with the links pinned.

**Pass 2:** no new issues. Known, by design:
- At 200% on a phone the page is long. That's expected at double text, and everything still reads top to bottom.

## Not real yet

The Remembrance Score and the five area scores and sentences are **sample data**, and the page says so. A real 0–100 score needs a scoring decision: how test results map to the five areas, and a wellness-not-diagnostic framing. Real today: name, date, today's check-in status, sleep and mood chips from check-ins, weekly check-in done this week, and consistency.
