// Written before the scorer (CLAUDE.md §15): every rule and example in
// docs/build-prompts.md §T1 "Scoring" and "Edge cases".
import { describe, expect, it } from 'vitest';
import { mocaFormA } from '@workspace/forms';
import type { AsrToken } from '@workspace/asr';
import {
  dateParts,
  judgeRegistration,
  mocaJudges,
  mocaScorer,
  parseDateMention,
  scoreAbstraction,
  scoreDelayedRecall,
  scoreLetterFluency,
  scoreOrientation,
  scoreSentence,
  scoreSerial7,
  scoreVigilance,
  soundKey,
  type MocaInput,
} from './moca';

const said = (words: string, confidence = 0.95): AsrToken[] =>
  words
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => ({ id: `w:${i}`, token: w, startMs: 400 + i * 500, endMs: 700 + i * 500, confidence }));

const WORDS = ['face', 'velvet', 'church', 'daisy', 'red'];

describe('misheard words (registration)', () => {
  it('hears "vase" as a misheard "face"', () => {
    expect(soundKey('vase')).toBe(soundKey('face'));
    const j = judgeRegistration(WORDS, said('vase velvet red'));
    expect(j.data).toMatchObject({ recalled: ['velvet', 'red'], misheard: ['face'], heardAs: { face: 'vase' } });
  });

  it('does not call a correctly recalled word misheard', () => {
    expect(judgeRegistration(WORDS, said('face vase')).data).toMatchObject({ recalled: ['face'], misheard: [] });
  });
});

describe('delayed recall (Q1k, Q1l, Q1m)', () => {
  const trial = (words: string) => judgeRegistration(WORDS, said(words));

  it('credits free recall, category cue and multiple choice separately', () => {
    const r = scoreDelayedRecall(WORDS, {
      free: said('face church'),
      cued: [
        { word: 'velvet', stage: 'cue', tokens: said('velvet') },
        { word: 'daisy', stage: 'cue', tokens: said('rose') },
        { word: 'red', stage: 'cue', tokens: said('') },
        { word: 'daisy', stage: 'choice', tokens: said('daisy') },
        { word: 'red', stage: 'choice', tokens: said('blue') },
      ],
      registration: [trial(''), trial('')],
    });
    expect(r).toMatchObject({ free: 2, category: 1, choice: 1 });
    expect(r.free + r.category + r.choice).toBeLessThanOrEqual(5);
  });

  it('gives 88 for cue levels that were never needed', () => {
    const r = scoreDelayedRecall(WORDS, { free: said('face velvet church daisy red'), cued: [], registration: [] });
    expect(r).toMatchObject({ free: 5, category: 88, choice: 88 });
  });

  it('gives 88 for multiple choice when every cued word was recalled on the category cue', () => {
    const r = scoreDelayedRecall(WORDS, {
      free: said('face velvet church daisy'),
      cued: [{ word: 'red', stage: 'cue', tokens: said('red') }],
      registration: [],
    });
    expect(r).toMatchObject({ free: 4, category: 1, choice: 88 });
  });

  it('credits a misheard word that recurred in both registration trials', () => {
    const r = scoreDelayedRecall(WORDS, { free: said('vase'), cued: [], registration: [trial('vase'), trial('vase')] });
    expect(r.free).toBe(1);
    expect(r.freeWords).toEqual(['face']);
  });

  it('does not credit a misheard word heard only once', () => {
    expect(scoreDelayedRecall(WORDS, { free: said('vase'), cued: [], registration: [trial('vase'), trial('face')] }).free).toBe(0);
  });

  it('logs practice/abstraction words as intrusions, with no points', () => {
    const r = scoreDelayedRecall(WORDS, { free: said('face banana train'), cued: [], registration: [] });
    expect(r.free).toBe(1);
    expect(r.intrusions).toEqual(['banana', 'train']);
  });
});

