// End-to-end engine tests through a simulated phone call (CLAUDE.md §14.6,
// §14.8, §14.9). See ./testing for the fake TelephonyPort.
import { describe, expect, it } from 'vitest';
import { defineTestSpec, toyColorsSpec } from '@workspace/test-spec';
import { toyColorsForms } from '@workspace/forms';
import { toyColorsScorer } from '@workspace/scoring';
import { getView, type AdministrationRecord } from './index';
import { simulateCall, type Script } from './testing';

const form = toyColorsForms[0]!; // red, blue, yellow

const recallTokens = (rec: AdministrationRecord) => rec.responseWindows.filter((w) => w.stepKey === 'recall').at(-1)!;

describe('engine via simulated phone call', () => {
  it('runs the toy test end to end and scores it', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [['red', 1000], ['blue', 1800], ['yellow', 2600]] }]);
    await call.advance(30_000);
    const rec = await call.run.done;

    expect(call.played).toEqual([
      'toy-colors.intro', 'toy-colors.instruction', 'tok.red', 'tok.blue', 'tok.yellow',
      'toy-colors.yourTurn', 'toy-colors.encourage', 'toy-colors.thanks',
    ]);
    expect(rec.status).toBe('complete');
    expect(rec.stimulusEvents.map((e) => e.token)).toEqual(['red', 'blue', 'yellow']);
    const gaps = rec.stimulusEvents.slice(1).map((e, i) => e.actualOnsetMs - rec.stimulusEvents[i]!.actualOnsetMs);
    expect(gaps).toEqual([1000, 1000]);

    const window = recallTokens(rec);
    expect(window.closeReason).toBe('silence');
    expect(rec.promptEvents).toEqual([expect.objectContaining({ promptKey: 'silence5', reason: 'silence:5000' })]);

    const score = toyColorsScorer.score({ form, recall: { tokens: window.asrTokens, asrUnavailable: window.asrUnavailable }, equated: false });
    expect(score.fields).toEqual({ recalled: 3, intrusions: 0 });
  });

  it('gives the silence prompt at most once and closes on 10 s silence', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [] }]);
    await call.advance(30_000);
    const rec = await call.run.done;
    expect(rec.promptEvents).toHaveLength(1);
    const w = recallTokens(rec);
    expect(w.closeReason).toBe('silence');
    expect(w.closedAt! - w.openedAt).toBe(10_000);
  });

  it('closes when the participant says they are done', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [['red', 500]], sayDoneAt: 1500 }]);
    await call.advance(30_000);
    const w = recallTokens(await call.run.done);
    expect(w.closeReason).toBe('participant_done');
    expect(w.closedAt! - w.openedAt).toBe(1500);
  });

  it('enforces the 20 s hard limit while the participant keeps talking', async () => {
    const words: [string, number][] = Array.from({ length: 15 }, (_, i) => ['green', 500 + i * 2000]);
    const call = simulateCall(toyColorsSpec, form, [{ words }]);
    await call.advance(40_000);
    const w = recallTokens(await call.run.done);
    expect(w.closeReason).toBe('timeout');
    expect(w.closedAt! - w.openedAt).toBe(20_000);
  });

  it('repeats the instruction verbatim once when asked, and no more', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [] }]);
    // The fake port finishes clips on the next microtask, so subscribe
    // synchronously and ask twice as soon as the instruction starts.
    const sub = call.run.actor.subscribe((s) => {
      if (getView(s).stepKey === 'instruction') {
        call.run.actor.send({ type: 'REPEAT_REQUESTED' });
        call.run.actor.send({ type: 'REPEAT_REQUESTED' });
        sub.unsubscribe();
      }
    });
    await call.advance(30_000);
    const rec = await call.run.done;
    const instruction = rec.lineEvents.filter((l) => l.lineKey === 'instruction');
    expect(instruction.map((l) => l.repeat)).toEqual([false, true]);
  });

  it('pauses on a dropped call, restarts the window on callback, and keeps both windows', async () => {
    const call = simulateCall(toyColorsSpec, form, [
      { words: [['red', 1000]] },
      { words: [['red', 1000], ['blue', 1500], ['yellow', 2000]] },
    ]);
    const sub = call.run.actor.subscribe((s) => {
      if (getView(s).phase === 'listening') {
        sub.unsubscribe();
        setImmediate(() => call.run.callDropped());
      }
    });
    await call.advance(3_000);
    expect(getView(call.run.actor.getSnapshot()).phase).toBe('paused');
    expect(call.stopAllCalls()).toBe(1);
    // Nothing advances while paused: no prompts, no timeout.
    await call.advance(60_000);
    expect(getView(call.run.actor.getSnapshot()).phase).toBe('paused');

    call.run.resume();
    await call.advance(30_000);
    const rec = await call.run.done;
    expect(rec.status).toBe('complete');
    expect(rec.responseWindows.map((w) => w.windowKey)).toEqual(['recall#1', 'recall#2']);
    expect(rec.interruptions).toEqual([expect.objectContaining({ stepKey: 'recall', reason: 'call_dropped', resumedAt: expect.any(Number) })]);
    expect(rec.flags.map((f) => f.kind)).toContain('interruption');
    expect(recallTokens(rec).asrTokens.map((t) => t.token)).toEqual(['red', 'blue', 'yellow']);
  });

  it('invalidates with reason 97 when the spec forbids resuming', async () => {
    const strict = defineTestSpec({ ...toyColorsSpec, testId: 'toy-strict', onInterrupt: 'invalidate' });
    const call = simulateCall(strict, form, [{ words: [] }]);
    call.run.callDropped();
    call.run.resume();
    const rec = await call.run.done;
    expect(rec).toMatchObject({ status: 'partial', reasonCode: 97 });
  });

  it('ends gracefully with a refusal reason code', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [] }]);
    call.run.actor.send({ type: 'ABORT', reasonCode: 98 });
    const rec = await call.run.done;
    expect(rec).toMatchObject({ status: 'partial', reasonCode: 98 });
  });

  it('ignores stale completion events', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [] }]);
    call.run.actor.send({ type: 'LINE_ENDED', playId: 999 });
    expect(getView(call.run.actor.getSnapshot()).stepKey).toBe('intro');
  });

  it('records focus loss as a validity flag', async () => {
    const call = simulateCall(toyColorsSpec, form, [{ words: [] }]);
    call.run.actor.send({ type: 'FOCUS_LOST' });
    await call.advance(30_000);
    expect((await call.run.done).flags.map((f) => f.kind)).toContain('focus_lost');
  });
});

describe('Standardization Firewall (engine view)', () => {
  const tokens = toyColorsForms.flatMap((f) => f.items.colors!);

  const runViews = async (script: Script) => {
    const call = simulateCall(toyColorsSpec, form, [script]);
    await call.advance(30_000);
    await call.run.done;
    return call.views;
  };

  it('never exposes stimulus tokens in any view', async () => {
    const views = await runViews({ words: [['red', 1000], ['blue', 1800]] });
    for (const v of views) {
      const text = JSON.stringify(v).toLowerCase();
      for (const t of tokens) expect(text).not.toMatch(new RegExp(`\\b${t}\\b`));
      if (v.phase === 'presenting') expect(v.caption).toBeNull();
    }
  });

  it('produces identical views for correct, incorrect and silent responses', async () => {
    const correct = await runViews({ words: [['red', 1000], ['blue', 1800], ['yellow', 2600]] });
    const incorrect = await runViews({ words: [['green', 1000], ['pink', 1800], ['orange', 2600]] });
    const silent = await runViews({ words: [] });
    expect(incorrect).toEqual(correct);
    expect(silent).toEqual(correct);
  });
});
