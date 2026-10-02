// Design-system lint (redesign DoD): the redesigned screens take every color
// and size from the tokens in theme.css, never hard-coded values, so both
// themes and every text size keep working. A deliberate exception names its
// reason on the same line: `// ds-allow: <reason>` (or `{/* ds-allow: … */}`).
//
// Checked: hex colors, rgb()/hsl() colors, and px sizes (Tailwind `[20px]`
// arbitrary values, `'14px'` strings). Not checked: border and outline widths
// (`2px solid …`), which should stay thin at any text size, and SVG geometry
// (viewBox units, numeric width/height attributes).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const FILES = [
  'lib/ui/src/components/app.tsx',
  'artifacts/remembrance/src/pages/dashboard.tsx',
  'artifacts/remembrance/src/pages/domain-detail.tsx',
  'artifacts/remembrance/src/pages/check-in.tsx',
  'artifacts/remembrance/src/pages/progress.tsx',
  'artifacts/remembrance/src/pages/plan.tsx',
  'artifacts/remembrance/src/pages/welcome.tsx',
  'artifacts/remembrance/src/pages/settings.tsx',
  'artifacts/remembrance/src/home/home-data.ts',
  'artifacts/remembrance/src/home/domain-content.ts',
];

const RULES: { name: string; re: RegExp }[] = [
  { name: 'hex color', re: /#[0-9a-f]{3,8}\b/i },
  { name: 'rgb/hsl color', re: /\b(?:rgba?|hsla?)\(/i },
  { name: 'px size', re: /\[-?\d+(?:\.\d+)?px\]|['"`]-?\d+(?:\.\d+)?px\b/ },
];

/** Every line that breaks a rule without a `ds-allow:` reason. */
export function findHardcoded(source: string): string[] {
  return source.split('\n').flatMap((line, i) => {
    if (/ds-allow:\s*\S/.test(line)) return [];
    // Ignore comments' prose (e.g. "64 px primary") but not code before them.
    const code = line
      .replace(/\/\/.*$/, '')
      .replace(/\{?\/\*.*?\*\/\}?/g, '')
      .replace(/\d+(?:\.\d+)?px (?:solid|dashed|dotted)/g, '');
    return RULES.filter((r) => r.re.test(code)).map((r) => `${i + 1}: ${r.name}: ${line.trim().slice(0, 100)}`);
  });
}

describe('no hard-coded colors or sizes in redesigned screens', () => {
  it.each(FILES)('%s', (file) => {
    expect(findHardcoded(readFileSync(new URL(file, root), 'utf8'))).toEqual([]);
  });
});

describe('the rule itself', () => {
  it('catches hex, rgb and px, and honors ds-allow', () => {
    expect(findHardcoded(`<p style={{ color: '#fff' }} />`)).toHaveLength(1);
    expect(findHardcoded(`<p style={{ background: 'rgba(0,0,0,.5)' }} />`)).toHaveLength(1);
    expect(findHardcoded(`<p className="text-[20px]" />`)).toHaveLength(1);
    expect(findHardcoded(`<p style={{ fontSize: '14px' }} />`)).toHaveLength(1);
    expect(findHardcoded(`<p style={{ color: '#fff' }} /> // ds-allow: brand mark`)).toEqual([]);
    expect(findHardcoded(`<p className="text-[1.2rem]" style={{ color: 'var(--text)' }} />`)).toEqual([]);
    expect(findHardcoded(`// tap targets ≥ 56 px (64 px primary)`)).toEqual([]);
    expect(findHardcoded("<p style={{ border: `2.5px solid ${c}` }} />")).toEqual([]);
  });
});
