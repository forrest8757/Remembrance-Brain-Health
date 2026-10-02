# Rollout 4: Daily check-in

Page: [`artifacts/remembrance/src/pages/check-in.tsx`](../../../artifacts/remembrance/src/pages/check-in.tsx), route `/check-in`. New shared component: `ChoiceGroup` in [`lib/ui/src/components/app.tsx`](../../../lib/ui/src/components/app.tsx), reused next by Onboarding and Settings.

| State | How it's captured (from `scripts/`) | Folder |
|---|---|---|
| Empty form | `node src/screenshot-rollout.mjs check-in/form /check-in` | `form/` |
| Answered | `… check-in/answered /check-in --click "Good\|7 to 8 hours"` | `answered/` |
| Saved | `… check-in/saved /check-in --click "Good\|7 to 8 hours\|Save check-in"` | `saved/` |
| Missing an answer | `… check-in/missing /check-in --click "Save check-in"` | `missing/` |

- **Before:** `before-390.png`, `before-1280.png`, the old page captured from git HEAD.
- **Each state folder:** `pass1-*` and `after-*` for `{dark,light}-{390,1280}-{100,200}` (plus `-first-screen`), and `*-checks.json`.
- **Script change:** `screenshot-rollout.mjs` gained `--click` (taps exact text in order before capturing). Its tap-target check now covers choice rows too.

**Checks, all 4 states × 8 variants, both passes:** axe-core 0 violations · every link, button and choice ≥ 56 × 56 px · no sideways scrolling. Unit suite (1,139) and the shell flows still pass.

## What changed from before

| Before | After | Rule |
|---|---|---|
| Sleep on a **drag slider** | Five one-tap answers ("7 to 8 hours") | No gestures beyond a single tap |
| Mood as **bare numbers 1–5**, labeled only at the ends ("Rough"/"Great") in faint gray caps | Five answers in words: Great, Good, Okay, A bit low, Low | Plain language; no dim text |
| Mood **pre-selected at 4**, sleep at 7 h, so saving without answering recorded a made-up day | Nothing chosen until you choose. Save asks gently for anything missing ("Please choose how long you slept first."). Today's answers are pre-filled only if you already checked in | Honest data |
| Selected = cyan fill only | Filled dot + heavier border + tinted background | Never color alone |
| Icon-only back arrow | "Back to Home", top-left | Labeled icons; back always top-left |
| Silent jump back to the dashboard | A saved screen ("Thanks. Today's check-in is saved."), with Back to Home and Change my answers. The heading takes focus so screen readers announce it | Clear done state |
| No time estimate | "About 1 minute" | Time in words |

Data shape unchanged (`{mood 1–5, sleep hours, notes}`). Sleep is stored as the middle of the chosen band, so Home's context chips ("Rested", "Short night") and its insight keep working.

## Critique and fixes

**Pass 1 found:**
1. **The mood answers wrapped 3 + 2 at desktop width,** breaking a scale across rows. Both questions are now one column, in the same order as they read.
2. **The note box's edge was about 1.3:1 against its card.** That edge is the only sign there's a field, and WCAG 1.4.11 wants 3:1, so it now uses `text-2`. The choice rows can keep their light edge because their radio circles meet 3:1.
3. **Full-page desktop captures showed the rail's links mid-page.** That's an artifact of sticky positioning during Playwright's stitching; real scrolling keeps them pinned. The script now un-sticks them for full-page shots.

**Pass 2 found:**
4. **At 200%, the desktop rail's icons stayed 24 px beside doubled labels.** Nav icons are now em-sized, so they grow with the text, except in the phone's two-column large-text tab block. There, at 1.2em the labels ran into each other ("Trends" clipped), so those icons stay 24 px and the label gets the room. Home was recaptured to confirm.

**Known, by design:** the saved screen has "Back to Home" twice: the top-left link (always present) and the primary button. That matches the session completion screen.
