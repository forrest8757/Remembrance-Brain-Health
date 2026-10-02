import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { color, contrastRatio, motion, target, TEXT_PAIRS, type } from './tokens';

describe('design tokens', () => {
  it.each(TEXT_PAIRS)('%s on %s meets WCAG AAA (7:1)', (fg, bg) => {
    expect(contrastRatio(color[fg], color[bg])).toBeGreaterThanOrEqual(7);
  });

  it('keeps cyan out of text pairs (fails 7:1 with navy)', () => {
    expect(contrastRatio(color.navy, color.cyan)).toBeLessThan(7);
    expect(TEXT_PAIRS.flat()).not.toContain('cyan');
  });

  it('meets the type, target and motion floors', () => {
    expect(type.body.size).toBeGreaterThanOrEqual(20);
    expect(type.instruction.size).toBeGreaterThanOrEqual(24);
    expect(target.min).toBeGreaterThanOrEqual(64);
    expect(motion.slow).toBeLessThanOrEqual(400);
  });

  it('keeps tokens.css in sync with tokens.ts', () => {
    const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
    const pairs: [string, string][] = [
      ['navy', color.navy], ['cyan', color.cyan], ['cream', color.cream], ['ink-soft', color.inkSoft], ['surface', color.surface],
    ];
    for (const [name, hex] of pairs) expect(css).toContain(`--color-rm-${name}: ${hex};`);
  });
});
