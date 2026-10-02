// "Calm Clinical" tokens, Clarity direction (design/directions/README.md, B).
// tokens.css mirrors these for Tailwind v4; tokens.test.ts verifies the
// contrast pairs below meet CLAUDE.md §9.

export const color = {
  navy: '#1E3A5F',
  navyDeep: '#152B47',
  cyan: '#1BCEDF',
  cyanDeep: '#129FAD',
  cyanSoft: '#A8EEF4',
  cream: '#F5F1EA',
  creamDeep: '#EBE4D8',
  line: '#DCD6CB',
  meterOff: '#E4E7EC',
  ink: '#1E3A5F',
  inkSoft: '#34495E',
  surface: '#FFFFFF',
  focus: '#1BCEDF',
} as const;

/** Text/background pairs that carry instruction or body text (≥ 7:1 required). */
export const TEXT_PAIRS: [fg: keyof typeof color, bg: keyof typeof color][] = [
  ['ink', 'cream'],
  ['ink', 'surface'],
  ['ink', 'creamDeep'],
  ['inkSoft', 'cream'],
  ['inkSoft', 'surface'],
  ['surface', 'navy'],
  ['cream', 'navy'],
];

export const font = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/** px. Body 20, instructions 28–32 (CLAUDE.md §9 floor: 20 / 24–28). */
export const type = {
  eyebrow: { size: 18, weight: 600, lineHeight: 1.4, tracking: '0.08em' },
  label: { size: 20, weight: 500, lineHeight: 1.4 },
  body: { size: 20, weight: 400, lineHeight: 1.5 },
  lead: { size: 24, weight: 400, lineHeight: 1.5 },
  instruction: { size: 28, weight: 500, lineHeight: 1.4 },
  title: { size: 36, weight: 700, lineHeight: 1.15 },
  display: { size: 44, weight: 700, lineHeight: 1.1 },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 12, md: 16, lg: 28, pill: 999 } as const;

/** Minimum touch target 64 px; primary actions 72 px. */
export const target = { min: 64, primary: 72, gap: 16 } as const;

export const elevation = {
  card: '0 1px 2px rgba(30,58,95,0.06), 0 12px 32px -12px rgba(30,58,95,0.12)',
  sheet: '0 -8px 40px -12px rgba(30,58,95,0.25)',
} as const;

/** Chrome-zone motion only; never above 400 ms (CLAUDE.md §9). */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  breatheMs: 4800,
} as const;

// ---- Contrast helpers -------------------------------------------------------

function luminance(hex: string): number {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (a + 0.05) / (b + 0.05);
}
