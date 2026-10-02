// T8 Oral Trails forms. The counting sequences are inherently fixed; the
// build doc's recommended default is the canonical A and B with practice
// effects handled statistically (practice-adjusted RCI), so there is one form.
// Alternate start points/ranges change difficulty and must be equated first.
import { defineForm, type Form } from '../form';
import type { EquivalenceConstraint, FormBank } from '../validator';

const PART_A = Array.from({ length: 25 }, (_, i) => String(i + 1)).join('-');
const PART_B = Array.from({ length: 13 }, (_, i) => (i < 12 ? [String(i + 1), 'abcdefghijkl'[i]!] : [String(i + 1)]))
  .flat()
  .join('-');

export const oralTrailsForms: Form[] = [
  defineForm({
    formId: 'oral-trails.A',
    testId: 'oral-trails',
    version: '1.0.0',
    // Counting 1–25 and 1-A…13 is not licensable content (build doc: license risk Low).
    licensed: false,
    items: { partA: [PART_A], partB: [PART_B] },
    equivalence: { partALength: 25, partBLength: 25 },
    equated: true,
  }),
];

const canonicalSequences: EquivalenceConstraint = (f) => {
  const issues: string[] = [];
  if (f.items.partA?.[0] !== PART_A) issues.push('Part A must be 1–25');
  if (f.items.partB?.[0] !== PART_B) issues.push('Part B must be 1 A 2 B … 12 L 13');
  return issues;
};

export const oralTrailsBank: FormBank = {
  testId: 'oral-trails',
  forms: oralTrailsForms,
  constraints: [canonicalSequences],
  // One fixed form by design (build doc T8 "Alternate forms"); see DEVIATIONS T8-4.
  minOriginalForms: 1,
};
