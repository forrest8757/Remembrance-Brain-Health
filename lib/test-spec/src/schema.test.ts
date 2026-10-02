import { describe, expect, it } from 'vitest';
import { testSpecSchema, toyColorsSpec, clipIdFor } from './index';

const base = {
  testId: 't',
  specVersion: '1.0.0',
  title: 'T',
  domains: ['MEM'],
  source: { document: 'x', pages: '1' },
  lines: [{ key: 'a', text: 'Hello.' }],
  scorerId: 't',
};

describe('test-spec schema', () => {
  it('parses the toy test', () => {
    expect(toyColorsSpec.steps).toHaveLength(6);
    expect(clipIdFor(toyColorsSpec, 'intro')).toBe('toy-colors.intro');
  });

  it('rejects stimulus presentation outside the protocol zone', () => {
    const r = testSpecSchema.safeParse({
      ...base,
      steps: [{ key: 's', type: 'present', zone: 'chrome', stimulus: 'x', rateMs: 1000 }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects references to unknown script lines', () => {
    const r = testSpecSchema.safeParse({ ...base, steps: [{ key: 's', type: 'say', zone: 'chrome', line: 'nope' }] });
    expect(r.success).toBe(false);
  });

  it('rejects duplicate step keys', () => {
    const say = { key: 's', type: 'say', zone: 'chrome', line: 'a' };
    expect(testSpecSchema.safeParse({ ...base, steps: [say, say] }).success).toBe(false);
  });

  it('requires silenceCloseMs when a window closes on silence', () => {
    const r = testSpecSchema.safeParse({
      ...base,
      steps: [{ key: 'r', type: 'respond', zone: 'protocol', maxMs: 1000, closeOn: ['silence'] }],
    });
    expect(r.success).toBe(false);
  });
});
