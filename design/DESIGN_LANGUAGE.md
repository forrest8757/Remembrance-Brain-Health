# Remembrance Design Language: Oura × Apple Watch, older-adult-first

**Status:** Phase 1 draft, awaiting approval. Once approved, it replaces CLAUDE.md §9. It changes the visual and UX layer only: test logic, scoring and the Standardization Firewall (§4) are untouched.

**The vibe in one line:** *a calm, glowing instrument panel for your brain. Big clear numbers, soft light, nothing shouting.*

**The filter:** keep the vibe, and remove every pattern that makes things hard for a 55–90-year-old. When looks and usability conflict, usability wins.

---

## 1. References studied (`/design/references/`)

| # | File | What it is |
|---|---|---|
| 1 | `01-hospital-patient-detail.jpg` | Clinic patient-detail dashboard (light, pastel sparkline cards) |
| 2 | `02-system-health-dashboard.jpg` | "System Health, Normal." AI-ops dashboard (light, lime/violet accents, one dark gradient card) |
| 3 | `03-whoop-health-monitor.jpg` | WHOOP Health Monitor: five vitals cards with "within range" chips |
| 4 | `04-whoop-home-plan-dashboard.jpg` | WHOOP Home / My Day / My Dashboard: three rings, metric rows |
| 5 | `05-oura-classic-sleep-readiness.jpg` | Oura (classic): sleep ring, "YOU'RE MAKING PROGRESS", readiness bars |
| 6 | `06-apple-fitness-summary.jpg` | Apple Fitness Summary: Activity Rings, week of mini-rings, bar charts |
| 7 | `07-oura-vitals.jpg` | Oura Vitals: Readiness / Sleep / Activity cards with range bars |
| 8 | `08-oura-spotlight-readiness.jpg` | Oura Today: a row of score circles, Spotlight hero arc over a photo |
| 9 | `09-oura-readiness-activity-detail.jpg` | Oura Readiness / Activity / workout detail: hero arcs over photographic cards |

The dark wearables (3–9) set the mood. The two light dashboards (1–2) show how the same calm translates to a cream or white light mode.

---

## 2. What makes them feel premium and calm