describe('serial 7s (Q1g)', () => {
  it.each([
    ['ninety three eighty six seventy nine seventy two sixty five', 3, 5],
    ['92 85 78 71 64', 3, 4], // the manual's example: one error, four correct → 3
    ['93 85 78 71 64', 3, 4],
    ['93 86', 2, 2],
    ['93', 1, 1],
    ['', 0, 0],
    ['50 40 30 20 10', 0, 0],
  ])('"%s" → %i points (%i correct)', (words, points, correct) => {
    expect(scoreSerial7(100, said(words))).toMatchObject({ points, correct });
  });

  it('scores what was produced when the participant stops ("I\'m lost")', () => {
    expect(scoreSerial7(100, said("93 86 79 I'm lost"))).toMatchObject({ correct: 3, points: 2 });
  });

  it('uses only the first five answers', () => {
    expect(scoreSerial7(100, said('93 86 79 72 65 58 51')).answers).toHaveLength(5);
  });
});

describe('sentence repetition (Q1h)', () => {
  const s1 = 'I only know that John is the one to help today.';
  const s2 = 'The cat always hid under the couch when dogs were in the room.';
  it('credits an exact repetition', () => {
    expect(scoreSentence(s1, said('I only know that John is the one to help today')).value).toBe(1);
  });
  it.each([
    ['omission of "only"', s1, 'I know that John is the one to help today'],
    ['substitution/addition', s1, 'I only know that John is the one who helped today'],
    ['"hides" for "hid"', s2, 'The cat always hides under the couch when dogs were in the room'],
    ['omission of "always"', s2, 'The cat hid under the couch when dogs were in the room'],
    ['plural change', s2, 'The cat always hid under the couch when the dog was in the room'],
  ])('rejects %s', (_label, target, words) => {
    expect(scoreSentence(target, said(words)).value).toBe(0);
  });
  it('sends low-confidence tokens to review (ASR auto-correction hazard)', () => {
    expect(scoreSentence(s1, said('I only know that John is the one to help today', 0.7)).confidence).toBeLessThan(0.85);
  });
});

describe('letter fluency (Q1i)', () => {
  const eleven = 'fish fan farm fence fork fruit fog fun fly frog fox';
  it('gives 1 point for ≥11 valid words', () => {
    expect(scoreLetterFluency('F', said(eleven))).toMatchObject({ valid: 11, value: 1 });
  });
  it('gives 0 for 10', () => {
    expect(scoreLetterFluency('F', said('fish fan farm fence fork fruit fog fun fly frog'))).toMatchObject({ valid: 10, value: 0 });
  });
  it('excludes repetitions, other letters, numbers, people/places and same-stem variants', () => {
    const r = scoreLetterFluency('F', said('fish fish phone four five Fred France fast faster fasting fan'));
    expect(r.valid).toBe(3); // fish, fast, fan
    expect(r.rejected.map((x) => x.reason)).toEqual(expect.arrayContaining(['repetition', 'wrong letter', 'number', 'proper noun', 'variant']));
  });
});

describe('abstraction (Q1j)', () => {
  const accept = ['transport', 'travel', 'trip'];
  const reject = ['wheel'];
  it.each([
    ['they are both means of transportation', 1],
    ['means of traveling', 1],
    ['you take trips in both', 1],
    ['they have wheels', 0],
  ])('"%s" → %i', (words, value) => {
    expect(scoreAbstraction(said(words), accept, reject)).toMatchObject({ value, needsAdjudication: false });
  });
  it('sends novel phrasing to review (rubric-constrained adjudicator not yet wired)', () => {
    expect(scoreAbstraction(said('you can go places on them'), accept, reject)).toMatchObject({ needsAdjudication: true });
  });
  it('accepts measuring answers for ruler–watch and rejects "numbers"', () => {
    expect(scoreAbstraction(said('measuring instruments'), ['measur', 'instrument'], ['number']).value).toBe(1);
    expect(scoreAbstraction(said('used to measure'), ['measur', 'instrument'], ['number']).value).toBe(1);
    expect(scoreAbstraction(said('they have numbers'), ['measur', 'instrument'], ['number']).value).toBe(0);
  });
  it('judges the practice pair live: "fruit" is right, anything concrete is not', () => {
    expect(mocaJudges['moca-abstraction-practice']!({ expected: 'fruit', tokens: said('they are both fruits'), asrUnavailable: false }).correct).toBe(true);
    expect(mocaJudges['moca-abstraction-practice']!({ expected: 'fruit', tokens: said('they are sweet'), asrUnavailable: false }).correct).toBe(false);
  });
});

