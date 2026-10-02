# Rollout 2: Domain detail

Route `/domain/:area` (memory, attention, executive, language, orientation). Page: [`artifacts/remembrance/src/pages/domain-detail.tsx`](../../../artifacts/remembrance/src/pages/domain-detail.tsx). Content: [`home/domain-content.ts`](../../../artifacts/remembrance/src/home/domain-content.ts). New `lib/ui` components: **TopBar** (labeled back, always top-left), **TrendChart** (weekly line ≥ 4 px, points ≥ 20 px across, no gridlines, a one-sentence summary above, and **week buttons** instead of drag-to-scrub), **UsualRangeBar** (Oura-style "your usual" band and this week's marker, plus a sentence).

| | Files |
|---|---|
| Before | `before-{390,1280}.png` (memory) |
| Pass 1 | `pass1-*` (Executive Function, the "worth watching" case) |
| After | `after-*` (Executive Function) and `after-memory-*` (a steady area); `*-checks.json` |

**Checks, every variant:** axe-core 0 violations · targets ≥ 56 px · no sideways scrolling. 1,139 existing tests pass.

## What changed from before

- **Back button:** icon-only (rule 5) becomes a labeled "Back to Home", top-left.
- **Score:** an empty "— /20" (a different scale from Home) becomes the area's ring on the same 0–100 scale, with a status word and one sentence.
- **Comparison:** the "your usual" bar answers "is this normal for me?" without an axis.
- **Trend:** the empty "Recorded trend" box becomes a 12-week trend with a plain summary, and any week can be read by tapping its button.
- **Explanation:** "What it means" (with an everyday example), "What helps" (four everyday things), and "How it's measured" (the activities, with Orientation's honestly marked "not available yet" because MoCA is switched off).
- **A calm "Worth keeping an eye on" note** for a lower area: everyday reasons scores move, keep going, and mention it to your doctor if it lasts a month. No alarm color, no "warning" (rule 15).

## Critique and fixes

**Pass 1:**
1. **The "worth watching" note came before any data,** leading with concern. It now comes after the comparison and trend: what happened first, then what to do.
2. **The header sentence ("lower the last 3 weeks") disagreed with the chart summary ("4 points lower over 4 weeks").** The sample sentence now matches the data.
3. **"How it's measured" items were filled pills that looked like buttons** but did nothing (a false affordance). They're now a plain list.
4. **The range marker could merge with the band's edge.** It now has a contrasting outline.

**Pass 2:**
5. **At 200% text a back link reading "Home" sat right under the menu's "Home".** It's now "Back to Home", and the arrow grows with the text.

**Sample data:** scores, weeks and the per-area sentences are sample data, labeled on screen.
