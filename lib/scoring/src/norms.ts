// Comparison with other participants (Remembrance-internal norms).
//
// The build doc (§3b) says NACC norms don't transfer to this self-administered,
// ASR-scored version, so comparisons use Remembrance's own participants:
// each person's FIRST completed administration of a test (later ones carry
// practice effects, CLAUDE.md §8), grouped by age band and sex.
//
// Pure functions: the API gathers the group's values and calls these.

export type Sex = 'female' | 'male' | 'undisclosed';

/** A group is shown only when it has at least this many people (stability and privacy). */
export const MIN_COHORT = 30;
/** Brain age needs a reference spanning many ages. */
export const MIN_BRAIN_AGE_REFERENCE = 200;

export function ageAt(birthYear: number, at: Date = new Date()): number | null {
  const age = at.getUTCFullYear() - birthYear;
  return Number.isInteger(birthYear) && age >= 18 && age <= 110 ? age : null;
}

export interface Cohort {
  minAge: number;
  /** null = open-ended (80 and over). */
  maxAge: number | null;
  /** null = both sexes (participant didn't say). */
  sex: 'female' | 'male' | null;
  label: string;
}

const BANDS: [number, number | null][] = [
  [18, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, null],
];

export function cohortFor(age: number, sex: Sex): Cohort {
  const [minAge, maxAge] = BANDS.find(([lo, hi]) => age >= lo && (hi === null || age <= hi)) ?? BANDS[0]!;
  const who = sex === 'female' ? 'women' : sex === 'male' ? 'men' : 'people';
  return {
    minAge,
    maxAge,
    sex: sex === 'undisclosed' ? null : sex,
    label: maxAge === null ? `${who} aged ${minAge} and over` : `${who} aged ${minAge}–${maxAge}`,
  };
}

/** Percent of the group scoring below `value`, counting ties as half (mid-rank). */
export function percentileRank(value: number, group: readonly number[]): number {
  if (group.length === 0) return 0;
  const below = group.filter((v) => v < value).length;
  const equal = group.filter((v) => v === value).length;
  return Math.round(((below + equal / 2) / group.length) * 100);
}

function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export interface CohortComparison {
  status: 'ok' | 'insufficient';
  n: number;
  percentile: number | null;
  median: number | null;
}

/**
 * `percentile` = percent of the group this result is better than (ties count
 * half): higher scores are better unless `lowerIsBetter` (times).
 */
export function compareWithCohort(value: number, group: readonly number[], minN = MIN_COHORT, lowerIsBetter = false): CohortComparison {
  if (group.length < minN) return { status: 'insufficient', n: group.length, percentile: null, median: null };
  const percentile = lowerIsBetter ? percentileRank(-value, group.map((g) => -g)) : percentileRank(value, group);
  return { status: 'ok', n: group.length, percentile, median: median(group) };
}

/**
 * A field value usable in norms: a real score within the field's range, not a
 * reason code (88, 95–98, 995–998) or unscored. `max` is the field's highest
 * real value (e.g. 300 s for Oral Trails B); the default suits 0–87 scores.
 */
export function normValue(v: number | null | undefined, max = 87): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
}

export interface NormField {
  field: string;
  label: string;
  /** Highest real value; anything above is a reason code. */
  max: number;
  /** Times: a lower value is better. */
  lowerIsBetter?: boolean;
}

/** The official fields each test is compared on. */
const NORM_FIELDS: Record<string, NormField[]> = {
  'number-span': [
    { field: 'forwardTotal', label: 'Numbers in the same order', max: 14 },
    { field: 'backwardTotal', label: 'Numbers in reverse order', max: 14 },
    { field: 'forwardLongestSpan', label: 'Longest span, same order', max: 9 },
    { field: 'backwardLongestSpan', label: 'Longest span, reverse order', max: 8 },
  ],
  // Uncorrected total (Q1d); the education point is a display adjustment (D10).
  'moca-blind': [{ field: 'total', label: 'Total', max: 22 }],
  // Animals only: the fixed longitudinal anchor (the second category rotates).
  'category-fluency': [{ field: 'animals', label: 'Animals named', max: 77 }],
  // Story recall (original stories, pooled; not equated): exact words /44 and ideas /25.
  'story-immediate': [
    { field: 'verbatim', label: 'Story, exact words', max: 44 },
    { field: 'paraphrase', label: 'Story, ideas', max: 25 },
  ],
  'story-delayed': [
    { field: 'verbatim', label: 'Story later, exact words', max: 44 },
    { field: 'paraphrase', label: 'Story later, ideas', max: 25 },
  ],
  // Both letters together (0–80). Letter pairs rotate and aren't equated yet (DEVIATIONS T7-4).
  'phonemic-fluency': [{ field: 'totalCorrect', label: 'Words by letter (both letters)', max: 80 }],
  // Times in seconds, capped at 100 / 300 (a capped time is a real score); reason codes are 995–998.
  'oral-trails': [
    { field: 'partATime', label: 'Counting 1 to 25 (seconds)', max: 100, lowerIsBetter: true },
    { field: 'partBTime', label: 'Switching numbers and letters (seconds)', max: 300, lowerIsBetter: true },
  ],
};

export function normFieldsFor(testId: string): NormField[] {
  return NORM_FIELDS[testId] ?? [];
}

export interface BrainAgeEstimate {
  /** The age at which the reference's typical score equals this score. */
  age: number;
  n: number;
  /** Change in the typical score per year of age (negative). */
  slope: number;
}

/**
 * Brain age (method, not yet shown to participants): fit the typical score
 * against age across the reference (least squares), then find the age where
 * the fitted score equals this one, clamped to the ages the reference covers.
 * Returns null without enough data or when scores don't fall with age.
 * Later: a composite across tests, sex-specific fits and a non-linear curve.
 */
export function estimateBrainAge(
  value: number,
  reference: readonly { age: number; value: number }[],
  minN = MIN_BRAIN_AGE_REFERENCE,
): BrainAgeEstimate | null {
  const n = reference.length;
  if (n < minN) return null;
  const meanAge = reference.reduce((a, r) => a + r.age, 0) / n;
  const meanValue = reference.reduce((a, r) => a + r.value, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const r of reference) {
    sxy += (r.age - meanAge) * (r.value - meanValue);
    sxx += (r.age - meanAge) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  if (slope >= 0) return null;
  const ages = reference.map((r) => r.age);
  const raw = meanAge + (value - meanValue) / slope;
  const age = Math.round(Math.min(Math.max(...ages), Math.max(Math.min(...ages), raw)));
  return { age, n, slope };
}
