# Home: three directions (redesign Phase 2)

Static screens with realistic fake data, built from [DESIGN_LANGUAGE.md](../../DESIGN_LANGUAGE.md).

- **Source:** `artifacts/mockup-sandbox/src/components/mockups/home-directions/`
- **Preview:** `http://127.0.0.1:5174/preview/home-directions/{OuraCalm|WatchRings|DashboardSoft}?theme={dark|light}&text={100|200}`
- **Captures:** `scripts/src/screenshot-home-directions.mjs`

**Files:** `{a-oura-calm|b-watch-rings|c-dashboard-soft}-{dark|light}-{390|1280}-{100|200}.png`. Each is the full page, with a `-first-screen.png` showing exactly what the person sees on opening. That's 24 variants and 48 images. `checks.json` holds the automated results.

**Automated checks, every variant** (run with reduced motion): **axe-core 0 violations · every link/button ≥ 56 × 56 px · no sideways scrolling at 200% text.** All 24 pass.

All three share the same content: greeting + date, the Remembrance Score with a status word and one sentence, the five domains, this week's session, today's check-in, one insight, the context chips, and consistency. One primary action per screen: **Start your session**, the only filled button.

## Decisions applied (approved in Phase 1)

- Tap targets ≥ 56 px, primary actions 64 px. Ladle for stories, no Storybook. axe-core added to `scripts`.
- **Light-mode rings** use dark teal `#0B6B75` (6.2:1) with the cyan as a glow behind; cyan alone was 1.9:1.
- **Domain colors** (arcs, dots and sparklines only; every one also labeled):

| Domain | Dark | Light | Contrast (dark card / white card) |
|---|---|---|---|
| Memory | periwinkle `#9BA9FF` | `#4353C7` | 7.1 / 6.4 |
| Attention | lime `#C9E77A` | `#4F6B00` | 11.4 / 6.1 |
| Executive Function | orchid `#D9A3F2` | `#8B3FB0` | 7.8 / 6.1 |
| Language | gold `#F0D36E` | `#7A6100` | 10.7 / 5.9 |
| Orientation | rose `#FF9EC7` | `#B8336A` | 8.2 / 5.6 |

- **Status** is always word + icon + shape: ✓ filled circle "Steady", ◐ half circle "Worth watching", ◆ diamond "Needs attention".
- **Large text (≥150%) on a phone:** the five-tab bar can't fit five readable labels in one row. Instead of shrinking the labels (iOS does this, but it breaks the text-size rule) or hiding tabs behind "More", the navigation moves to the top as a two-column block with icons and full labels. At 100% it's a normal bottom tab bar; on the web it's a labeled side rail.

## Fixes made during review (2 passes)

1. **Pass 1:** B's decorative glow and the 200% layouts caused sideways scrolling (minimum widths doubled with the text). Glow clipped, minimum widths capped to the screen.
2. **Pass 1:** B's Attention ring (sky blue) was too close to the cyan score ring. Attention is now lime.
3. **Pass 1:** C's "Steady" chip stretched across its card. Now sized to its text.
4. **Pass 1:** B's legend wrapped unevenly. Name above, score + status on one line.
5. **Pass 2:** at 200% the tab labels overlapped ("HomeTrendsSession…"). The large-text navigation above fixes it.
6. **Pass 2:** icons shrank to zero width next to long labels. Icons no longer shrink.

## A, "Oura Calm"

One giant ring, then a calm list.

**Pros:**
- The calmest and most legible; nothing competes with the score.
- "Your five areas" is a simple list (colored dot, name, score, status, one sentence), so there's no chart literacy needed.
- Shortest decision path: score → session button.

**Cons:**
- The least distinctive; it could be any wellness app.
- The domains carry no visual identity beyond small dots.
- No trend shown on Home (it lives in Trends).

**Older-adult critique:**
- Best for low vision and lower confidence with tech: one focal point, large type, a single obvious action.
- The list rows put the status chip on its own line, which makes the list longer but easy to scan.
- At 200% text the score still fills the first screen with no crowding.

## B, "Watch Rings"

The score ring wrapped in five concentric domain rings.

**Pros:**
- The most recognizable and "ownable": it becomes Remembrance's Activity Rings.
- Everything fits in one hero card, and it looks premium in both themes.

**Cons:**
- Six rings is a lot of color in one place, and the inner rings get small.
- Reading it needs the legend: the rings can't be labeled on themselves, so we label them beside, with a "outer ring to inner…" sentence.
- On phones the legend pushes the session card below the first screen.

**Older-adult critique:**
- The rings are decoration plus a summary; the legend carries the meaning. That's fine for rule 2, but people with reduced color vision will rely entirely on the legend, so the rings add beauty more than information.
- Ring order is arbitrary to a user. Expect "which ring is mine?" confusion, which is why every row is labeled with name, score and status.

## C, "Dashboard Soft"

A compact score and five domain cards with 10-week trends.

**Pros:**
- The most information up front: each area's score, status, sentence and a trend line.
- The session button is in the first screen on phones.
- On the web it looks like a real, useful dashboard.

**Cons:**
- The longest page on phones (five full cards).
- The smallest hero, so it feels less like Oura.
- Sparklines invite comparing small wiggles.

**Older-adult critique:**
- The most to read. Sparklines are weekly and calm, but some people will over-read small dips.
- At 200% text each card becomes very tall: five cards is a long scroll.
- Good for engaged, data-curious users; heavier for anyone anxious about decline.

## Recommendation

**A as the base, borrowing B's identity:**
- **Home:** A's hero and calm list, with the five domain colors as small arcs (B's mini-ring style) in the list instead of plain dots, so the brand still has its rings.
- **Domain detail screens:** C's domain cards and trend lines go there, where someone has chosen to look at trends.
- **Why:** this keeps Home the calmest, keeps the rings as the brand, and avoids putting every wiggle on the first screen.
