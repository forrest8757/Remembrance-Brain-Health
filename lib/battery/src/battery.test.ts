// P2 Definition of Done: simulated full-battery runs for both presets with
// fake time, plus delay windows, filler rules, interruption → resume, and
// window-overrun flagging.
import { describe, expect, it } from 'vitest';
import { estimateOf } from './catalog';
import { LEAN_B2C, TABLE_1_RAVLT, TABLE_2_CERAD, type BatteryDef } from './presets';
import { minutesRemaining, plan, progress, reduce, resolveBattery, startSession, type SessionState, type SessionStep } from './orchestrator';

const MIN = 60_000;
const ALL = new Set([
  'moca-blind', 'story-immediate', 'story-delayed', 'number-span', 'ravlt-immediate', 'ravlt-delayed',
  'cerad-immediate', 'cerad-delayed', 'category-fluency', 'oral-trails', 'phonemic-fluency', 'naming',
]);

type Trace = { at: number; step: SessionStep };

/**
 * Run a battery on fake time: every test takes its estimate (or `durations`),
 * fillers wait exactly as long as plan() asks. `hooks` can interrupt.
 */
function simulate(
  def: BatteryDef,
  opts: { available?: Set<string>; includeOptional?: boolean; durations?: Record<string, number>; afterTest?: Record<string, (s: SessionState, t: number) => [SessionState, number]> } = {},
) {
  const resolved = resolveBattery(def, opts.available ?? ALL, { includeOptional: opts.includeOptional ?? true });
  let t = 0;
  let s = startSession(resolved, t);
  const trace: Trace[] = [];
  for (let guard = 0; guard < 100; guard++) {
    const step = plan(s, t);
    trace.push({ at: t, step });
    if (step.kind === 'done') break;
    if (step.kind === 'visitBreak') {
      t = step.earliestAt;
      s = reduce(s, { type: 'NEXT_VISIT', at: t });
      continue;
    }
    if (step.kind === 'filler') {
      s = reduce(s, { type: 'FILLER_STARTED', forTestId: step.forTestId, kind: step.filler, at: t });
      t = step.untilAt;
      s = reduce(s, { type: 'FILLER_ENDED', at: t });
      continue;
    }
    s = reduce(s, { type: 'TEST_STARTED', testId: step.testId, at: t });
    t += opts.durations?.[step.testId] ?? estimateOf(step.testId);
    s = reduce(s, { type: 'TEST_ENDED', testId: step.testId, at: t, outcome: 'complete' });
    const hook = opts.afterTest?.[step.testId];
    if (hook) [s, t] = hook(s, t);
  }
  const order = trace.flatMap((x) => (x.step.kind === 'test' ? [x.step.testId] : x.step.kind === 'filler' ? [`(${x.step.filler} for ${x.step.forTestId})`] : []));
  return { s, t, trace, order, resolved };
}
const item = (s: SessionState, id: string) => s.items.find((i) => i.testId === id)!;

describe('presets run end to end on fake time', () => {
  it('Table 1 (RAVLT): canonical order; RAVLT delayed waits with non-verbal filler to 20 min', () => {
    const { s, order } = simulate(TABLE_1_RAVLT);
    expect(order).toEqual([
      'moca-blind', 'story-immediate', 'number-span', 'ravlt-immediate', 'category-fluency', 'oral-trails',
      'story-delayed', 'phonemic-fluency', '(nonVerbal for ravlt-delayed)', 'ravlt-delayed', 'naming',
    ]);
    expect(item(s, 'ravlt-delayed').delayMinutes).toBe(20);
    expect(item(s, 'story-delayed').delayMinutes).toBeGreaterThanOrEqual(20);
    expect(s.items.every((i) => i.status === 'complete')).toBe(true);
  });

  it('Table 2 (CERAD): CERAD delayed waits until ≥ 5 min', () => {
    const { s, order } = simulate(TABLE_2_CERAD);
    expect(order.indexOf('cerad-delayed')).toBeGreaterThan(order.indexOf('category-fluency'));
    expect(item(s, 'cerad-delayed').delayMinutes).toBeGreaterThanOrEqual(5);
    expect(s.items.every((i) => i.status === 'complete')).toBe(true);
  });

  it('lean battery: the story delay is filled with a neutral pause only, never another test', () => {
    const { s, order } = simulate(LEAN_B2C);
    expect(order.slice(-2)).toEqual(['(neutralPause for story-delayed)', 'story-delayed']);
    expect(item(s, 'story-delayed').delayMinutes).toBe(20);
  });
});

