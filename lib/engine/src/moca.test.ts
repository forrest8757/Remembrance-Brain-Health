// T1 MoCA-Blind through the engine on a simulated phone call
// (docs/build-prompts.md §T1; CLAUDE.md §14.6, §14.8, §14.9).
import { describe, expect, it } from 'vitest';
import { mocaSpec } from '@workspace/test-spec';
import { mocaOriginalForms } from '@workspace/forms';
import { mocaInputFromRecord, mocaJudges, mocaScorer } from '@workspace/scoring';
import type { AdministrationRecord } from './index';
import { simulateCall, type Script, type SimulateOptions } from './testing';

const form = mocaOriginalForms[0]!; // Form B: knee silk tower lily gray · digits 5-2-9-3-7 / 8-3-6 · serial from 90 · letter M
const profile = { city: 'Provo', location: 'home' as const };
const TUESDAY_29_SEPT_2026_10AM_NY = Date.UTC(2026, 8, 29, 14, 0, 0);

const speak = (text: string, startMs = 500): Script => ({
  words: text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => [w, startMs + i * 400] as [string, number]),
});

const PERFECT: Record<string, string> = {
  registration1: 'knee silk tower lily gray',
  registration2: 'knee silk tower lily gray',
  digitsForward: 'five two nine three seven',
  digitsBackward: 'six three eight',
  serial7: 'eighty three seventy six sixty nine sixty two fifty five',
  sentence1: 'I only know that Peter is the one to ask today',
  sentence2: 'The dog always slept under the table when guests were in the house',
  fluency: 'milk map mouse moon mat mud mint mop mug mist mask',
  absPractice: 'they are both fruit',
  abstraction1: 'they are means of transportation',
  abstraction2: 'measuring instruments',
  delayedFree: 'knee silk tower lily gray',
  orientDate: 'Tuesday September twenty ninth twenty twenty six',
  orientPlace: 'my home in Provo',
};

/** The participant: answers per window base, with per-test overrides. */
const participant =
  (overrides: Record<string, string> = {}) =>
  (windowKey: string): Script => {
    const base = windowKey.split('#')[0]!;
    const attempt = Number(windowKey.split('#')[1]);
    const key = overrides[`${base}#${attempt}`] !== undefined ? `${base}#${attempt}` : base;
    const text = overrides[key] ?? PERFECT[base] ?? '';
    return speak(text);
  };

async function run(overrides: Record<string, string> = {}, opts: SimulateOptions = {}) {
  const call = simulateCall(mocaSpec, form, participant(overrides), {
    judges: mocaJudges,
    realtimePresentation: true,
    tapOn: (clipId) => clipId === 'tok.a',
    wallClockStart: TUESDAY_29_SEPT_2026_10AM_NY,
    timeZone: 'America/New_York',
    ...opts,
  });
  await call.advanceUntilDone();
  return { call, record: await call.run.done };
}

const score = (record: AdministrationRecord, educationYears: number | null = 16) =>
  mocaScorer.score(mocaInputFromRecord(record, form, { profile, educationYears }));

