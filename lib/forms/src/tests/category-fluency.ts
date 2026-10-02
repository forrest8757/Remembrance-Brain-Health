// T6 Category Fluency forms (build doc §T6 "Alternate forms"): Animals is the
// fixed longitudinal anchor; the second category rotates among candidates.
//
// Form A (Animals + Vegetables) is the NACC pairing. It is NOT flagged
// licensed: the build doc rates T6 license risk Low ("paradigm is public
// domain"), so it is served by default (decision recorded in docs/decisions.md).
// Forms B and C rotate in Remembrance-original second categories with
// `equated: false` until piloted. Their productivity check (lexicon entries at
// Zipf ≥ 3 within ±15% of Vegetables) needs a word-frequency source we don't
// have yet (DEVIATIONS T6-3).
import { defineForm, type Form } from '../form';
import type { EquivalenceConstraint, FormBank } from '../validator';

/** Practice examples spoken in the script; they take part in the collision check. */
const PRACTICE = { practiceCategory: ['clothing'], practiceExamples: ['sock', 'jacket', 'belt', 'scarf', 'sweater'] };

/** Second categories with a lexicon and credit rules in lib/scoring. */
export const SECOND_CATEGORIES = ['vegetables', 'fruits', 'occupations'] as const;

const form = (formId: string, second: string, title: string, plural: string) =>
  defineForm({
    formId,
    testId: 'category-fluency',
    version: '1.0.0',
    licensed: false,
    items: { anchorCategory: ['animals'], secondCategory: [second], categoryTitle: [title], categoryPlural: [plural], ...PRACTICE },
    equivalence: { secondCategory: second },
    equated: false,
  });

export const categoryFluencyForms: Form[] = [
  form('category-fluency.A', 'vegetables', 'Vegetables', 'vegetables'),
  form('category-fluency.B', 'fruits', 'Fruits', 'fruits'),
  form('category-fluency.C', 'occupations', 'Jobs or occupations', 'jobs or occupations'),
];

const anchorIsAnimals: EquivalenceConstraint = (f) => (f.items.anchorCategory?.[0] === 'animals' ? [] : ['the first category must be Animals (longitudinal anchor)']);

/** The practice category must differ from both test categories (build doc §T6). */
const practiceDiffers: EquivalenceConstraint = (f) => {
  const practice = f.items.practiceCategory?.[0];
  return [f.items.anchorCategory?.[0], f.items.secondCategory?.[0]].includes(practice) ? [`practice category "${practice}" is also a test category`] : [];
};

const knownSecondCategory: EquivalenceConstraint = (f) => {
  const second = f.items.secondCategory?.[0] ?? '';
  return (SECOND_CATEGORIES as readonly string[]).includes(second) ? [] : [`no lexicon/credit rules for second category "${second}"`];
};

/** Each form rotates in a different second category. */
const distinctSecond: EquivalenceConstraint = (f, bank) =>
  bank.filter((o) => o.formId !== f.formId && o.items.secondCategory?.[0] === f.items.secondCategory?.[0]).map((o) => `same second category as ${o.formId}`);

export const categoryFluencyBank: FormBank = {
  testId: 'category-fluency',
  forms: categoryFluencyForms,
  constraints: [anchorIsAnimals, practiceDiffers, knownSecondCategory, distinctSecond],
  minOriginalForms: 3,
};
