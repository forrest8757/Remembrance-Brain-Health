// T8 Oral Trails through the engine on a simulated phone call. Covers the
// build doc's Definition of Done list: clean run, an error with the correction
// inside the latency budget, the 5-s prompt, the 15-s discontinue, the
// 100/300-s caps, every pre-test branch, practice pass on attempt 3 and
// practice fail → Part B not given.
import { describe, expect, it } from 'vitest';
import { oralTrailsSpec } from '@workspace/test-spec';
import { oralTrailsForms } from '@workspace/forms';
import { oralTrailsJudges, oralTrailsScorer, type TrailEvent } from '@workspace/scoring';
import type { AdministrationRecord } from './index';
import { simulateCall, type Script } from './testing';

const form = oralTrailsForms[0]!;
const A = form.items.partA![0]!.split('-');
const B = form.items.partB![0]!.split('-');
const LETTERS = 'abcdefghijkl'.split('');

/** Say `units` starting at `start` ms, `gap` ms apart. */
const seq = (units: string[], gap = 600, start = 1000): [string, number][] => units.map((u, i) => [u, start + i * gap]);
const s = (...parts: [string, number][][]): Script => ({ words: parts.flat() });

const CLEAN: Record<string, Script> = {
  partA: s(seq(A)),
  pretest: s(seq(LETTERS, 400)),
  bPractice: s(seq(['1', 'a', '2', 'b', '3', 'c', '4'], 500)),
  partB: s(seq(B, 900)),
};

async function run(overrides: Record<string, Script> = {}) {
  const scripts = { ...CLEAN, ...overrides };
  const call = simulateCall(oralTrailsSpec, form, (windowKey) => scripts[windowKey] ?? scripts[windowKey.split('#')[0]!] ?? { words: [] }, {
    judges: oralTrailsJudges,
  });
  await call.advanceUntilDone();
  const record: AdministrationRecord = await call.run.done;
  return { call, record };
}

const eventsOf = (r: AdministrationRecord, stepKey: string) => r.sequenceEvents.filter((e) => e.stepKey === stepKey) as unknown as TrailEvent[];
const windowOf = (r: AdministrationRecord, stepKey: string) => r.responseWindows.filter((w) => w.stepKey === stepKey).at(-1);
const outcome = (r: AdministrationRecord, stepKey: string) => {
  if (r.notAdministered.some((n) => n.stepKey === stepKey)) return 'notAdministered' as const;
  const w = windowOf(r, stepKey);
  return w?.closeReason === 'count' ? ('done' as const) : w?.closeReason === 'timeout' ? ('timeout' as const) : w?.closeReason === 'discontinue' ? ('discontinued' as const) : ('incomplete' as const);
};
const score = (r: AdministrationRecord) =>
  oralTrailsScorer.score({
    form,
    partA: { events: eventsOf(r, 'partA'), outcome: outcome(r, 'partA'), asrUnavailable: false },
    partB: { events: eventsOf(r, 'partB'), outcome: outcome(r, 'partB'), asrUnavailable: false },
    partBReasonCode: r.notAdministered.find((n) => n.stepKey === 'partB')?.reasonCode ?? null,
    discontinueReasonCode: 996,
    practiceAttempts: r.responseWindows.filter((w) => w.stepKey === 'bPractice').length || null,
    equated: true,
  });
const played = (clips: string[], key: string) => clips.filter((c) => c.startsWith(`oral-trails.${key}`)).length;

