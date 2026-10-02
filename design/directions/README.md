# P0 Design Directions

> **Decision (2026-09-29): B · Clarity.** Implemented in `lib/ui`; component screenshots in `design/clarity-ui/`.

Three visually distinct directions for the assessment experience. Each is shown on the same six screens with identical copy, so they differ only in visual language. Pick one; it becomes the token set for `lib/ui`.

- **Live previews:** run `PORT=5174 BASE_PATH=/ vite dev` in `artifacts/mockup-sandbox`, then open `/preview/assessment-directions/{Sanctuary,Clarity,Companion}`. Add `?screen=<key>` to see a single screen.
- **Screenshots:** `<direction>-<screen>-<390|1280>.png`, 36 files. Regenerate with `pnpm --filter @workspace/scripts screenshot-directions`.
- **Screens:** `welcome`, `mic-check`, `examiner-speaking`, `listening`, `break`, `complete`.

## Shared across all three
- **Contrast:** instruction text is navy (#1E3A5F) or ink-soft (#34495E). It is ≥ 8.2:1 on every background used, which clears the CLAUDE.md §9 floor of 7:1. Cyan is used only for the orb and accents. Navy on cyan measures 6.0:1, so cyan never sits behind text.
- **Type and targets:** body text is ≥ 20 px, instructions are 24–32 px, primary buttons are 72 px tall and secondary controls 64 px. There is one primary action per screen.
- **Orb:** reacts to (fake) amplitude only. There is no colour or state change tied to correctness. It breathes on a fixed 4.8 s cycle while the examiner speaks. Under `prefers-reduced-motion` all animation stops and the orb shows a static mid state.
- **Protocol screens** (examiner speaking, listening) carry only a caption of the *instruction*, activity-level progress, Pause and "I'm finished". They show no stimuli, no counters and no item progress.
- **Break** uses a non-verbal breathing pacer (4 s in, 6 s out), which is an allowed delay filler under §10.
- **Complete** shows a consistency streak and no scores.

## A · Sanctuary
Maximal calm. The orb is the hero, a large glassy cyan sphere with two faint ripple rings on a wide field of cream. Headings use a Source Serif 4 display face and body text is DM Sans. Everything is centred with very little chrome: a quiet wordmark, dot progress and an outlined Pause. It reads like a meditation app, which suits anxious first-time users and makes the orb unmistakably the thing to watch and talk to. The risk is that the generous space and serif type feel slightly "spa" rather than health-grade, and there's little room for extra UI on later setup screens (hearing and environment checklists).

## B · Clarity
Apple Health–style precision. Inter throughout, with bold tight headings, uppercase eyebrows, left-aligned reading order and white cards on cream. On desktop it uses a two-column layout (copy left, orb card right); on phones the orb card stacks above the copy. The orb is compact and precise: a solid core inside a 48-segment level ring, like a meter. It conveys trustworthiness and measurement, and scales best to dense chrome-zone screens (consent, environment checklist, results). The risk is that it's the coolest emotionally, and the segmented meter can read as a score if it isn't kept strictly amplitude-driven.

## C · Warm Companion
Soft and friendly. Plus Jakarta Sans (the existing app font), big rounded cards, a warm peach-to-cream gradient and a small flat illustration (mug and plant on a kitchen table) on chrome screens. The orb is an organic blob whose outline gently deforms with voice amplitude. Protocol screens deliberately drop the gradient and cards to a plain cream field, so the warmth stays in the chrome zone. It's the most approachable for users aged 70+ and continues the current app's visual language. The risk is that the illustration style has to be extended consistently (it needs an illustration system), and the blob is harder to render identically on the phone channel's companion screens.

## Recommendation
**C (Warm Companion) for the chrome zone plus Sanctuary's calm, centred protocol screens.** C already switches to a plain field for protocol states, so this is mostly adopting A's larger centred orb there. If you want a single pure direction, C is closest to Remembrance's current app and audience.
