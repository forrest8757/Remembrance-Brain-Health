// P1 Session Shell flows (build doc DoD): happy path, hearing fail → graceful
// exit, caregiver setup → handoff, consent declined; returning shortcuts; and
// the validity rating.
import { describe, expect, it } from 'vitest';
import { ENVIRONMENT_KEYS, shellReduce, startShell, validityOf, type ShellAction, type ShellState } from './shell';

const play = (s: ShellState, actions: ShellAction[]) => actions.reduce((st, a) => shellReduce(st, a, 0), s);
const hearingOk: ShellAction[] = [
  { type: 'HEARING_ANSWER', question: 'troubleUsually', yes: false },
  { type: 'HEARING_ANSWER', question: 'hearsWell', yes: true },
  { type: 'HEARING_ANSWER', question: 'usesDevice', yes: false },
];
const calmSpace: ShellAction[] = ENVIRONMENT_KEYS.map((key) => ({ type: 'ENVIRONMENT', key, answer: { issue: false, resolved: true } }));
const first = () => startShell({ returning: false, consentOnFile: false, now: 0 });
const valid = (shell: ShellState, extra: Partial<Parameters<typeof validityOf>[0]> = {}) =>
  validityOf({ shell, sessionInterruptions: 0, focusLost: 0, testInterruptions: 0, windowOverruns: 0, ...extra });

