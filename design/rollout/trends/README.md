# Rollout 5: Trends / history

Page: [`artifacts/remembrance/src/pages/progress.tsx`](../../../artifacts/remembrance/src/pages/progress.tsx), route `/progress` (the "Trends" tab).

| State | How it's captured (from `scripts/`) | Folder |
|---|---|---|
| Overall score + history | `node src/screenshot-rollout.mjs trends/history /progress --state fixtures/trends-history.json` | `history/` |
| One area (Memory) | the same, plus `--click "Memory"` | `memory/` |

- **Before:** `before-390.png`, `before-1280.png`, the old page from git HEAD.
- **Each state folder:** `pass1-*` and `after-*` in all 8 variants, plus `*-checks.json`.
- **Fixture:** `fixtures/trends-history.json` holds two weeks of finished activities.

**Checks, both states × 8 variants, both passes:** axe-core 0 violations · targets ≥ 56 px · no sideways scrolling. Unit suite (1,139) passes.

## What changed from before

- **Before:** a "Progress" page built for the old demo's five-area rounds. A new user saw an empty card ("not available yet"), a faint gray disclaimer and an icon-only back arrow.
- **After:**
  - one large 12-week chart at a time: the Remembrance Score or any of the five areas, picked with one-tap choices above the chart
  - the same chart as Domain detail, with a one-sentence summary and tappable weeks to read any value (no scrubbing)
  - a "More about …" link to each area's page
  - "Activities you've finished", grouped by day, from this browser's real history, with a plain empty state
- **Shared:** `trendSentence` moved to `home/home-data.ts`, which Domain detail now uses too. The sample overall score gained a 12-week series.

## Critique and fixes

**Pass 1 found:**
1. **The series chooser sat below the long chart.** On a phone, tapping "Memory" changed a chart already scrolled out of view. The chooser now comes first. The chart section is `aria-live="polite"`, so screen readers hear the change.
2. **"Your five areas this week" repeated Home exactly.** Removed, since the chooser and "More about …" reach every area.
3. **Activities within a day were listed newest-first.** They now read in the order they happened.

**Pass 2 found:**
4. **At 1280 px, "Remembrance" spilled out of its choice box,** because one long word can't wrap in a 10rem column. `ChoiceGroup` columns now start at 13rem, which gives two columns on desktop and one on a phone, and labels may break inside a word only as a last resort.

**Known:** the chart and area scores are sample data, labeled as such, until the real Remembrance Score exists (DESIGN_LANGUAGE.md §6.8).
