# Rollout 6: Plan

Page: [`artifacts/remembrance/src/pages/plan.tsx`](../../../artifacts/remembrance/src/pages/plan.tsx), route `/plan`.

| State | How it's captured (from `scripts/`) | Folder |
|---|---|---|
| No steps yet | `node src/screenshot-rollout.mjs plan/empty /plan` | `empty/` |
| Two steps, one done today | `… plan/steps /plan --click "Add to my plan\|Add to my plan\|Drink one extra glass of water before noon."` | `steps/` |
| An alternative offered | `… plan/alternative /plan --click "Not for me"` | `alternative/` |

- **Before:** `before-390.png`, `before-1280.png`, from git HEAD.
- **Each state folder:** `pass1-*` and `after-*` in all 8 variants, plus `*-checks.json`.

**Checks, all 3 states × 8 variants, both passes:** axe-core 0 violations · targets ≥ 56 px · no sideways scrolling. Unit suite (1,139) and typecheck pass.

## What changed from before

**Decision logic is unchanged:**
- accept
- "Not for me" offers one alternative
- a second "Not for me" sets the idea aside until the next cycle

The handlers were moved over as they were.

**Presentation:**
- **Your steps comes first.** Each accepted step is a large button that toggles "Done today": a check in a filled circle, a heavier green border and the words "Done today" / "Not done yet today". The card shows "1 of 2 done today." The store already supported this, but nothing used it.
- **Ideas to try.** One card per idea, with a plain category label. Category names are in everyday words ("Moving more", "Time with people", "Keeping your mind busy", in place of "Aerobic & Exercise", "Social Engagement", "Cognitive Training"). The colored lucide icons with no labels are gone.
- **Set-aside ideas** become one quiet sentence, not a card each.
- **"Your Care Plan / Personalized guidance."** becomes "Your plan" with "Small everyday steps". "Care plan" and "personalized" overstated what sample ideas are.
- **The disclaimer moves from faint gray to body-color text,** and now says to check with a doctor before changing exercise, diet or medicines.
- **The icon-only back arrow is gone.** Plan is a tab now.

## Critique and fixes

**Pass 1 found:**
1. **The demo state carried over between captured variants** (it lives in sessionStorage), so later variants showed earlier clicks. The capture script now clears it before every variant. Rollout 4's check-in "after" captures were retaken for the same reason.
2. **Twelve outlined buttons in a row of six cards** made a wall of equal boxes. Each card now has one clear choice: "Add to my plan", outlined in the accent color. "Not for me" is a quieter underlined text button, still a full 56 px target.

**Pass 2:** no new issues.

**Known:** the ideas are the original fixed sample set. Real personalization, driven by area scores and check-ins, comes with the real Remembrance Score.
