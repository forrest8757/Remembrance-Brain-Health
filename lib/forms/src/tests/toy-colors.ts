// Parallel forms for the pipeline toy test. All original (no licensed Form A).
import { defineForm, type Form } from '../form';
import type { EquivalenceConstraint, FormBank } from '../validator';

/** Common one-word color names with their syllable counts. */
export const BASIC_COLORS: Record<string, number> = {
  red: 1, blue: 1, green: 1, brown: 1, pink: 1, black: 1, white: 1, gray: 1,
  yellow: 2, purple: 2, orange: 2, silver: 2,
};

export const toyColorsForms: Form[] = [
  defineForm({ formId: 'toy-colors.R1', testId: 'toy-colors', version: '1.0.0', licensed: false, items: { colors: ['red', 'blue', 'yellow'] }, equivalence: { syllables: 4 } }),
  defineForm({ formId: 'toy-colors.R2', testId: 'toy-colors', version: '1.0.0', licensed: false, items: { colors: ['green', 'pink', 'orange'] }, equivalence: { syllables: 4 } }),
  defineForm({ formId: 'toy-colors.R3', testId: 'toy-colors', version: '1.0.0', licensed: false, items: { colors: ['brown', 'white', 'purple'] }, equivalence: { syllables: 4 } }),
];

const threeDistinctBasicColors: EquivalenceConstraint = (form) => {
  const colors = form.items.colors ?? [];
  const issues: string[] = [];
  if (colors.length !== 3) issues.push(`expected 3 colors, got ${colors.length}`);
  if (new Set(colors).size !== colors.length) issues.push('colors must be distinct');
  for (const c of colors) if (!(c in BASIC_COLORS)) issues.push(`"${c}" is not a basic color`);
  return issues;
};

const matchedSyllables: EquivalenceConstraint = (form) => {
  const total = (form.items.colors ?? []).reduce((sum, c) => sum + (BASIC_COLORS[c] ?? 0), 0);
  const issues: string[] = [];
  if (total !== form.equivalence.syllables) issues.push(`equivalence.syllables says ${form.equivalence.syllables}, actual ${total}`);
  if (total !== 4) issues.push(`total syllables must be 4 (one 2-syllable color), got ${total}`);
  return issues;
};

/** No color may be reused across forms, so rotation really changes content. */
const disjointAcrossForms: EquivalenceConstraint = (form, bank) => {
  const mine = new Set(form.items.colors ?? []);
  return bank
    .filter((other) => other.formId !== form.formId)
    .flatMap((other) => (other.items.colors ?? []).filter((c) => mine.has(c)).map((c) => `"${c}" also in ${other.formId}`));
};

export const toyColorsBank: FormBank = {
  testId: 'toy-colors',
  forms: toyColorsForms,
  constraints: [threeDistinctBasicColors, matchedSyllables, disjointAcrossForms],
  minOriginalForms: 3,
};
