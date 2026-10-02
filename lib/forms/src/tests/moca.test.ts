import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { validateBank } from '../validator';
import { assignForm, eligibleForms } from '../assignment';
import {
  aRuns,
  digitsIssue,
  generateVigilance,
  mocaBank,
  mocaConstraints,
  mocaFormA,
  mocaForms,
  rhymeKey,
  serialBorrows,
  vigilanceIssue,
} from './moca';

describe('MoCA form constraints', () => {
  it('Form A passes every constraint (fixture)', () => {
    expect(mocaConstraints.flatMap((c) => c(mocaFormA, mocaForms))).toEqual([]);
  });

  it('describes Form A vigilance as one triple, two doubles, four singles', () => {
    expect(aRuns(mocaFormA.items.letters![0]!.split('-')).sort().join(',')).toBe('1,1,1,1,2,2,3');
  });

  it('rejects vigilance strings with the wrong structure or lures', () => {
    const a = mocaFormA.items.letters![0]!.split('-');
    const noJ = a.map((l) => (l === 'J' ? 'M' : l));
    expect(vigilanceIssue(noJ)).toContain('lure J');
    const withH = [...a.slice(0, 28), 'H'];
    expect(vigilanceIssue(withH)).toContain('distractor set');
    expect(vigilanceIssue(a.slice(1))).toContain('expected 29');
  });

  it.each([
    ['2-1-8-5-4', 5, null],
    ['2-1-0-5-4', 5, 'no 0'],
    ['2-2-8-5-4', 5, 'repeated'],
    ['1-4-6-8-2', 5, 'monotonic'],
    ['1-9-4-7-2', 5, 'year'],
  ])('digits %s', (item, len, issue) => {
    const got = digitsIssue(item as string, len as number);
    if (issue === null) expect(got).toBeNull();
    else expect(got).toContain(issue);
  });

  it('counts serial-7 borrows like 100', () => {
    expect(serialBorrows(100)).toBe(4);
    expect([90, 110, 120].map(serialBorrows)).toEqual([4, 4, 4]);
    expect(serialBorrows(99)).not.toBe(4);
  });

  it('flags rhymes, not look-alike endings', () => {
    expect(rhymeKey('face')).toBe(rhymeKey('lace'));
    expect(rhymeKey('face')).not.toBe(rhymeKey('nose'));
  });

  it('generates valid vigilance strings for any seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        expect(vigilanceIssue(generateVigilance(seed))).toBeNull();
      }),
      { numRuns: 200 },
    );
  });
});

describe('MoCA bank (D5: original forms only)', () => {
  it('passes the CI validator with three original forms', () => {
    expect(validateBank(mocaBank)).toEqual([]);
    expect(mocaBank.forms.filter((f) => !f.licensed)).toHaveLength(3);
  });

  it('never assigns Form A when licensed content is off', () => {
    expect(eligibleForms(mocaForms, 'moca-blind', false).map((f) => f.formId)).toEqual(['moca-blind.B', 'moca-blind.C', 'moca-blind.D']);
    for (let i = 0; i < 20; i++) {
      expect(assignForm({ userId: `u${i}`, testId: 'moca-blind', forms: mocaForms, history: [], licensedContent: false }).form.licensed).toBe(false);
    }
  });
});