### Color
- **A deep, near-black base, never pure black.** WHOOP uses charcoal (#1A1D21-ish), Oura deep navy and night-blue, Apple pure black with very saturated rings. The navy and charcoal bases feel softer and more "night sky" than Apple's black.
- **Few colors, each with one job.** Apple gives each ring a color (Move red, Exercise green, Stand cyan). WHOOP gives each pillar one (sleep blue, recovery green, strain blue). Oura is almost monochrome white on dark, with color coming from the photography.
- **Status color is muted, not alarming.** WHOOP's "within range" is a small green check chip; its one warning ("! low < 95") is amber, not red.
- **Light dashboards (1–2)** use white cards on a pale gray or blue field, with pastel gradients (lavender, mint, pink) under each sparkline.

### Light and glow
- **Light is the color.** Oura's hero cards are photographs (mountains, ocean, aurora, nebula) with the arc glowing on top. WHOOP's "Daily Outlook" pill is a warm-to-cool gradient. Reference 2 has a single deep-teal gradient card as the only dark element on the page.
- **Rings have a dim full track and a bright filled arc** (Apple, WHOOP). The unfilled track reads as "possible", the bright arc as "done". Nothing is drawn with a hard outline.

### Type hierarchy
- **One enormous number per view** (Oura 87, 90, 456; WHOOP 79 BPM; Apple 81/270). Everything else is much smaller.
- **Labels are small, letter-spaced caps** (READINESS, RESPIRATORY RATE, HEALTH MONITOR), set in a lighter tone than the value.
- **A short headline gives the number meaning** ("Bring it on", "Push yourself?", "YOU'RE MAKING PROGRESS"), followed by one or two sentences of plain encouragement.
- **Oura uses thin, light weights for big numbers.** It looks elegant, but it's the first thing we change (§3).

### Spacing rhythm
- A vertical feed of cards with consistent gutters (roughly 12–16 px) and generous inner padding.
- **One idea per card.** Oura shows one score per card. WHOOP fits two small cards in a row at most.
- Plenty of empty space around the hero. The hero alone takes the first screen.

### Card treatment
- Large radii (about 16–24 px), surfaces one step lighter than the background, no heavy shadows. Depth comes from the tonal step and, on Oura, from imagery.
- A card's header row reads label left, arrow or chevron right ("→" or "›" meaning "there's more").
- The light references float white cards on a tinted field with a faint shadow.

### Data visualization
- **Rings and arcs as identity:** Apple's three concentric rings, WHOOP's three side-by-side rings, Oura's 3/4 arc with the number in the center, and Apple's week strip of seven mini-rings.
- **Range bars with a marker** (Oura Vitals): a thin track, a highlighted "your normal" band and a dot for today. You see "where you are versus usual" at a glance, without a chart.
- **Thin smooth lines with soft gradient fill**, no gridlines, few labels (references 1, 2, 9).
- **Within-range chips** (WHOOP): "✓ within 16.5–16.9" puts a word and an icon next to every number.
- Bar charts for history (Oura readiness bars, Apple hourly bars) are minimal and unlabeled.

### Motion (inferred from the products)
Rings sweep to their value on open, numbers count up, the hero glow breathes slowly. Transitions are soft fades, with no bounce.

### Tone of copy
Warm, short and second-person: "You're making progress", "Bring it on", "A great night's sleep can boost your readiness…". WHOOP explains a metric in one plain sentence ("A high HRV indicates your body is in balance"). Nothing is clinical or alarming.

---

## 3. What we keep / what we change for older adults

Each reference pattern gets a **KEEP**, **ADAPT** (with how) or **DROP** (with why). Rule numbers refer to the Accessibility Rules in the brief.

| Pattern (reference) | Decision | How / why |
|---|---|---|
| Deep navy base, not pure black (Oura, WHOOP) | **KEEP** | `bg.base #0B1426`. Calmer than black, with less halation for aging eyes than pure black against white text. |
| One accent color used as light (Oura, ref 2) | **KEEP** | Cyan `#1BCEDF` only as a light source: rings, glow, active states. Never decoration everywhere. |
| One color per ring (Apple, WHOOP) | **ADAPT** | Five domains each get a hue for their arc, but **every arc also carries its name and status word** (rule 2). Hues are spaced for common color-vision deficiencies (no red/green pair alone). |
| One giant hero number per screen (all) | **KEEP** | The Remembrance Score is the hero on Home. |
| Thin, light weights for big numbers (Oura) | **ADAPT** | Hero at 72–96 px in **weight 500–600** (rule 1). Thin strokes vanish for low-vision readers. |
| Small letter-spaced caps labels (Oura, WHOOP) | **ADAPT** | Allowed, but **never below 16 px**, weight ≥ 500, and in `text.secondary` (≥ 6.5:1), never dimmer (rule 1). |
| Dim gray captions ("Zone 0", "Total 882 CAL", axis ticks) | **DROP** | Low-contrast gray text is the most common failure for older eyes. There's no text tone dimmer than `text.secondary` (rule 1). |
| Headline + one-sentence meaning ("Bring it on") | **KEEP** | "Your memory has been steady this month." Every number gets a meaning (rule 13). |
| Text over photographs / gradients (Oura Spotlight, WHOOP Outlook) | **ADAPT** | Imagery and glow sit **behind** a solid card or a solid text backing that meets the contrast table, never directly behind words (rule 3). No photographic text backgrounds. |
| Within-range chips "✓ within …" (WHOOP) | **ADAPT** | Our status chip = **icon + word + shape**: "✓ Steady", "◐ Worth watching", "◇ Needs attention". No numeric ranges on primary screens (rule 11). |
| Amber "! low" warning (WHOOP HRV) | **ADAPT** | Never "low" or "warning" for cognition. Use "Worth watching" plus what to do next plus an offer to talk to someone (rule 15). |
| Range bar with "your normal" band and a marker (Oura Vitals) | **KEEP** | Excellent for older adults: no axes or reading of values, just "where am I versus my usual". Marker ≥ 10 px, track ≥ 3 px (rule 4). |
| Concentric rings (Apple) | **ADAPT** | Candidate for direction B. The inner rings get small and thin, so rings stay ≥ 12 px stroke and the innermost ring keeps a usable size. Labels sit **outside** the rings, not on them. |
| Week strip of seven mini-rings (Apple) | **ADAPT** | We track **weeks, not days** (anti-pattern: daily swings), so it becomes a strip of the last 8–12 weekly mini-rings, each a ≥ 56 px tap target. |
| Row of score circles at the top (Oura Today) | **ADAPT** | Five domain mini-rings in a row works at 1280 px. At 390 px and 200% text it **wraps to two rows**. It never becomes a sideways scroller (rule 8). |
| Horizontally scrolling date strip / score strip (Oura "30 May · Wed 31 May · Yesterday") | **DROP** | Swipe-only, partly off-screen. Replaced with visible ‹ Previous week / Next week › buttons (rules 7–8). |
| Thin line charts, gradient fill, no gridlines (refs 1, 2, 9) | **ADAPT** | Lines ≥ 3 px, points ≥ 10 px, axis labels ≥ 16 px, and a one-sentence summary above every chart. Weekly points only (rule 4). |
| Drag-to-scrub tooltips (refs 2, 9) | **DROP** as the only way | Tap a week chip to see its value. Scrubbing may exist as a bonus (rule 7). |
| Dense metric rows (WHOOP My Dashboard: HRV, RHR, steps, zones, VO₂…) | **DROP** | Too many numbers and too much jargon. We show at most about 6 cards above the fold and no jargon on primary screens (rule 11, anti-patterns). |
| Jargon labels (HRV, RHR, VO₂ MAX, "Strain", "Zone 0") | **DROP** | Plain words only on primary screens. Technical terms live behind "Learn more" (rule 11). |
| Icon-only controls (share, settings, "+", hamburger) | **DROP** | Every icon gets a visible label. No hamburger menus. A floating "+" becomes a labeled button (rules 5, 10, 12). |
| Floating "+" action button (WHOOP, Oura) | **DROP** | It covers content and is unlabeled. The one primary action per screen is a full-width labeled button. |
| Bottom tab bar, icon + label (Apple, Oura, WHOOP) | **KEEP** | Max 5 tabs, icon **and** label, ≥ 56 px tall, active tab shown by color **and** a bar or shape (rules 5, 10). |
| Small chevrons "›" as the only "tap for more" cue | **ADAPT** | The whole card is the tap target (≥ 56 px), with a visible "See details" text affordance (rule 6). |
| Count-up numbers, ring sweep, breathing glow | **KEEP, with limits** | Load only, 800–1200 ms, ease-out. The glow breathes on the hero only (6–8 s). All off under reduced motion. No bounce, parallax or carousels. |
| Toast confirmations and auto-dismissing sheets | **DROP** | Messages stay until dismissed (rule 9). |
| Big encouraging "YOU'RE MAKING PROGRESS" (Oura classic) | **ADAPT** | Keep the warmth, at sentence case for readability, and never tied to a single week's swing. |
| Light dashboards' white cards on a tinted field (refs 1, 2) | **KEEP** | That's the light mode: white cards on cream `#F5F1EA`. Pastel sparkline fills are kept, but lines use the darker text-safe hues. |
| Pastel status text on white (ref 1 "High (mg/dl)" in pink) | **DROP** | Pale tints fail as text. Status text uses the light-mode status tokens (≥ 4.7:1). |
| Frosted glass nav (Apple) | **ADAPT** | Only behind decoration, never behind words, which always get a solid backing. |
| Gamified streak pressure | **DROP** | StreakMeter shows consistency ("4 of the last 5 weeks"), never a broken streak or a lost badge. |

---

## 4. Token check (computed, WCAG 2.x)

Your contrast figures all check out. The only difference is `status.steady` on base at **10.8:1**, versus 10.9 in the brief. Pairs the brief didn't list, but that we'll use:

| Pair | Ratio | Verdict |
|---|---|---|
| `accent #1BCEDF` on `bg.surface` | 8.2 | ✓ |
| `status.steady / watch / attention` on `bg.surface` | 9.3 / 9.0 / 6.6 | ✓ (attention on cards is fine for labels; body copy stays in `text.primary`) |
| `text.primary` on `bg.elevated #1E3A5F` | 10.5 | ✓ |
| `text.secondary` on `bg.elevated` | **6.5** | Fine for labels, **not body text** (rule 1 asks 7:1 for body). Body on elevated surfaces uses `text.primary`. |
| Light: `text.secondary #4A5568` on cream | **6.7** | Labels only, **not body text**, as above. |
| Light: `text.secondary` on white card | 7.5 | ✓ body OK on cards |
| Light: `accent.text #0B6B75` on white | 6.2 | ✓ |
| Light: status tokens on white | 5.3 / 5.4 / 6.5 | ✓ labels |
| **Light: `accent.fill #1BCEDF` ring on white card** | **1.9** | ✗ **Fails WCAG 1.4.11 non-text contrast (3:1).** The ring is how the score is read, so it must be visible. |

**Three things the token set needs, before Phase 2:**
1. **Light-mode rings fail.** Cyan `#1BCEDF` on a white card is 1.9:1, and about 1.7:1 on cream, below the 3:1 minimum for graphics. **Proposal:** in light mode, draw the ring's filled arc in `accent.text #0B6B75` (6.2:1) with the bright cyan kept as a soft glow behind it. Alternatively, put a 2 px `#0B6B75` edge on the cyan arc. The same applies to the five domain hues: each needs a light-mode variant ≥ 3:1 on white.
2. **`text.secondary` is a label tone, not a body tone** in two places: dark-mode elevated surfaces (6.5:1) and light-mode cream (6.7:1). The token docs will say "labels only on these surfaces", and the contrast unit test will enforce it per surface.
3. **Five domain hues aren't defined yet.** The rings need five colors that are distinct for common color-vision deficiencies, ≥ 3:1 on both surfaces, and never the only cue (each arc is labeled). I'll propose them in Phase 2.

---

## 5. Remembrance components, mapped to the references

| Component | Draws on | Older-adult adaptations |
|---|---|---|
| **ScoreRing** (hero 280 px, compact 120 px) | Oura Spotlight arc, Apple ring, WHOOP rings | Weight-600 number, label + status word **inside or below**, ring ≥ 16 px stroke at hero size, breathing glow on hero only |
| **DomainArcs**: concentric (B) and mini-ring row (A/C) | Apple concentric rings, Oura Today circles | Each arc labeled with name + score + status word; the row wraps at 200% text; never a carousel |
| **DomainCard** | Oura Vitals card | 8–12 weekly points, line ≥ 3 px, one plain sentence, whole card tappable |
| **TrendChart** | refs 1, 2, 9 | Weekly only; tap-a-week chips; one-sentence summary above; no gridlines; axis labels ≥ 16 px |
| **Range bar** (inside DomainCard / detail) | Oura Vitals | "Your usual" band + today's marker ≥ 10 px |
| **Status chip** | WHOOP "within range" | Icon + word + shape: Steady / Worth watching / Needs attention |
| **WeeklySessionCard, CheckInCard** | WHOOP Today's Activities, "Your Daily Outlook" | One big labeled button, time estimate in words ("About 1 minute"), clear done state with ✓ + word |
| **InsightCard** | Oura Readiness copy, WHOOP "Elevated HRV" card | One plain sentence, optional "Learn more"; no jargon |
| **ContextRow** | WHOOP Health/Stress monitor tiles | Chips with icon + word (Sleep: "Rested"); wraps rather than scrolls |
| **StreakMeter** | Apple week strip | Weekly mini-rings, "4 of the last 5 weeks", no broken-streak language |
| **TabBar / TopBar / Sheet / Toggle / Buttons** | Apple, Oura nav | Labeled icons, ≥ 56 px targets (64 px primary), back button always top-left, sheets dismissed only by the user |

---

## 6. Decisions (resolved 2026-10-02)

All eight were approved as proposed ("go with your picks"). Item 5 changed as built: the redesign's tokens live in `lib/ui/src/theme.css` + `theme.ts` (the Clarity tokens in `tokens.css` remain for the assessment screens and are remapped per theme). Item 8 stands: Home, Domain detail and Trends show labeled **sample** scores until a real Remembrance Score exists.

1. **Tap targets: 56 px minimum (brief) vs 64 px (current CLAUDE.md §9).** I propose 56 px minimum for secondary controls and 64 px for primary actions and for **every target in the test-protocol screens** (TapPad, DoneButton stay at least as large as today).
2. **Dark mode becomes the default (following the system), with cream light mode selectable.** Today's built screens are cream-only. The test screens get both themes through the same tokens, with Firewall behavior unchanged.
3. **Storybook vs Ladle.** The repo already uses **Ladle** for stories, and adding Storybook is a new dependency (CLAUDE.md: ask first). I propose keeping Ladle (same story format, already set up). Say the word if you want Storybook specifically.
4. **axe-core in Playwright** (`@axe-core/playwright`) is a new dev dependency, needed for the "zero violations" check. OK to add?
5. **Paths:** the brief's `packages/ui` is `lib/ui` in this repo. Tokens live in `lib/ui/src/tokens.ts` and `tokens.css`.
6. **SF Pro on web:** Apple's license allows SF Pro only on Apple platforms, so the web uses **Inter** (already in use), with the iOS system font when we build native.
7. **Light-mode ring contrast fix** (§4.1): darker arc with a cyan glow behind it, or a darker edge on the cyan arc. I recommend the darker arc.
8. **"Remembrance Score" and domain statuses** need data the app doesn't produce yet: the tests give per-test official scores, and there's no 0–100 composite or domain mapping. Phase 2 uses **realistic fake data**, as the brief says. Computing the real score is a separate scoring decision (it must stay "wellness, not diagnostic").

## 7. As built (Phase 3, rollouts 1–8)

**Where things live**
- **Tokens:** `lib/ui/src/theme.css` (CSS variables under `.ds-root[data-theme='dark'|'light']`, `ds-` classes) mirrored in `theme.ts`. All sizes in rem, so text size scales everything except border widths.
- **Components:** `lib/ui/src/components/app.tsx`. ThemeRoot, AppShell (rail / tab bar), ScoreRing, DomainRing, DomainRow, StatusChip, SessionCard, CheckInCard, InsightCard, ContextRow, StreakMeter, TopBar, TrendChart, UsualRangeBar, ChoiceGroup, CheckList. Stories: `lib/ui/stories/app.stories.tsx` (Ladle; controls for theme, text size, movement).
- **Preferences:** `rm.display` = `{theme, textSize, motion, captions}`, set in Onboarding and Settings. ThemeRoot applies them: root font size, `data-theme`, `data-large-text` (≥ 150%), `data-reduce-motion`, `data-captions`, and Framer Motion's `MotionConfig`.
- **Theme bridge:** inside `.ds-root` the Clarity `--color-rm-*` variables are remapped per theme, so the session and test screens follow the chosen theme without layout or behavior changes (Standardization Firewall untouched).

**Rules the code enforces**
- **Contrast:** `lib/ui/src/theme.test.ts` checks every token pair the components use, in both themes (body 7:1, labels 4.5:1, graphics 3:1), and that `theme.css` matches `theme.ts`.
- **No hard-coded colors or sizes:** `lib/ui/src/no-hardcoded.test.ts` fails on hex, rgb/hsl or px sizes in the redesigned screens. Exceptions need `ds-allow: <reason>`.
- **Per screen:** `scripts/src/screenshot-rollout.mjs` captures dark/light × 390/1280 px × 100/200% text with reduced motion. It fails on any axe-core violation, any target under 56 px, sideways scrolling, or text cut off. Results and before/after captures are in `design/rollout/<screen>/`.

**Large text (≥ 150%)**
- On a phone, the tab bar moves to a wrapping block at the top.
- Assessment screens use the one-column phone layout at any width.
- Card and choice padding stop growing (`min(…, 5vw)`), and headings hyphenate.

**Things deliberately not offered**
- **A voice-speed setting.** Activity instructions and items play at one standard pace so results stay comparable week to week, and the only other speech is a few pre-rendered setup lines, which slowing would also lower in pitch. Settings explains this in plain words.
