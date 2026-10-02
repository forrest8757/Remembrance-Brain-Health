# Redesign rollout: before / after evidence

Design language: [../DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) (§7 "As built"). Each folder has its own README with the critique passes and fixes.

| # | Screen | Route | Folder |
|---|---|---|---|
| 1 | Home | `/dashboard` | [home/](home/README.md) |
| 2 | Domain detail | `/domain/:area` | [domain-detail/](domain-detail/README.md) |
| 3 | Weekly session intro + completion (chrome only) | `/assess/session` | [session/](session/README.md) |
| 4 | Daily check-in | `/check-in` | [check-in/](check-in/README.md) |
| 5 | Trends | `/progress` | [trends/](trends/README.md) |
| 6 | Plan | `/plan` | [plan/](plan/README.md) |
| 7 | Onboarding | `/welcome` | [onboarding/](onboarding/README.md) |
| 8 | Settings | `/settings` | [settings/](settings/README.md) |

**Capture tags:** `before-*` = the old page from git HEAD · `pass1-*` = first build · `after-*` = after fixes · `final-*` = the closing re-verification of every screen.

**Final re-verification (2026-10-02)**, plus onboarding's extended steps 4–7, verified the same way afterwards (see its README):
- **Coverage:** 24 screen states × 8 variants (dark/light × 390/1280 px × 100/200% text, reduced motion), 192 captures.
- **Result:** all clean: axe-core 0 violations, every target ≥ 56 px, no sideways scrolling, no text cut off.
- **Unit suite:** 1,150 tests pass, including theme contrast and the no-hard-coded-values lint.
- **Session-shell flows:** all four pass.

Regenerate any screen from `scripts/`: `node src/screenshot-rollout.mjs <folder> <route> [--state fixtures/x.json] [--click "A|B|fill:#id=text"] [--tag t]`.