describe('T8 Oral Trails (simulated call)', () => {
  it('clean run: both parts finish; no corrections; switch cost recorded', async () => {
    const { record, call } = await run();
    expect(record.status).toBe('complete');
    expect(outcome(record, 'partA')).toBe('done');
    expect(outcome(record, 'partB')).toBe('done');
    expect(played(call.played, 'aCorrection') + played(call.played, 'bCorrection')).toBe(0);
    const sc = score(record);
    expect(sc.fields).toMatchObject({ partAErrors: 0, partACorrect: 25, partBErrors: 0, partBCorrect: 25 });
    expect(sc.fields.partATime).toBe(Math.round((1000 + 24 * 600 + 300) / 1000));
    expect(sc.fields.switchCost).toBeGreaterThan(0);
  });

  it('an error mid-sequence gets "You last said \'3\'" within the 1.2-s budget; the timer keeps running', async () => {
    const { record, call } = await run({
      // 1 2 3 5 6 → correction; after the clip, "3 4 … 25".
      partA: s(seq(['1', '2', '3', '5', '6'], 600), seq(A.slice(2), 600, 7_000)),
    });
    expect(call.played).toContain('oral-trails.aCorrection.you-were-at-3-carry-on-from-there');
    const corr = eventsOf(record, 'partA').find((e) => e.type === 'correction') as Extract<TrailEvent, { type: 'correction' }>;
    expect(corr.latencyMs).not.toBeNull();
    expect(corr.latencyMs!).toBeLessThanOrEqual(oralTrailsSpec.steps.find((x) => x.key === 'partA' && x.type === 'sequenceTask') ? 1_200 : 0);
    const sc = score(record);
    expect(sc.fields).toMatchObject({ partAErrors: 1, partACorrect: 25, partASequencingErrors: 1 });
    // Time includes the correction: the last number ends ~7 s + 22 × 0.6 s after "Begin".
    expect(sc.fields.partATime).toBe(Math.round((7_000 + 22 * 600 + 300) / 1000));
  });

  it('a self-correction before the examiner speaks is not an error and plays no correction', async () => {
    const { record, call } = await run({ partA: s(seq(['1', '2', '3', '5', '4', ...A.slice(4)], 600)) });
    expect(played(call.played, 'aCorrection')).toBe(0);
    expect(score(record).fields).toMatchObject({ partAErrors: 0, partASelfCorrections: 1 });
  });

  it('a 5-s pause gets "Please keep going." once, without an error', async () => {
    const { record, call } = await run({ partA: s(seq(['1', '2', '3']), seq(A.slice(3), 600, 9_000)) });
    expect(played(call.played, 'keepGoing')).toBe(1);
    expect(score(record).fields).toMatchObject({ partAErrors: 0, partAKeepGoingPrompts: 1, partACorrect: 25 });
  });

  it('15 s without progress after the prompt: lost correction (an error), then discontinue (996, blanks)', async () => {
    const { record, call } = await run({ partA: s(seq(['1', '2', '3'])) });
    expect(played(call.played, 'keepGoing')).toBe(1);
    expect(call.played).toContain('oral-trails.aCorrection.you-were-at-3-carry-on-from-there');
    expect(outcome(record, 'partA')).toBe('discontinued');
    expect(record.discontinued.some((d) => d.stepKey === 'partA')).toBe(true);
    expect(score(record).fields).toMatchObject({ partATime: 996, partAErrors: null, partACorrect: null });
    // The rest of the test still runs.
    expect(outcome(record, 'partB')).toBe('done');
  });

  it('not finished by 100 s → Part A time 100', async () => {
    // One number every 4.5 s (under the 5-s prompt) reaches only 22 by 100 s.
    const { record } = await run({ partA: s(seq(A, 4_500)) });
    expect(outcome(record, 'partA')).toBe('timeout');
    expect(windowOf(record, 'partA')!.closedAt! - windowOf(record, 'partA')!.openedAt).toBe(100_000);
    expect(score(record).fields.partATime).toBe(100);
  });

  it('not finished by 300 s → Part B time 300', async () => {
    // 14 s per element: each pause draws "keep going" and a lost-place correction, but never 15 s more.
    const { record } = await run({ partB: s(seq(B, 14_000)) });
    expect(outcome(record, 'partB')).toBe('timeout');
    expect(score(record).fields.partBTime).toBe(300);
  });

  describe('pre-test branches', () => {
    const oneError = s(seq(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l'], 400));
    it('0 errors → Part B', async () => {
      const { record } = await run();
      expect(record.responseWindows.filter((w) => w.stepKey === 'pretest')).toHaveLength(1);
      expect(outcome(record, 'partB')).toBe('done');
    });
    it('1–2 errors, then a clean second try → Part B', async () => {
      const { record, call } = await run({ 'pretest#1': oneError, 'pretest#2': s(seq(LETTERS, 400)) });
      expect(record.responseWindows.filter((w) => w.stepKey === 'pretest')).toHaveLength(2);
      expect(played(call.played, 'pretest')).toBe(2);
      expect(outcome(record, 'partB')).toBe('done');
    });
    it('1–2 errors, then any error on the second try → Part B not given (997)', async () => {
      const { record, call } = await run({ 'pretest#1': oneError, 'pretest#2': oneError });
      expect(record.notAdministered.filter((n) => n.reasonCode === 997).map((n) => n.stepKey)).toEqual(['bIntro', 'bPractice', 'bGo', 'partB']);
      expect(played(call.played, 'bIntro')).toBe(0);
      expect(score(record).fields.partBTime).toBe(997);
    });
    it('≥3 errors → Part B not given at once (no second try)', async () => {
      const { record } = await run({ pretest: s(seq(['a', 'b', 'c', 'x', 'y', 'z'], 400)) });
      expect(record.responseWindows.filter((w) => w.stepKey === 'pretest')).toHaveLength(1);
      expect(outcome(record, 'partB')).toBe('notAdministered');
    });
  });

  describe('Part B practice', () => {
    const wrong = s(seq(['1', '2', '3', '4'], 500));
    it('passes on attempt 3 after the scripted correction twice', async () => {
      const { record, call } = await run({ 'bPractice#1': wrong, 'bPractice#2': wrong, 'bPractice#3': CLEAN.bPractice! });
      expect(record.responseWindows.filter((w) => w.stepKey === 'bPractice')).toHaveLength(3);
      expect(played(call.played, 'bPracticeWrong')).toBe(2);
      expect(played(call.played, 'bPracticeAgain')).toBe(2);
      expect(outcome(record, 'partB')).toBe('done');
      expect(score(record).fields.partBPracticeAttempts).toBe(3);
    });
    it('three failed attempts → Part B not given (996)', async () => {
      const { record } = await run({ bPractice: wrong });
      expect(record.responseWindows.filter((w) => w.stepKey === 'bPractice')).toHaveLength(3);
      expect(record.notAdministered.filter((n) => n.reasonCode === 996).map((n) => n.stepKey)).toEqual(['bGo', 'partB']);
      expect(score(record).fields.partBTime).toBe(996);
    });
  });

  it('Part B set-loss ("4, 5") is corrected with the last pair and scored as set-loss', async () => {
    const { record, call } = await run({
      partB: s(seq(['1', 'a', '2', 'b', '3', 'c', '4', '5', '6'], 900), seq(B.slice(4), 900, 14_000)),
    });
    expect(call.played).toContain('oral-trails.bCorrection.you-were-at-3-c-carry-on-from-there');
    expect(score(record).fields).toMatchObject({ partBErrors: 1, partBSetLossErrors: 1, partBCorrect: 25 });
  });

  it('an interruption mid-part restarts that part with a fresh timer and flags it', async () => {
    const call = simulateCall(oralTrailsSpec, form, (k) => CLEAN[k.split('#')[0]!] ?? { words: [] }, { judges: oralTrailsJudges });
    await call.advance(8_000);
    call.run.actor.send({ type: 'PAUSE', reason: 'backgrounded' });
    await call.advance(1_000);
    call.run.actor.send({ type: 'RESUME' });
    await call.advanceUntilDone();
    const record = await call.run.done;
    expect(record.responseWindows.filter((w) => w.stepKey === 'partA').length).toBe(2);
    expect(record.flags.some((f) => f.kind === 'interruption')).toBe(true);
    expect(outcome(record, 'partA')).toBe('done');
  });
});
