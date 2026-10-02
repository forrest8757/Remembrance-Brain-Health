import { describe, expect, it } from 'vitest';
import {
  ageAt,
  cohortFor,
  compareWithCohort,
  estimateBrainAge,
  normFieldsFor,
  normValue,
  percentileRank,
  MIN_COHORT,
  MIN_BRAIN_AGE_REFERENCE,
} from './norms';

describe('ageAt', () => {
  it('uses the calendar year (±1 year: birth year only, D8 spirit)', () => {
    expect(ageAt(1956, new Date('2026-09-30T12:00:00Z'))).toBe(70);
  });
  it('rejects impossible birth years', () => {
    expect(ageAt(2030, new Date('2026-09-30'))).toBeNull();
    expect(ageAt(1890, new Date('2026-09-30'))).toBeNull();
  });
});

describe('cohortFor', () => {
  it('groups by decade band and sex', () => {
    expect(cohortFor(67, 'female')).toEqual({ minAge: 60, maxAge: 69, sex: 'female', label: 'women aged 60–69' });
    expect(cohortFor(80, 'male')).toMatchObject({ minAge: 80, maxAge: null, label: 'men aged 80 and over' });
  });
  it('pools sexes when sex is not given', () => {
    expect(cohortFor(55, 'undisclosed')).toMatchObject({ sex: null, label: 'people aged 50–59' });
  });
  it('groups everyone under 40 together', () => {
    expect(cohortFor(23, 'male')).toMatchObject({ minAge: 18, maxAge: 39, label: 'men aged 18–39' });
  });
});

describe('percentileRank (mid-rank: ties count half)', () => {
  it('is the share of the group below you, with ties split', () => {
    expect(percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(45);
    expect(percentileRank(10, [10, 10, 10, 10])).toBe(50);
    expect(percentileRank(0, [1, 2, 3])).toBe(0);
    expect(percentileRank(9, [1, 2, 3])).toBe(100);
  });
});

describe('compareWithCohort', () => {
  const group = Array.from({ length: MIN_COHORT }, (_, i) => i % 15);
  it('reports n, percentile and median once the group is big enough', () => {
    const c = compareWithCohort(12, group);
    expect(c).toMatchObject({ status: 'ok', n: MIN_COHORT });
    expect(c.percentile).toBeGreaterThan(70);
    expect(c.median).toBe(7);
  });
  it('for times, faster is better', () => {
    const times = Array.from({ length: MIN_COHORT }, (_, i) => 20 + i);
    expect(compareWithCohort(21, times, MIN_COHORT, true).percentile).toBeGreaterThan(90);
    expect(compareWithCohort(48, times, MIN_COHORT, true).percentile).toBeLessThan(10);
  });
  it('withholds the comparison for small groups (too few people to be meaningful or private)', () => {
    expect(compareWithCohort(12, group.slice(0, MIN_COHORT - 1))).toEqual({ status: 'insufficient', n: MIN_COHORT - 1, percentile: null, median: null });
  });
});

describe('normValue: only official, completed values enter the norms', () => {
  it('drops reason codes (88, 95–98) and unscored (null)', () => {
    expect(normValue(8)).toBe(8);
    expect(normValue(0)).toBe(0);
    expect(normValue(88)).toBeNull();
    expect(normValue(97)).toBeNull();
    expect(normValue(null)).toBeNull();
  });
  it('accepts times up to the field max and drops 995–998', () => {
    expect(normValue(300, 300)).toBe(300);
    expect(normValue(996, 300)).toBeNull();
  });
});

describe('normFieldsFor', () => {
  it('names the official fields each test is compared on', () => {
    expect(normFieldsFor('number-span').map((f) => f.field)).toEqual(['forwardTotal', 'backwardTotal', 'forwardLongestSpan', 'backwardLongestSpan']);
    expect(normFieldsFor('moca-blind').map((f) => f.field)).toEqual(['total']);
    expect(normFieldsFor('oral-trails').map((f) => f.field)).toEqual(['partATime', 'partBTime']);
    expect(normFieldsFor('unknown')).toEqual([]);
  });
});

describe('estimateBrainAge', () => {
  // Synthetic reference: score falls 0.1 per year from 12 at age 40.
  const reference = Array.from({ length: MIN_BRAIN_AGE_REFERENCE }, (_, i) => {
    const age = 40 + (i % 50);
    return { age, value: 12 - 0.1 * (age - 40) + ((i % 3) - 1) * 0.2 };
  });
  it('finds the age at which the typical score equals yours', () => {
    const b = estimateBrainAge(9, reference)!;
    expect(b.age).toBeCloseTo(70, 0);
    expect(b.n).toBe(MIN_BRAIN_AGE_REFERENCE);
  });
  it('clamps to the ages the reference covers', () => {
    expect(estimateBrainAge(20, reference)!.age).toBe(40);
    expect(estimateBrainAge(0, reference)!.age).toBe(89);
  });
  it('declines with too little data', () => {
    expect(estimateBrainAge(9, reference.slice(0, MIN_BRAIN_AGE_REFERENCE - 1))).toBeNull();
  });
  it('declines when scores do not fall with age in the reference', () => {
    const flat = reference.map((r) => ({ ...r, value: 10 }));
    expect(estimateBrainAge(9, flat)).toBeNull();
  });
});