describe('T1 MoCA-Blind engine', () => {
  it('scores 22 for a perfect administration over the phone', async () => {
    const { record } = await run();
    expect(record.status).toBe('complete');
    const s = score(record);
    expect(s.fields).toMatchObject({
      digits: 2, vigilance: 1, serial7: 3, sentences: 2, fluency: 1, abstraction: 2,
      delayedFree: 5, delayedCategory: 88, delayedChoice: 88, orientation: 6, total: 22,
    });
    expect(s.needsReview).toBe(false);
  });

  it('always runs two registration trials, even when trial 1 is perfect', async () => {
    const { call } = await run();
    expect(call.played.filter((c) => c === 'tok.knee')).toHaveLength(2);
  });

  it('presents memory words at one per 1.5 s and vigilance letters at one per 2 s', async () => {
    const { record } = await run();
    const gaps = (step: string) => {
      const e = record.stimulusEvents.filter((x) => x.stepKey === step);
      return [...new Set(e.slice(1).map((x, i) => x.actualOnsetMs - e[i]!.actualOnsetMs))];
    };
    expect(gaps('words1')).toEqual([1500]);
    expect(gaps('vigilance')).toEqual([2000]);
    expect(record.stimulusEvents.filter((x) => x.stepKey === 'vigilance')).toHaveLength(29);
  });

  it('enunciates a misheard word in trial 2 and credits it at delayed recall when it recurs', async () => {
    const heard = 'knee milk tower lily gray';
    const { call, record } = await run({ registration1: heard, registration2: heard, delayedFree: heard });
    expect(call.played).toContain('tok.silk.emph');
    expect(call.played.filter((c) => c === 'tok.silk')).toHaveLength(1);
    expect(score(record).fields.delayedFree).toBe(5);
  });

  it('cues only missed words: category cue, then multiple choice if still missed', async () => {
    const { call, record } = await run({
      delayedFree: 'knee tower lily',
      'delayedCues.1.cue#1': 'silk',
      'delayedCues.4.cue#1': 'blue',
      'delayedCues.4.choice#1': 'gray',
    });
    expect(call.played.filter((c) => c.startsWith('moca-blind.cue.'))).toHaveLength(2);
    expect(call.played.filter((c) => c.startsWith('moca-blind.choice.'))).toHaveLength(1);
    expect(score(record).fields).toMatchObject({ delayedFree: 3, delayedCategory: 1, delayedChoice: 1 });
  });

  it('stops serial 7s after five answers and says "Stop."', async () => {
    const { call, record } = await run();
    expect(record.responseWindows.find((w) => w.stepKey === 'serial7')!.closeReason).toBe('count');
    expect(record.promptEvents.some((p) => p.stepKey === 'serial7' && p.promptKey === 'countReached')).toBe(true);
    expect(call.played.filter((c) => c === 'moca-blind.stop').length).toBeGreaterThanOrEqual(1);
  });

  it('gives letter fluency exactly 60 s, then says "Stop."', async () => {
    const { record } = await run();
    const w = record.responseWindows.find((x) => x.stepKey === 'fluency')!;
    expect(w.closedAt! - w.openedAt).toBe(60_000);
    expect(w.closeReason).toBe('timeout');
    expect(record.promptEvents.some((p) => p.stepKey === 'fluency' && p.promptKey === 'timeout')).toBe(true);
  });

  it('prompts once for missing date parts and scores both answers together', async () => {
    const { call, record } = await run({ 'orientDate#1': 'September twenty ninth', 'orientDate#2': 'Tuesday twenty twenty six' });
    expect(call.played).toContain('moca-blind.dateMissing.tell-me-the-year-and-day-of-the-week');
    expect(record.responseWindows.filter((w) => w.stepKey === 'orientDate')).toHaveLength(2);
    expect(score(record).fields).toMatchObject({ orientDate: 1, orientMonth: 1, orientYear: 1, orientDay: 1 });
  });

  it('abstraction practice: second chance, then "…also both fruit" only if still not fruit', async () => {
    const wrong = await run({ absPractice: 'they are round' });
    expect(wrong.call.played).toContain('moca-blind.absRetry');
    expect(wrong.call.played).toContain('moca-blind.absFruit');
    const right = await run();
    expect(right.call.played).not.toContain('moca-blind.absRetry');
    expect(right.call.played).not.toContain('moca-blind.absFruit');
  });

  it('D11: taps undetectable on the phone → vigilance not administered, total 88', async () => {
    const { call, record } = await run({}, { tapsDetectable: false, tapOn: undefined });
    expect(call.played.filter((c) => c === 'moca-blind.tapCheckAgain')).toHaveLength(1);
    expect(record.notAdministered).toEqual([{ stepKey: 'vigilance', reasonCode: 97, reason: 'taps_undetectable' }]);
    expect(record.stimulusEvents.some((e) => e.stepKey === 'vigilance')).toBe(false);
    expect(score(record).fields).toMatchObject({ vigilance: 97, total: 88 });
  });

  it('D10: adds one education point, stored separately', async () => {
    const { record } = await run({ serial7: 'eighty three seventy' });
    expect(score(record, 12).fields).toMatchObject({ total: 20, educationAdjustedTotal: 21 });
  });

  it('on an ASR outage: no cues, no follow-ups, vigilance still scored, total to review', async () => {
    const { call, record } = await run({}, { asrUnavailable: true });
    expect(call.played.some((c) => c.startsWith('moca-blind.cue.'))).toBe(false);
    expect(call.played.some((c) => c.startsWith('moca-blind.dateMissing'))).toBe(false);
    expect(record.promptEvents.some((p) => p.promptKey === 'cuesSkipped')).toBe(true);
    const s = score(record);
    expect(s.fields).toMatchObject({ vigilance: 1, total: null });
    expect(s.reviewReasons).toContain('asr_unavailable');
  });
});

describe('T1 Standardization Firewall (engine view)', () => {
  it('never shows memory words, cues, choices, sentences or letters, and never captions a cue', async () => {
    const { call } = await run({ delayedFree: 'knee', 'delayedCues.1.cue#1': 'silk' });
    const secret = [
      ...form.items.words!,
      ...form.items.choices!.flatMap((c) => c.split('|')),
      ...form.items.cues!,
      ...form.items.sentences!,
      form.items.digitsForward![0]!,
      form.items.letters![0]!,
    ].map((s) => s.toLowerCase());
    for (const v of call.views) {
      const text = JSON.stringify(v).toLowerCase();
      for (const s of secret) expect(text, s).not.toContain(s);
    }
  });

  it('shows the same views for a right, wrong or silent digit answer', async () => {
    const views = async (answer: string) => (await run({ digitsForward: answer })).call.views;
    const right = await views(PERFECT.digitsForward!);
    expect(await views('one two')).toEqual(right);
    expect(await views('')).toEqual(right);
  });
});
