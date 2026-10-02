// T3 Number Span forms: canonical Form A (licensed), a seeded procedural
// generator, and frozen generated Forms B–D. Constraints are from
// docs/build-prompts.md §T3 "Alternate forms"; see the T3 README for how
// the ambiguous ones were resolved against Form A.
import { defineForm, type Form } from '../form';
import { mulberry32 } from '../random';
import type { EquivalenceConstraint, FormBank } from '../validator';

export const NUMBER_SPAN_TEST_ID = 'number-span';

/** Forward lengths 3–9, backward 2–8, two trials each. */
export const FORWARD_LENGTHS = [3, 4, 5, 6, 7, 8, 9] as const;
export const BACKWARD_LENGTHS = [2, 3, 4, 5, 6, 7, 8] as const;

/** Fixed practice/example items; never generated as test items. */
/** The instruction examples and practice items (Remembrance-original): never test items. */
export const PRACTICE_ITEMS = ['6-1-4', '3-9-5', '4-9-2', '7-1-5'] as const;

/**
 * Allowed count of 5s and 9s ("five"/"nine" sound alike on the phone) per
 * sequence length, taken from Form A's observed min/max.
 */
export const FIVE_NINE_RANGE: Record<number, [number, number]> = {
  2: [0, 1], 3: [0, 1], 4: [0, 2], 5: [0, 2], 6: [1, 2], 7: [1, 2], 8: [2, 2], 9: [2, 2],
};

export const parseItem = (item: string): number[] => item.split('-').map(Number);
export const formatItem = (digits: readonly number[]): string => digits.join('-');

// ---- Sequence constraints (each returns a reason, or null if satisfied) ----

export function sequenceIssue(d: readonly number[]): string | null {
  if (d.some((x) => !Number.isInteger(x) || x < 1 || x > 9)) return 'digits must be 1–9';
  if (new Set(d).size !== d.length) return 'repeated digit';
  for (let i = 1; i < d.length; i++) if (Math.abs(d[i]! - d[i - 1]!) === 1) return `adjacent ±1 (${d[i - 1]}-${d[i]})`;
  // "No ascending/descending run of 3+": read as 3+ consecutive steps in one
  // direction (4 digits). The 3-digit reading fails 16 Form A items.
  for (let i = 3; i < d.length; i++) {
    const w = d.slice(i - 3, i + 1);
    if ((w[0]! < w[1]! && w[1]! < w[2]! && w[2]! < w[3]!) || (w[0]! > w[1]! && w[1]! > w[2]! && w[2]! > w[3]!)) {
      return `monotonic run ${formatItem(w)}`;
    }
  }
  if (d.length > 1 && formatItem(d) === formatItem([...d].reverse())) return 'palindrome';
  // A whole item that steps evenly ("3-6-9") is a counting pattern; Form A has none.
  if (d.length >= 3 && d.every((x, i) => i < 2 || x - d[i - 1]! === d[1]! - d[0]!)) return 'evenly spaced (counting pattern)';
  if (d.length >= 4 && d[0] === 1 && d[1] === 9) return 'reads like a year (19xx)';
  const range = FIVE_NINE_RANGE[d.length];
  if (range) {
    const n = d.filter((x) => x === 5 || x === 9).length;
    if (n < range[0] || n > range[1]) return `5/9 count ${n} outside Form A range ${range[0]}–${range[1]}`;
  }
  return null;
}

function bigrams(d: readonly number[]): Set<string> {
  const out = new Set<string>();
  for (let i = 1; i < d.length; i++) out.add(`${d[i - 1]}${d[i]}`);
  return out;
}

/** Constraints between the two trials at one length. */
export function pairIssue(a: readonly number[], b: readonly number[]): string | null {
  if (a[0] === b[0]) return 'both trials start with the same digit';
  const shared = [...bigrams(a)].filter((x) => bigrams(b).has(x));
  if (shared.length) return `shared 2-digit chunk ${shared.join(', ')}`;
  return null;
}

// ---- Generator ----------------------------------------------------------------

function randomSequence(length: number, rand: () => number): number[] | null {
  // Randomized backtracking: shuffle candidates at each position.
  const out: number[] = [];
  const used = new Set<number>();
  const step = (): boolean => {
    if (out.length === length) return sequenceIssue(out) === null;
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => !used.has(x));
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
    }
    for (const c of candidates) {
      const prev = out[out.length - 1];
      if (prev !== undefined && Math.abs(prev - c) === 1) continue;
      out.push(c);
      used.add(c);
      // Prune early on the prefix-checkable constraints.
      const prefixIssue = sequenceIssue(out);
      const prefixOk = prefixIssue === null || prefixIssue.startsWith('5/9') || prefixIssue === 'palindrome' || prefixIssue.startsWith('evenly');
      if (prefixOk && step()) return true;
      out.pop();
      used.delete(c);
    }
    return false;
  };
  return step() ? out : null;
}