describe('vigilance (Q1f)', () => {
  const letters = mocaFormA.items.letters![0]!.split('-');
  const onsets = letters.map((_, i) => 1000 + i * 2000);
  const tapsOnA = letters.flatMap((l, i) => (l === 'A' ? [onsets[i]! + 600] : []));

  it('scores 1 with no errors', () => {
    expect(scoreVigilance(letters, onsets, 2000, tapsOnA)).toMatchObject({ hits: 11, commissions: 0, omissions: 0, value: 1 });
  });
  it('scores 1 with exactly one error, 0 with two', () => {
    expect(scoreVigilance(letters, onsets, 2000, tapsOnA.slice(1)).value).toBe(1);
    expect(scoreVigilance(letters, onsets, 2000, [...tapsOnA.slice(1), onsets[0]! + 300]).value).toBe(0);
  });
  it('attributes a tap to [onset i, onset i+1)', () => {
    // A tap 1 ms before the next onset belongs to the current letter; at the next onset it belongs to the next.
    const iA = letters.indexOf('A');
    const r1 = scoreVigilance(letters, onsets, 2000, [onsets[iA + 1]! - 1]);
    expect(r1.hits).toBe(1);
    const r2 = scoreVigilance(letters, onsets, 2000, [onsets[iA + 1]!]);
    expect(r2.hits).toBe(0);
    expect(r2.commissions).toBe(1);
  });
  it('counts several taps in one window as one response, and flags it', () => {
    const iA = letters.indexOf('A');
    const r = scoreVigilance(letters, onsets, 2000, [...tapsOnA, onsets[iA]! + 900]);
    expect(r).toMatchObject({ hits: 11, commissions: 0, multiTapWindows: 1 });
  });
});

describe('orientation (Q1n–Q1s)', () => {
  // Tuesday 29 September 2026, 10:00 in New York.
  const at = new Date('2026-09-29T14:00:00Z');
  const tz = 'America/New_York';
  const profile = { city: 'Provo', location: 'home' as const };

  it.each([
    ['Tuesday September twenty ninth twenty twenty six', { date: 1, month: 1, year: 1, day: 1 }],
    ['the 29th of Sept 2026 Tuesday', { date: 1, month: 1, year: 1, day: 1 }],
    ['9/29/2026 Tuesday', { date: 1, month: 1, year: 1, day: 1 }],
    ['Monday September twenty eighth twenty twenty six', { date: 0, month: 1, year: 1, day: 0 }],
    ['two thousand twenty five', { year: 0 }],
  ])('"%s"', (words, expected) => {
    expect(scoreOrientation({ dateTokens: said(words), placeTokens: said('my home in Provo'), at, timeZone: tz, profile }).parts).toMatchObject(expected);
  });

  it('uses the participant\'s local date near midnight', () => {
    // 03:30 UTC on the 30th is still the 29th in New York.
    const lateNight = new Date('2026-09-30T03:30:00Z');
    expect(dateParts(lateNight, tz)).toMatchObject({ day: 29, weekday: 2 });
  });

  it('credits place and city per D8, and sends a mismatch to review instead of failing it', () => {
    const r = scoreOrientation({ dateTokens: said(''), placeTokens: said('at my house in Provo'), at, timeZone: tz, profile });
    expect(r.parts).toMatchObject({ place: 1, city: 1 });
    const away = scoreOrientation({ dateTokens: said(''), placeTokens: said("my daughter's apartment in Denver"), at, timeZone: tz, profile });
    expect(away.parts.city).toBe(0);
    expect(away.needsReview).toContain('city');
  });

  it('reports which date parts were not mentioned, for the live follow-up', () => {
    expect(parseDateMention(said('September twenty ninth')).missing).toEqual(['year', 'day of the week']);
    const j = mocaJudges['moca-orientation-date']!({ expected: '', tokens: said('Tuesday'), asrUnavailable: false });
    expect(j).toMatchObject({ tag: 'incomplete', vars: { missing: 'year, month, and exact date' } });
  });
});

