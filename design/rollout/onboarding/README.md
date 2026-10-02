# Rollout 7: Onboarding

Page: [`artifacts/remembrance/src/pages/welcome.tsx`](../../../artifacts/remembrance/src/pages/welcome.tsx), route `/welcome`. New shared component: `CheckList` (multi-select, real checkboxes) in `lib/ui`.

Eight short steps, each with "Step n of 8" and a labeled Back (top-left). Extended on 2026-10-02 at the owner's request ("so we can get the best idea of what we are dealing with"):

| # | Screen | Folder |
|---|---|---|
| 1 | Welcome: what Remembrance is, "about 4 minutes", wellness note | `1-welcome/` |
| 2 | **Which is easier to read?** Two real samples, dark and light, each a large tap target | `2-theme/` |
| 3 | **Is this text comfortable to read?** Standard / Larger / Large / Largest. The page itself resizes as you tap: the preview is the page | `3-text-size/` |
| 4 | **A little about you:** name, birth year (read back as "So you're about 76." to catch typos), sex (Female / Male / I'd rather not say). All required, with gentle inline messages | `4-about/`, `4-about-missing/` |
| 5 | **A little more about you:** highest schooling by degree (required), what brings you here (optional) | `5-schooling/` |
| 6 | **Brain health in your family** (optional, "Skip this"): dementia or Alzheimer's in a parent, brother or sister; if yes, who, and whether it began before 65; grandparents, aunts or uncles; Parkinson's, stroke or undiagnosed memory problems in close family | `6-family/` |
| 7 | **Your own health** (optional): conditions, including hearing loss and trouble sleeping (both affect results), and whether they've had an APOE genetic test and its result | `7-health/` |
| 8 | You're all set: **Start my first session** or "Look around first" | `8-done/` |

Display choices save immediately to `rm.display`, the same store Settings uses. Every later screen follows them, including the test screens through the theme bridge.

- **Capture:** `node src/screenshot-rollout.mjs onboarding/<n-name> /welcome --click "<taps>"` from `scripts/`. `--click` also accepts `fill:<selector>=<text>`. The taps that reach each step:
  - **2:** `Get started`
  - **3:** `Get started|Continue`
  - **4:** `Get started|Continue|This size is good`, plus `fill:#first-name=Margaret|fill:#birth-year=1950|Female` for the answered state, or `Continue` for the missing-answers state
  - **5:** step 4 answered, then `Continue|Bachelor's degree`
  - **6:** then `Continue|Yes|Mother|Before 65`
  - **7:** then `Continue|Hearing loss|No, I haven't`
  - **8:** then `Continue`
- **Before:** `before-390.png`, `before-1280.png`, from git HEAD.
- **Each step folder:** `pass1-*` and `after-*` in all 8 variants, plus `*-checks.json`.

**Checks, all steps × 8 variants:**
- axe-core 0 violations
- targets ≥ 56 px
- no sideways scrolling
- **new: nothing cut off.** `.ds-root` clips sideways overflow, so the script now also flags any text element that overflows its box or the viewport.

## Decisions

- **Asked once, used everywhere.**
  - Name, birth year, sex and education are written to the participant profile (`rm.profile`), the same record the session, scoring (the ≤ 12 years education point) and age/sex comparisons read.
  - The session's profile step now asks only what's still missing. After onboarding that's "Two quick questions": city and usual place, used for orientation questions.
  - Verified end to end with a Playwright probe.
- **Education by degree, not by counting years.** Each degree maps to its usual years of school, stored as `educationYears`: didn't finish high school 10, high school/GED 12, some college/trade/associate 14, bachelor's 16, master's 18, doctorate/professional 20. The only rule that uses it (≤ 12 years) and the comparison data keep working.
- **Family history, built around what's known to matter.**
  - Close family (parent, brother or sister) is asked separately from wider family.
  - Onset before 65 is asked because early onset is the strongest family signal.
  - APOE4 is the best-known genetic risk factor. It's asked only as optional self-report ("Have you ever had a genetic test…"), never inferred.
  - Everything is descriptive context: no risk score is computed or shown, and the copy says it's "never used to diagnose anything".
- **Storage:** health, family and genetic answers are in `rm.background` (`artifacts/remembrance/src/onboarding/background.ts`). In this dev build that's the browser; in production it must be server-side, encrypted and audited as PHI (CLAUDE.md §2). Genetic information is especially sensitive, so it should never reach analytics events.
- **The end goes to the real weekly session** (`/assess/session`), not the old demo baseline. "Look around first" goes to Home.
- **Copy:** "Let's understand how your brain is doing" became "A weekly check on your memory and thinking, done by talking, at home", with the wellness note. "Family history of memory issues?" became the family brain-health step above.

## Critique and fixes

**Pass 1 found:**
1. **At 200% on a phone, "comfortable" ran off the screen** in the heading, and choice labels broke mid-word ("Sta/nda/rd"). The checks missed the first because `.ds-root` clips overflow instead of scrolling. Fixes, all in the shared theme:
   - Headings and legends hyphenate (`hyphens: auto`; the page is `lang="en"`).
   - Card padding is `min(1.5rem, 5vw)` and choice-row padding `min(1rem, 4vw)`, so padding stops growing with the text before it crowds the words.
   - The capture script gained the "cut off" check, and **every earlier rollout was re-verified with it** (tag `final` in each folder).
2. **Two bugs in my first draft, fixed before capture:**
   - Moving focus to each step's question used an inline ref, which would have re-focused the heading on every keystroke while typing your name. It's now a one-time effect per step.
   - "Match my device" was resolved by reading the DOM during render. It now uses the shared `useSystemTheme` hook.

**Pass 2:** no new issues.

## Extension pass (2026-10-02): about you, schooling, family, health

Steps 4–7 recaptured as `pass1-*` and then `after-*`. All variants are clean on every check.

**Pass 1 found:**
1. **Checkboxes rendered as circles,** identical to one-answer radio buttons, so "choose any" looked like "choose one". The box's size and rounding came from utility classes that weren't applied. They're now inline in `CheckList`: a square box with a check when chosen.
2. **Missing-answer messages were plain bold text,** and on a phone they appeared above the fold while Continue was at the bottom. Now each:
   - starts with the "worth watching" icon
   - puts an amber edge on its card
   - disappears as soon as the question is answered
   Focus also moves to the first unanswered field.
3. **The genetic-test hint named a company.** It now says "a home DNA service".

**Pass 2:** no new issues.