const PRACTICE_SET = new Set<string>(PRACTICE_ITEMS);

function generatePair(length: number, rand: () => number, taken: Set<string>): [number[], number[]] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const a = randomSequence(length, rand);
    const b = randomSequence(length, rand);
    if (!a || !b) continue;
    const fa = formatItem(a);
    const fb = formatItem(b);
    if (PRACTICE_SET.has(fa) || PRACTICE_SET.has(fb) || taken.has(fa) || taken.has(fb)) continue;
    if (pairIssue(a, b)) continue;
    taken.add(fa);
    taken.add(fb);
    return [a, b];
  }
  throw new Error(`Could not generate a length-${length} pair`);
}

export interface NumberSpanItems {
  forward: string[];
  backward: string[];
}

/** Deterministic for a given seed: store the seed with the administration. */
export function generateNumberSpanItems(seed: number): NumberSpanItems {
  const rand = mulberry32(seed);
  const taken = new Set<string>();
  const block = (lengths: readonly number[]) => lengths.flatMap((len) => generatePair(len, rand, taken).map(formatItem));
  return { forward: block(FORWARD_LENGTHS), backward: block(BACKWARD_LENGTHS) };
}

export function generateNumberSpanForm(seed: number, formId = `number-span.gen-${seed}`): Form {
  const items = generateNumberSpanItems(seed);
  return defineForm({
    formId,
    testId: NUMBER_SPAN_TEST_ID,
    version: '1.0.0',
    licensed: false,
    items: { ...items },
    equivalence: { seed, generator: 'number-span@1' },
  });
}

// ---- Forms --------------------------------------------------------------------

/** Canonical NACC items (Joel Kramer, PsyD). Served only with LICENSED_CONTENT. */
export const numberSpanFormA = defineForm({
  formId: 'number-span.A',
  testId: NUMBER_SPAN_TEST_ID,
  version: '1.0.0',
  licensed: true,
  items: {
    forward: [
      '1-8-4', '2-7-9', '4-1-6-2', '8-1-9-5', '6-4-9-2-8', '7-3-8-6-1', '3-9-2-4-7-5', '6-2-8-3-1-9',
      '9-6-4-7-1-5-3', '7-4-9-2-6-8-1', '4-7-2-5-8-1-3-9', '2-9-5-7-3-6-1-8', '6-8-4-1-9-3-5-2-7', '1-3-9-2-7-5-8-6-4',
    ],
    backward: [
      '2-5', '4-7', '2-9-6', '3-7-4', '7-1-8-6', '5-1-6-3', '5-2-4-9-1', '9-1-7-3-6', '6-8-5-7-9-2', '8-1-6-3-5-9',
      '1-5-2-9-7-3-8', '7-3-1-6-8-5-2', '3-6-4-9-5-2-7-1', '6-3-5-7-1-8-2-9',
    ],
  },
  equivalence: {},
});

/**
 * Frozen outputs of the generator (seeds 3001–3003), stored as data so a
 * future generator change can't silently alter them. Re-freezing = new version.
 */
