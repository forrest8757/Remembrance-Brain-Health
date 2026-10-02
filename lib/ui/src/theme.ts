// Remembrance app theme tokens (design/DESIGN_LANGUAGE.md), mirrored in
// theme.css. theme.test.ts checks the contrast of every pair the components
// use, and that the two files agree.

export type ThemeName = 'dark' | 'light';

export const THEME = {
  dark: {
    bg: '#0b1426',
    surface: '#16233a',
    elevated: '#1e3a5f',
    text: '#f2f5f8',
    text2: '#b8c4d4',
    accentText: '#1bcedf',
    ringArc: '#1bcedf',
    primaryBg: '#1bcedf',
    primaryText: '#0b1426',
    steady: '#7fd9a8',
    watch: '#f5b971',
    attention: '#f28b82',
    dMemory: '#9ba9ff',
    dAttention: '#c9e77a',
    dExecutive: '#d9a3f2',
    dLanguage: '#f0d36e',
    dOrientation: '#ff9ec7',
  },
  light: {
    bg: '#f5f1ea',
    surface: '#ffffff',
    elevated: '#ebe4d8',
    text: '#0b1426',
    text2: '#4a5568',
    accentText: '#0b6b75',
    ringArc: '#0b6b75',
    primaryBg: '#0b6b75',
    primaryText: '#ffffff',
    steady: '#1f7a4d',
    watch: '#9a5b00',
    attention: '#b3261e',
    dMemory: '#4353c7',
    dAttention: '#4f6b00',
    dExecutive: '#8b3fb0',
    dLanguage: '#7a6100',
    dOrientation: '#b8336a',
  },
} as const satisfies Record<ThemeName, Record<string, string>>;

type Token = keyof (typeof THEME)['dark'];

/**
 * Every foreground/background pair the components use, with its minimum:
 * 7 for body text, 4.5 for labels and other text, 3 for rings, icons and
 * other graphics that carry meaning (WCAG 1.4.11).
 */
export const USED_PAIRS: { fg: Token; bg: Token; min: number; use: string }[] = [
  { fg: 'text', bg: 'bg', min: 7, use: 'body text on the page' },
  { fg: 'text', bg: 'surface', min: 7, use: 'body text on cards' },
  { fg: 'text', bg: 'elevated', min: 7, use: 'context chips, current tab' },
  { fg: 'text2', bg: 'surface', min: 7, use: 'secondary body text on cards' },
  { fg: 'text2', bg: 'bg', min: 4.5, use: 'labels on the page (date, eyebrow)' },
  { fg: 'text2', bg: 'elevated', min: 4.5, use: 'labels on elevated surfaces' },
  { fg: 'accentText', bg: 'surface', min: 4.5, use: 'links, "Due today"' },
  { fg: 'accentText', bg: 'bg', min: 4.5, use: 'active tab label' },
  { fg: 'primaryText', bg: 'primaryBg', min: 4.5, use: 'primary button label' },
  { fg: 'ringArc', bg: 'surface', min: 3, use: 'score ring on a card' },
  { fg: 'ringArc', bg: 'bg', min: 3, use: 'hero score ring on the page' },
  { fg: 'steady', bg: 'surface', min: 3, use: 'status icon + chip border' },
  { fg: 'watch', bg: 'surface', min: 3, use: 'status icon + chip border' },
  { fg: 'attention', bg: 'surface', min: 3, use: 'status icon + chip border' },
  { fg: 'steady', bg: 'bg', min: 3, use: 'status chip on the page' },
  { fg: 'dMemory', bg: 'surface', min: 3, use: 'domain ring / dot / trend line' },
  { fg: 'dAttention', bg: 'surface', min: 3, use: 'domain ring / dot / trend line' },
  { fg: 'dExecutive', bg: 'surface', min: 3, use: 'domain ring / dot / trend line' },
  { fg: 'dLanguage', bg: 'surface', min: 3, use: 'domain ring / dot / trend line' },
  { fg: 'dOrientation', bg: 'surface', min: 3, use: 'domain ring / dot / trend line' },
];

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** The five cognitive domains, in display order. */
export const DOMAIN_KEYS = ['memory', 'attention', 'executive', 'language', 'orientation'] as const;
export type DomainKey = (typeof DOMAIN_KEYS)[number];
export const DOMAIN_NAMES: Record<DomainKey, string> = {
  memory: 'Memory',
  attention: 'Attention',
  executive: 'Executive Function',
  language: 'Language',
  orientation: 'Orientation',
};
