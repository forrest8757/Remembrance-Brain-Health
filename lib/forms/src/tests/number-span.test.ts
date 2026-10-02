// Property-based tests (fast-check) for the T3 generator, plus Form A as a
// fixture for the constraints it must pass (docs/build-prompts.md §T3).
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { validateBank } from '../validator';
import {
  BACKWARD_LENGTHS,
  FORWARD_LENGTHS,
  PRACTICE_ITEMS,
  generateNumberSpanForm,
  generateNumberSpanItems,
  numberSpanBank,
  numberSpanConstraints,
  numberSpanFormA,
  pairIssue,
  parseItem,
  sequenceIssue,
} from './number-span';

describe('Number Span constraints', () => {
  it('accept every Form A sequence (fixture)', () => {
    for (const item of [...numberSpanFormA.items.forward!, ...numberSpanFormA.items.backward!]) {
      expect(sequenceIssue(parseItem(item)), item).toBeNull();
    }
  });

  it.each([
    ['1-8-8', 'repeated digit'],
    ['1-8-0', 'digits must be 1–9'],
    ['3-4-8', 'adjacent ±1'],
    ['2-4-6-8', 'monotonic run'],
    ['9-7-3-1', 'monotonic run'],
    ['1-9-6-3', 'reads like a year'],
    ['2-5-9', '5/9 count 2 outside'],
    ['3-6-9', 'evenly spaced'],
    ['2-4-7-1-3-8', '5/9 count 0 outside'],
  ])('reject %s (%s)', (item, reason) => {
    expect(sequenceIssue(parseItem(item))).toContain(reason);
  });

  it('allows 3-digit ascending runs, which Form A uses', () => {
    expect(sequenceIssue(parseItem('2-7-9'))).toBeNull();
  });

  it('rejects pairs that start alike or share a 2-digit chunk', () => {
    expect(pairIssue([1, 8, 4], [1, 6, 3])).toContain('same digit');
    expect(pairIssue([2, 7, 4], [8, 2, 7])).toContain('shared 2-digit chunk 27');
    expect(pairIssue([1, 8, 4], [2, 7, 9])).toBeNull();
  });
});

describe('Number Span generator (property-based)', () => {
  it('every generated form satisfies every constraint', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const form = generateNumberSpanForm(seed);
        const issues = numberSpanConstraints.flatMap((c) => c(form, [form]));
        expect(issues).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });

  it('never generates a practice item or duplicates an item within a form', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const { forward, backward } = generateNumberSpanItems(seed);
        const all = [...forward, ...backward];
        for (const p of PRACTICE_ITEMS) expect(all).not.toContain(p);
        expect(new Set(all).size).toBe(all.length);
      }),
      { numRuns: 300 },
    );
  });

  it('has the Form A shape: two trials per length, forward 3–9, backward 2–8', () => {
    const { forward, backward } = generateNumberSpanItems(42);
    expect(forward.map((i) => parseItem(i).length)).toEqual(FORWARD_LENGTHS.flatMap((l) => [l, l]));
    expect(backward.map((i) => parseItem(i).length)).toEqual(BACKWARD_LENGTHS.flatMap((l) => [l, l]));
  });

  it('is reproducible from its seed and varies across seeds', () => {
    expect(generateNumberSpanItems(7)).toEqual(generateNumberSpanItems(7));
    expect(generateNumberSpanItems(7)).not.toEqual(generateNumberSpanItems(8));
  });
});

describe('Number Span bank', () => {
  it('passes the CI validator: Form A (licensed) plus three frozen original forms', () => {
    expect(validateBank(numberSpanBank)).toEqual([]);
    expect(numberSpanBank.forms.filter((f) => !f.licensed).map((f) => f.formId)).toEqual([
      'number-span.B', 'number-span.C', 'number-span.D',
    ]);
  });
});