describe('delay windows and filler rules', () => {
  it('a delayed test that comes due early gets filler, not the next test (story: neutral pause)', () => {
    const def: BatteryDef = { id: 'x', title: 'x', items: [{ testId: 'story-immediate' }, { testId: 'story-delayed' }, { testId: 'number-span' }] };
    const { order } = simulate(def);
    expect(order).toEqual(['story-immediate', '(neutralPause for story-delayed)', 'story-delayed', 'number-span']);
  });

  it('a window about to close because of the next test → the delayed test moves up (flagged)', () => {
    // RAVLT clock starts at ravlt-immediate's end; slow tests push past 20 min, and the next one would cross 30.
    const { order, trace } = simulate(TABLE_1_RAVLT, { durations: { 'category-fluency': 15 * MIN, 'oral-trails': 12 * MIN } });
    const moved = trace.find((x) => x.step.kind === 'test' && x.step.testId === 'ravlt-delayed')!;
    expect(moved.step).toMatchObject({ flags: ['moved_up_to_protect_window'] });
    expect(order.indexOf('ravlt-delayed')).toBeLessThan(order.indexOf('phonemic-fluency'));
  });

  it('an interruption past the window → administered immediately on resume and flagged (never dropped)', () => {
    const { s, order, trace } = simulate(TABLE_1_RAVLT, {
      afterTest: {
        'category-fluency': (st, t) => {
          // 45 minutes away: the RAVLT window (20–30 min) closes meanwhile.
          let x = reduce(st, { type: 'INTERRUPTED', at: t });
          x = reduce(x, { type: 'RESUMED', at: t + 45 * MIN });
          return [x, t + 45 * MIN];
        },
      },
    });
    expect(order[order.indexOf('category-fluency') + 1]).toBe('ravlt-delayed');
    expect(trace.find((x) => x.step.kind === 'test' && x.step.testId === 'ravlt-delayed')!.step).toMatchObject({ flags: ['window_overrun'] });
    expect(item(s, 'ravlt-delayed').delayMinutes).toBeGreaterThan(30);
    expect(item(s, 'ravlt-delayed').status).toBe('complete');
  });

  it('delay clocks keep running through an interruption (actual minutes recorded)', () => {
    const { s } = simulate(LEAN_B2C, {
      afterTest: { 'number-span': (st, t) => [reduce(reduce(st, { type: 'INTERRUPTED', at: t }), { type: 'RESUMED', at: t + 30 * MIN }), t + 30 * MIN] },
    });
    // No filler needed: 30 min away already covers the 20-min story delay.
    expect(item(s, 'story-delayed').delayMinutes).toBeGreaterThan(30);
  });
});

describe('interruption → resume', () => {
  it('a test running when the session was interrupted restarts on resume, flagged', () => {
    const resolved = resolveBattery(LEAN_B2C, ALL);
    let s = startSession(resolved, 0);
    s = reduce(s, { type: 'TEST_STARTED', testId: 'moca-blind', at: 0 });
    s = reduce(s, { type: 'INTERRUPTED', at: 2 * MIN });
    // Persisted and reloaded (refresh): the state is plain JSON.
    s = JSON.parse(JSON.stringify(s)) as SessionState;
    s = reduce(s, { type: 'RESUMED', at: 5 * MIN });
    expect(item(s, 'moca-blind')).toMatchObject({ status: 'pending', flags: ['restarted_after_interruption'] });
    expect(plan(s, 5 * MIN)).toEqual({ kind: 'test', testId: 'moca-blind', flags: [] });
    expect(s.interruptions).toEqual([{ at: 2 * MIN, resumedAt: 5 * MIN }]);
  });

  it('resuming during a filler keeps the original wait (no restart of the delay)', () => {
    const def: BatteryDef = { id: 'x', title: 'x', items: [{ testId: 'story-immediate' }, { testId: 'story-delayed' }] };
    let s = startSession(resolveBattery(def, ALL), 0);
    s = reduce(s, { type: 'TEST_STARTED', testId: 'story-immediate', at: 0 });
    s = reduce(s, { type: 'TEST_ENDED', testId: 'story-immediate', at: 5 * MIN, outcome: 'complete' });
    const wait = plan(s, 5 * MIN);
    expect(wait).toMatchObject({ kind: 'filler', untilAt: 25 * MIN });
    s = reduce(s, { type: 'INTERRUPTED', at: 10 * MIN });
    s = reduce(s, { type: 'RESUMED', at: 12 * MIN });
    expect(plan(s, 12 * MIN)).toMatchObject({ kind: 'filler', untilAt: 25 * MIN });
  });
});

