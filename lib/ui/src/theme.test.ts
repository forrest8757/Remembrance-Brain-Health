// Every token pair the app components use meets its contrast minimum, in both
// themes, and theme.css matches theme.ts (design/DESIGN_LANGUAGE.md §4).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, THEME, USED_PAIRS, type ThemeName } from './theme';

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');
const CSS_NAME: Record<string, string> = {
  bg: 'bg', surface: 'surface', elevated: 'elevated', text: 'text', text2: 'text-2', accentText: 'accent-text', ringArc: 'ring-arc',
  primaryBg: 'primary-bg', primaryText: 'primary-text', steady: 'steady', watch: 'watch', attention: 'attention',
  dMemory: 'd-memory', dAttention: 'd-attention', dExecutive: 'd-executive', dLanguage: 'd-language', dOrientation: 'd-orientation',
};

describe.each(['dark', 'light'] as ThemeName[])('%s theme', (theme) => {
  it.each(USED_PAIRS.map((p) => [`${p.fg} on ${p.bg} (${p.use})`, p] as const))('%s', (_n, p) => {
    expect(contrast(THEME[theme][p.fg], THEME[theme][p.bg])).toBeGreaterThanOrEqual(p.min);
  });

  it('theme.css declares the same values', () => {
    const block = css.split(`[data-theme='${theme}']`)[1]!.split('}')[0]!;
    for (const [token, hex] of Object.entries(THEME[theme])) {
      expect(block, token).toMatch(new RegExp(`--${CSS_NAME[token]}:\\s*${hex}`, 'i'));
    }
  });
});