export const numberSpanFrozenForms: Form[] = [
  defineForm({
    formId: 'number-span.B',
    testId: NUMBER_SPAN_TEST_ID,
    version: '1.0.0',
    licensed: false,
    items: {
      forward: ['2-6-8', '9-1-8', '8-1-3-7', '7-4-2-5', '5-9-4-7-2', '7-1-4-6-3', '7-1-4-8-3-5', '9-5-1-8-6-2', '7-2-9-5-1-8-6', '9-1-4-7-5-8-3', '3-9-2-4-1-8-5-7', '2-8-4-7-9-6-3-5', '3-5-2-6-4-7-9-1-8', '6-8-1-9-4-2-5-3-7'],
      backward: ['2-7', '3-5', '3-6-1', '5-2-4', '2-6-9-5', '1-7-3-9', '8-2-4-7-5', '9-1-5-3-6', '6-8-5-1-4-2', '1-3-5-2-9-4', '9-5-2-8-4-7-3', '6-9-7-4-8-2-5', '1-7-2-6-4-8-5-9', '4-9-1-3-8-2-5-7'],
    },
    equivalence: { seed: 3001, generator: 'number-span@1' },
  }),
  defineForm({
    formId: 'number-span.C',
    testId: NUMBER_SPAN_TEST_ID,
    version: '1.0.0',
    licensed: false,
    items: {
      forward: ['6-4-9', '4-6-2', '1-8-6-3', '3-7-4-6', '7-1-9-6-2', '2-7-9-5-1', '7-2-4-6-1-5', '5-2-7-1-9-4', '4-7-5-1-8-3-9', '1-3-7-2-6-4-9', '8-3-6-2-5-1-7-9', '4-6-9-3-5-2-7-1', '5-9-2-8-4-7-3-6-1', '2-5-7-4-1-6-8-3-9'],
      backward: ['2-4', '9-7', '3-8-6', '5-2-8', '4-6-2-5', '1-6-3-7', '1-7-3-9-6', '9-7-1-5-8', '9-7-4-6-8-3', '4-1-9-5-8-2', '3-7-4-1-9-6-2', '8-3-1-7-2-5-9', '3-6-4-1-7-9-5-2', '5-3-9-7-4-8-6-1'],
    },
    equivalence: { seed: 3002, generator: 'number-span@1' },
  }),
  defineForm({
    formId: 'number-span.D',
    testId: NUMBER_SPAN_TEST_ID,
    version: '1.0.0',
    licensed: false,
    items: {
      forward: ['8-5-7', '3-6-1', '3-7-2-5', '1-6-2-8', '4-1-9-5-7', '1-4-9-2-8', '3-9-1-5-8-4', '7-9-3-5-2-4', '3-7-2-5-1-4-6', '5-8-2-4-9-1-3', '3-5-2-7-4-9-1-6', '6-2-8-3-9-7-1-5', '7-4-8-3-1-9-6-2-5', '6-3-9-2-4-7-5-1-8'],
      backward: ['9-1', '1-3', '2-9-1', '5-1-6', '4-9-7-1', '3-7-9-6', '1-4-6-2-9', '8-5-1-9-4', '9-3-7-5-8-2', '4-1-6-9-7-2', '1-7-5-2-9-4-8', '8-1-4-9-7-3-5', '1-4-6-3-8-2-5-9', '7-2-6-4-8-1-9-5'],
    },
    equivalence: { seed: 3003, generator: 'number-span@1' },
  }),
];

export const numberSpanForms: Form[] = [numberSpanFormA, ...numberSpanFrozenForms];

// ---- Validator ----------------------------------------------------------------

/** Pair and practice-reuse rules that Form A itself breaks (README, DEVIATIONS T3-5). */
const exemptFromGeneratorOnlyRules = (form: Form) => form.formId === numberSpanFormA.formId;

const structure: EquivalenceConstraint = (form) => {
  const issues: string[] = [];
  const check = (key: 'forward' | 'backward', lengths: readonly number[]) => {
    const items = form.items[key] ?? [];
    const expected = lengths.flatMap((l) => [l, l]);
    if (items.length !== expected.length) issues.push(`${key}: expected ${expected.length} items, got ${items.length}`);
    items.forEach((item, i) => {
      if (parseItem(item).length !== expected[i]) issues.push(`${key}[${i}] "${item}" should have length ${expected[i]}`);
    });
  };
  check('forward', FORWARD_LENGTHS);
  check('backward', BACKWARD_LENGTHS);
  return issues;
};

const sequences: EquivalenceConstraint = (form) =>
  (['forward', 'backward'] as const).flatMap((key) =>
    (form.items[key] ?? []).flatMap((item) => {
      const issue = sequenceIssue(parseItem(item));
      return issue ? [`${key} "${item}": ${issue}`] : [];
    }),
  );

const pairs: EquivalenceConstraint = (form) => {
  if (exemptFromGeneratorOnlyRules(form)) return [];
  return (['forward', 'backward'] as const).flatMap((key) => {
    const items = form.items[key] ?? [];
    const issues: string[] = [];
    for (let i = 0; i + 1 < items.length; i += 2) {
      const issue = pairIssue(parseItem(items[i]!), parseItem(items[i + 1]!));
      if (issue) issues.push(`${key} "${items[i]}" / "${items[i + 1]}": ${issue}`);
    }
    return issues;
  });
};

const noPracticeItems: EquivalenceConstraint = (form) => {
  if (exemptFromGeneratorOnlyRules(form)) return [];
  return [...(form.items.forward ?? []), ...(form.items.backward ?? [])]
    .filter((item) => PRACTICE_SET.has(item))
    .map((item) => `"${item}" is a practice item`);
};

export const numberSpanConstraints: EquivalenceConstraint[] = [structure, sequences, pairs, noPracticeItems];

export const numberSpanBank: FormBank = {
  testId: NUMBER_SPAN_TEST_ID,
  forms: numberSpanForms,
  constraints: numberSpanConstraints,
  minOriginalForms: 3,
};
