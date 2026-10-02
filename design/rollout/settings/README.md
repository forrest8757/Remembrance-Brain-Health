# Rollout 8: Settings

Page: [`artifacts/remembrance/src/pages/settings.tsx`](../../../artifacts/remembrance/src/pages/settings.tsx), route `/settings` (the Settings tab).

| State | How it's captured (from `scripts/`) | Folder |
|---|---|---|
| Default | `node src/screenshot-rollout.mjs settings/display /settings` | `display/` |
| Less movement + Listen only | `… settings/changed /settings --click "Less movement\|Listen only"` | `changed/` |

There's no "before": Settings didn't exist in git. A Display-only first slice was added during rollout 1 so the themes could be tried.

**Checks, both states × 8 variants:** axe-core 0 violations · targets ≥ 56 px · no sideways scrolling · nothing cut off.

## What's on the page

Every choice applies the moment you tap it, here and on every other screen, including the session and test screens. Choices are stored in `rm.display`, the same place Onboarding writes.

- **Display:**
  - **Colors:** Match my device / Dark / Light
  - **Text size:** Standard / Larger / Large / Largest (100–200%). The page itself is the preview.
  - **Movement:** Match my device / Less movement / Gentle movement. "Less movement" sets `data-reduce-motion`, which stops every CSS animation and transition, and Framer Motion's `MotionConfig`, which reaches the orb, cards and sheets in `lib/ui`. Those components now read `useReducedMotionConfig()` in place of `useReducedMotion()`, which only sees the device setting. That's a motion-source change only; no behavior changed.
- **During activities:**
  - **Captions:** Show written instructions (recommended, the default) / Listen only. "Listen only" sets `data-captions="off"`, which hides the written line of `ExaminerCaption`. Its "Listen" label stays, so the screen never looks empty. Test items are never written anyway (Firewall §4), and the Words by Letter cue isn't a caption, so it stays visible.
  - **Voice pace:** an explanation, not a control.

## Decisions

- **No voice-speed control.** Activity instructions and items must play at one standard pace so results stay comparable week to week (CLAUDE.md §4–5). The only other speech is a few pre-rendered setup lines, and slowing those would also lower their pitch. Offering a control that couldn't apply where it matters would mislead, so the page says why in one sentence.
- **No volume slider.** Sliders need a drag, which the accessibility rules forbid. Volume belongs to the device buttons, which the page names.

## Verification beyond screenshots

A Playwright probe:
1. Chose "Less movement" and "Listen only" here.
2. Opened an activity screen. Its root carried `data-captions="off"` and `data-reduce-motion`, with 0 running animations.
3. Checked a caption line under both settings: hidden with "Listen only", shown by default.

## Critique and fixes

**Pass 1:** clean in all variants. The probe found one issue: with captions off, the whole caption block, including its "Listen" label, disappeared while the voice spoke, leaving the column nearly empty. Only the written line hides now.

**Pass 2:** no new issues.