describe('MoCA total (Q1d) and education adjustment (D10)', () => {
  const base: Omit<MocaInput, 'educationYears'> = {
    form: mocaFormA,
    responses: {
      digitsForward: said('two one eight five four'),
      digitsBackward: said('two four seven'),
      serial7: said('93 86 79 72 65'),
      sentence1: said('I only know that John is the one to help today'),
      sentence2: said('The cat always hid under the couch when dogs were in the room'),
      fluency: said('fish fan farm fence fork fruit fog fun fly frog fox'),
      abstraction1: said('means of transportation'),
      abstraction2: said('measuring instruments'),
      delayedFree: said('face velvet church daisy red'),
      dateTokens: said('Tuesday September twenty ninth twenty twenty six'),
      placeTokens: said('my home in Provo'),
    },
    cued: [],
    registration: [],
    vigilance: { administered: true, letters: mocaFormA.items.letters![0]!.split('-'), onsets: [], rateMs: 2000, taps: [] },
    asrUnavailable: false,
    at: new Date('2026-09-29T14:00:00Z'),
    timeZone: 'America/New_York',
    profile: { city: 'Provo', location: 'home' },
    reasonCode: null,
    equated: false,
  };
  const letters = mocaFormA.items.letters![0]!.split('-');
  const onsets = letters.map((_, i) => 1000 + i * 2000);
  const perfectVigilance = { ...base.vigilance, onsets, taps: letters.flatMap((l, i) => (l === 'A' ? [onsets[i]! + 500] : [])) };

  it('sums to 22 for a perfect administration', () => {
    const r = mocaScorer.score({ ...base, vigilance: perfectVigilance, educationYears: 16 });
    expect(r.fields).toMatchObject({ digits: 2, vigilance: 1, serial7: 3, sentences: 2, fluency: 1, abstraction: 2, delayedFree: 5, orientation: 6, total: 22, educationAdjustedTotal: 22 });
  });

  it('adds 1 for ≤12 years of education, stored separately and capped at 22', () => {
    const r = mocaScorer.score({ ...base, vigilance: perfectVigilance, responses: { ...base.responses, serial7: said('93') }, educationYears: 12 });
    expect(r.fields).toMatchObject({ total: 20, educationAdjustedTotal: 21 });
    expect(mocaScorer.score({ ...base, vigilance: perfectVigilance, educationYears: 10 }).fields.educationAdjustedTotal).toBe(22);
  });

  it('makes the total 88 when a scored item was not administered (e.g. taps undetectable)', () => {
    const r = mocaScorer.score({ ...base, vigilance: { ...base.vigilance, administered: false, reasonCode: 97 }, educationYears: 16 });
    expect(r.fields).toMatchObject({ vigilance: 97, total: 88, educationAdjustedTotal: 88 });
  });

  it('leaves the total unscored and sends the administration to review on an ASR outage', () => {
    const r = mocaScorer.score({ ...base, vigilance: perfectVigilance, asrUnavailable: true, educationYears: 16 });
    expect(r.fields.total).toBeNull();
    expect(r.fields.vigilance).toBe(1); // taps don't need a transcript
    expect(r.reviewReasons).toContain('asr_unavailable');
  });

  it('maps delayed-recall cue levels to 88 when not used (1l, 1m)', () => {
    const r = mocaScorer.score({ ...base, vigilance: perfectVigilance, educationYears: 16 });
    expect(r.fields).toMatchObject({ delayedCategory: 88, delayedChoice: 88 });
  });
});

describe('spec ↔ scorer agreement', () => {
  it('pre-renders exactly the follow-up phrases the judge can produce', async () => {
    const { MOCA_MISSING_PHRASES } = await import('@workspace/test-spec');
    const { allMissingPhrases } = await import('./moca');
    expect([...MOCA_MISSING_PHRASES].sort()).toEqual(allMissingPhrases().sort());
  });
});