describe('resolving and validating batteries', () => {
  it('skips tests the app can’t run, and a delayed test whose partner is skipped', () => {
    const r = resolveBattery(LEAN_B2C, new Set(['number-span', 'category-fluency', 'oral-trails', 'phonemic-fluency', 'story-delayed']));
    expect(r.items).toEqual(['number-span', 'category-fluency', 'oral-trails', 'phonemic-fluency']);
    expect(r.skipped).toEqual(expect.arrayContaining([
      { testId: 'moca-blind', reason: 'unavailable' },
      { testId: 'story-immediate', reason: 'unavailable' },
      { testId: 'story-delayed', reason: 'partner_unavailable' },
    ]));
    expect(r.issues).toEqual([]);
  });

  it('optional tests are left out unless included', () => {
    expect(resolveBattery(TABLE_1_RAVLT, ALL).items).not.toContain('oral-trails');
    expect(resolveBattery(TABLE_1_RAVLT, ALL, { includeOptional: true }).items).toContain('oral-trails');
  });

  it('rejects a delayed test before its partner', () => {
    const def: BatteryDef = { id: 'bad', title: 'bad', items: [{ testId: 'story-delayed' }, { testId: 'story-immediate' }] };
    expect(resolveBattery(def, ALL).issues[0]).toMatch(/comes before its partner/);
  });

  it('rejects a window that can’t be met (too much between RAVLT immediate and delayed)', () => {
    const def: BatteryDef = {
      id: 'long',
      title: 'long',
      items: ['ravlt-immediate', 'moca-blind', 'naming', 'number-span', 'category-fluency', 'oral-trails', 'ravlt-delayed'].map((testId) => ({ testId })),
    };
    expect(resolveBattery(def, ALL).issues[0]).toMatch(/over the 30-min window/);
  });

  it('notes expected filler', () => {
    expect(resolveBattery(LEAN_B2C, ALL).notes[0]).toMatch(/story-delayed: ~\d+ min of neutral pause/);
  });
});

describe('two visits (D12) and progress', () => {
  it('MoCA in a first visit, the rest 1+ days later', () => {
    const def: BatteryDef = { ...LEAN_B2C, visits: [[0], [1, 2, 3, 4, 5, 6]] };
    const { trace, s } = simulate(def);
    const brk = trace.find((x) => x.step.kind === 'visitBreak')!;
    expect(brk.step).toMatchObject({ nextVisit: 1 });
    expect((brk.step as { earliestAt: number }).earliestAt).toBe(estimateOf('moca-blind') + 24 * 60 * MIN);
    expect(s.items.every((i) => i.status === 'complete')).toBe(true);
  });

  it('with MoCA switched off, the empty first visit disappears', () => {
    const def: BatteryDef = { ...LEAN_B2C, visits: [[0], [1, 2, 3, 4, 5, 6]] };
    const avail = new Set([...ALL].filter((t) => t !== 'moca-blind'));
    const { trace } = simulate(def, { available: avail });
    expect(trace.some((x) => x.step.kind === 'visitBreak')).toBe(false);
  });

  it('progress is test N of M; time remaining includes the expected wait', () => {
    const r = resolveBattery(LEAN_B2C, ALL);
    const s = startSession(r, 0);
    expect(progress(s)).toEqual({ current: 1, total: 7 });
    // Tests take 10 + 5 + 5 + 4 + 5 + 4 = 33 min; the story delay ends at 15 + 20 = 35 (2 min wait); + 2 for the story = 37.
    expect(minutesRemaining(s, 0)).toBe(37);
  });
});