describe('first visit', () => {
  it('happy path: identity → plan → device → hearing → repetition → environment → consent → rapport → battery → self-report → complete', () => {
    let s = first();
    const stages: string[] = [s.stage];
    const step = (a: ShellAction | ShellAction[]) => {
      s = play(s, Array.isArray(a) ? a : [a]);
      stages.push(s.stage);
    };
    step({ type: 'IDENTITY', confirmed: true });
    step({ type: 'CONTINUE' });
    step({ type: 'CONTINUE' });
    step(hearingOk);
    step({ type: 'HEARING_REPEAT_RESULT', passed: true });
    step(calmSpace);
    step({ type: 'CONSENT', given: true });
    step({ type: 'READY', ready: true, integrityVersion: 'soft-v1' });
    step({ type: 'BATTERY_DONE' });
    step({ type: 'SELF_REPORT', report: { interrupted: false, helped: false, usedAids: false, tired: false, feeling: 'calm' } });
    expect(stages).toEqual(['identity', 'interruptionPlan', 'device', 'hearingQuestions', 'hearingRepeat', 'environment', 'consent', 'rapport', 'battery', 'selfReport', 'complete']);
    expect(s.integrityVersion).toBe('soft-v1');
    expect(valid(s)).toEqual({ rating: 1, categories: [], reasons: [] });
  });

  it('a hearing device that isn\'t in place is asked about', () => {
    const s = play(first(), [
      { type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' },
      { type: 'HEARING_ANSWER', question: 'troubleUsually', yes: false },
      { type: 'HEARING_ANSWER', question: 'hearsWell', yes: true },
      { type: 'HEARING_ANSWER', question: 'usesDevice', yes: true },
    ]);
    expect(s.stage).toBe('hearingQuestions');
    expect(shellReduce(s, { type: 'HEARING_ANSWER', question: 'deviceInPlace', yes: false }).stage).toBe('hearingRepeat');
  });

  it('hearing fails twice → volume/earbuds card → one more round → fails → graceful end (validity: hearing, invalid)', () => {
    let s = play(first(), [{ type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk]);
    s = shellReduce(s, { type: 'HEARING_REPEAT_RESULT', passed: false });
    expect(s.stage).toBe('hearingBoost');
    s = shellReduce(s, { type: 'CONTINUE' });
    expect(s).toMatchObject({ stage: 'hearingRepeat', hearing: { boosted: true } });
    s = shellReduce(s, { type: 'HEARING_REPEAT_RESULT', passed: false });
    expect(s).toMatchObject({ stage: 'ended', ended: 'hearing' });
    expect(valid(s)).toMatchObject({ rating: 3, categories: [1] });
  });

  it('passing after the volume card continues, flagged as some trouble hearing', () => {
    let s = play(first(), [{ type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk, { type: 'HEARING_REPEAT_RESULT', passed: false }, { type: 'CONTINUE' }]);
    s = shellReduce(s, { type: 'HEARING_REPEAT_RESULT', passed: true });
    expect(s.stage).toBe('environment');
    expect(valid(s)).toMatchObject({ rating: 2, categories: [1] });
  });

  it('caregiver setup → handoff: the person-nearby item resolves when they leave', () => {
    let s = play(first(), [{ type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk, { type: 'HEARING_REPEAT_RESULT', passed: true }]);
    s = play(s, calmSpace.filter((a) => a.type === 'ENVIRONMENT' && a.key !== 'people'));
    s = shellReduce(s, { type: 'ENVIRONMENT', key: 'people', answer: { issue: true, resolved: false } });
    expect(s.stage).toBe('environment');
    s = shellReduce(s, { type: 'CAREGIVER_LEFT' });
    expect(s.caregiverHandoff).toBe(true);
    expect(valid(s).categories).not.toContain(2);
  });

  it('an unresolved environment item keeps the checklist open', () => {
    const s = play(first(), [{ type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk, { type: 'HEARING_REPEAT_RESULT', passed: true }, ...calmSpace.slice(0, 6), { type: 'ENVIRONMENT', key: 'dates', answer: { issue: true, resolved: false } }]);
    expect(s.stage).toBe('environment');
  });

  it('consent declined → polite end (hard gate)', () => {
    const s = play(first(), [{ type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk, { type: 'HEARING_REPEAT_RESULT', passed: true }, ...calmSpace, { type: 'CONSENT', given: false }]);
    expect(s).toMatchObject({ stage: 'ended', ended: 'consent', consent: 'declined' });
  });

  it('identity not confirmed → end', () => {
    expect(shellReduce(first(), { type: 'IDENTITY', confirmed: false })).toMatchObject({ stage: 'ended', ended: 'identity' });
  });
});

describe('returning participant', () => {
  it('skips the plan, device tips, hearing questions and consent on file, but always re-runs the hearing repetition and environment check', () => {
    let s = startShell({ returning: true, consentOnFile: true, now: 0 });
    s = shellReduce(s, { type: 'IDENTITY', confirmed: true });
    expect(s.stage).toBe('hearingRepeat');
    s = shellReduce(s, { type: 'HEARING_REPEAT_RESULT', passed: true });
    expect(s.stage).toBe('environment');
    s = play(s, calmSpace);
    expect(s.stage).toBe('rapport');
  });
});

describe('validity rating (CLAUDE.md §12)', () => {
  const done = (report: Partial<NonNullable<ShellState['selfReport']>>) =>
    play(first(), [
      { type: 'IDENTITY', confirmed: true }, { type: 'CONTINUE' }, { type: 'CONTINUE' }, ...hearingOk, { type: 'HEARING_REPEAT_RESULT', passed: true }, ...calmSpace,
      { type: 'CONSENT', given: true }, { type: 'READY', ready: true, integrityVersion: 'soft-v1' }, { type: 'BATTERY_DONE' },
      { type: 'SELF_REPORT', report: { interrupted: false, helped: false, usedAids: false, tired: false, feeling: 'calm', ...report } },
    ]);
  it('help from someone or writing things down → invalid (7)', () => {
    expect(valid(done({ helped: true }))).toMatchObject({ rating: 3, categories: [7] });
    expect(valid(done({ usedAids: true }))).toMatchObject({ rating: 3, categories: [7] });
  });
  it('interruptions, fatigue, stress, focus loss → questionable', () => {
    expect(valid(done({ interrupted: true }))).toMatchObject({ rating: 2, categories: [3] });
    expect(valid(done({ tired: true }))).toMatchObject({ rating: 2, categories: [5] });
    expect(valid(done({ feeling: 'very_stressed' }))).toMatchObject({ rating: 2, categories: [6] });
    expect(valid(done({}), { focusLost: 1 })).toMatchObject({ rating: 2, categories: [2] });
    expect(valid(done({}), { windowOverruns: 1 })).toMatchObject({ rating: 2, categories: [3] });
  });
});
