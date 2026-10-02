// T3 Number Span through the engine on a simulated phone call
// (docs/build-prompts.md §T3; CLAUDE.md §14.6, §14.8, §14.9).
import { describe, expect, it } from 'vitest';
import { numberSpanSpec } from '@workspace/test-spec';
import { numberSpanFormA } from '@workspace/forms';
import { numberSpanJudges, numberSpanScorer } from '@workspace/scoring';
import { summarizeTrials, type AdministrationRecord } from './index';
import { simulateCall, type Script, type SimulateOptions } from './testing';

const form = numberSpanFormA;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const speak = (digits: number[], startMs = 600): Script => ({ words: digits.map((d, i) => [WORDS[d]!, startMs + i * 500]) });
const silent: Script = { words: [] };

/** Which item a window belongs to: "forward.3#1" → forward item 3; "bwdPractice#1" → the practice item. */
function itemFor(windowKey: string): { block: 'forward' | 'backward'; item: number[]; index: number } {
  const base = windowKey.split('#')[0]!;
  if (base === 'fwdPractice') return { block: 'forward', item: [3, 9, 5], index: -1 };
  if (base === 'bwdPractice') return { block: 'backward', item: [7, 1, 5], index: -1 };
  const [block, idx] = base.split('.') as ['forward' | 'backward', string];
  return { block, item: form.items[block]![Number(idx)]!.split('-').map(Number), index: Number(idx) };
}

/** A participant who can hold `fwdSpan` digits forward and `bwdSpan` backward. */
const participant =
  (fwdSpan: number, bwdSpan: number, override?: (windowKey: string, attempt: number) => Script | undefined) =>
  (windowKey: string): Script => {
    const attempt = Number(windowKey.split('#')[1]);
    const custom = override?.(windowKey, attempt);
    if (custom) return custom;
    const { block, item } = itemFor(windowKey);
    const span = block === 'forward' ? fwdSpan : bwdSpan;
    if (item.length > span) return speak([1, 2]); // a wrong answer
    return speak(block === 'forward' ? item : [...item].reverse());
  };

async function run(script: Parameters<typeof simulateCall>[2], opts: SimulateOptions = {}, ms = 400_000) {
  const call = simulateCall(numberSpanSpec, form, script, { judges: numberSpanJudges, ...opts });
  await call.advance(ms);
  return { call, record: await call.run.done };
}

const score = (record: AdministrationRecord) => {
  const s = summarizeTrials(record, numberSpanSpec, form);
  return numberSpanScorer.score({
    form,
    responses: (['forward', 'backward'] as const).flatMap((d) => s[d]!.responses.map((r) => ({ direction: d, ...r }))),
    completed: { forward: s.forward!.completed, backward: s.backward!.completed },
    reasonCode: record.reasonCode,
    equated: false,
  });
};

const presentedItems = (record: AdministrationRecord, step: string) =>
  [...new Set(record.stimulusEvents.filter((e) => e.stepKey === step).map((e) => e.itemIndex))];

describe('T3 Number Span engine', () => {
  it('runs forward and backward, discontinuing after both trials at a length fail', async () => {
    const { call, record } = await run(participant(5, 4));
    expect(record.status).toBe('complete');
    // Forward lengths 3,4,5 pass; both length-6 trials (items 6,7) fail → stop.
    expect(presentedItems(record, 'forward')).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(record.discontinued.map((d) => [d.stepKey, d.afterItemIndex])).toEqual([
      ['forward', 7],
      ['backward', 7],
    ]);
    // Backward lengths 2,3,4 pass; both length-5 trials fail → stop.
    expect(presentedItems(record, 'backward')).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(score(record).fields).toEqual({ forwardTotal: 6, forwardLongestSpan: 5, backwardTotal: 6, backwardLongestSpan: 4 });
    // "Ready?" before every item, and never before the response.
    expect(call.played.filter((c) => c === 'number-span.ready')).toHaveLength(16);
  });

  it('continues when only one trial at a length fails', async () => {
    const { record } = await run(
      participant(9, 8, (key, attempt) => (key.startsWith('forward.0#') && attempt === 1 ? speak([9, 9]) : undefined)),
    );
    expect(record.discontinued).toEqual([]);
    expect(presentedItems(record, 'forward')).toHaveLength(14);
    expect(presentedItems(record, 'backward')).toHaveLength(14);
    expect(score(record).fields).toMatchObject({ forwardTotal: 13, forwardLongestSpan: 9, backwardTotal: 14, backwardLongestSpan: 8 });
  });

  it('presents digits at 1 per second, onset to onset', async () => {
    const { record } = await run(participant(4, 3));
    const item0 = record.stimulusEvents.filter((e) => e.stepKey === 'forward' && e.itemIndex === 0);
    expect(item0.map((e) => e.token)).toEqual(['1', '8', '4']);
    expect(item0.slice(1).map((e, i) => e.actualOnsetMs - item0[i]!.actualOnsetMs)).toEqual([1000, 1000]);
  });

  it('gives scripted practice feedback only after a wrong practice answer', async () => {
    const right = await run(participant(4, 3));
    expect(right.call.played).not.toContain('number-span.fwdFeedback');
    const wrong = await run(participant(4, 3, (key) => (key.startsWith('fwdPractice') ? speak([2, 8, 9]) : undefined)));
    expect(wrong.call.played).toContain('number-span.fwdFeedback');
    expect(wrong.call.played).not.toContain('number-span.bwdFeedback');
    // Practice never counts toward scores.
    expect(score(wrong.record).fields).toEqual(score(right.record).fields);
  });

  it('closes a window 3 s after the participant stops, or 10 s if they never speak', async () => {
    const { record } = await run(participant(3, 2, (key) => (key === 'forward.1#1' ? silent : undefined)));
    const w0 = record.responseWindows.find((w) => w.windowKey === 'forward.0#1')!;
    const w1 = record.responseWindows.find((w) => w.windowKey === 'forward.1#1')!;
    // Item 0: last word ends at 600 + 2×500 + 300 = 1900 ms; +3 s silence.
    expect(w0.closedAt! - w0.openedAt).toBe(4900);
    expect(w0.closeReason).toBe('silence');
    expect(w1.closedAt! - w1.openedAt).toBe(10_000);
    expect(w1.closeReason).toBe('timeout');
  });

  it('reminds once about backward order on the first two items, without re-presenting', async () => {
    const { call, record } = await run(
      participant(4, 3, (key, attempt) => {
        const { block, item, index } = itemFor(key);
        if (block !== 'backward' || index < 0) return undefined;
        if (index === 0 && attempt === 1) return speak(item); // forward order → reminder
        if (index === 1) return speak(item); // forward order again → no second reminder
        return undefined;
      }),
    );
    expect(call.played.filter((c) => c === 'number-span.bwdReminder')).toHaveLength(1);
    expect(record.promptEvents.filter((p) => p.promptKey === 'reminder')).toHaveLength(1);
    // Item 0 was presented once but had two windows; the retry (correct reverse) counts.
    expect(record.stimulusEvents.filter((e) => e.stepKey === 'backward' && e.itemIndex === 0)).toHaveLength(2);
    expect(record.responseWindows.filter((w) => w.windowKey.startsWith('backward.0#')).map((w) => w.windowKey)).toEqual(['backward.0#1', 'backward.0#2']);
    const results = record.trialResults.filter((r) => r.stepKey === 'backward' && r.itemIndex <= 1);
    expect(results.map((r) => [r.itemIndex, r.correct, r.tag])).toEqual([
      [0, false, 'forward_order'],
      [0, true, null],
      [1, false, 'forward_order'],
    ]);
  });

  it('never reminds from the third item on, even if the reminder is unused', async () => {
    const { call } = await run(
      participant(4, 3, (key) => {
        const { block, item, index } = itemFor(key);
        return block === 'backward' && index === 2 ? speak(item) : undefined;
      }),
    );
    expect(call.played).not.toContain('number-span.bwdReminder');
  });

  it('answers a repeat request only with "Just do your best." (once per window)', async () => {
    const call = simulateCall(numberSpanSpec, form, participant(3, 2), { judges: numberSpanJudges });
    const sub = call.run.actor.subscribe((snap) => {
      if (JSON.stringify(snap.value).includes('listening') && snap.context.windowKey === 'forward.0#1') {
        sub.unsubscribe();
        queueMicrotask(() => {
          call.run.actor.send({ type: 'REPEAT_REQUESTED' });
          call.run.actor.send({ type: 'REPEAT_REQUESTED' });
        });
      }
    });
    await call.advance(400_000);
    const record = await call.run.done;
    expect(call.played.filter((c) => c === 'number-span.doBest')).toHaveLength(1);
    // The item was not re-presented.
    expect(record.stimulusEvents.filter((e) => e.stepKey === 'forward' && e.itemIndex === 0)).toHaveLength(3);
  });

  it('resumes an interrupted block at the current item', async () => {
    const call = simulateCall(numberSpanSpec, form, participant(9, 8), { judges: numberSpanJudges });
    const sub = call.run.actor.subscribe((snap) => {
      if (snap.context.windowKey === 'forward.3#1' && JSON.stringify(snap.value).includes('listening')) {
        sub.unsubscribe();
        queueMicrotask(() => call.run.callDropped());
      }
    });
    await call.advance(60_000);
    expect(call.run.actor.getSnapshot().matches('paused')).toBe(true);
    call.run.resume();
    await call.advance(400_000);
    const record = await call.run.done;
    // Items 0–2 once each; item 3 presented again after the callback; nothing skipped.
    expect(record.stimulusEvents.filter((e) => e.stepKey === 'forward' && e.itemIndex === 3)).toHaveLength(8);
    expect(record.responseWindows.filter((w) => w.windowKey.startsWith('forward.3#')).map((w) => w.windowKey)).toEqual(['forward.3#1', 'forward.3#2']);
    expect(presentedItems(record, 'forward')).toHaveLength(14);
    expect(record.interruptions[0]).toMatchObject({ stepKey: 'forward', reason: 'call_dropped' });
    expect(score(record).fields.forwardTotal).toBe(14);
  });

  it('never discontinues on an ASR outage and sends the administration to review', async () => {
    const { record } = await run(participant(3, 2), { asrUnavailable: true });
    expect(record.discontinued).toEqual([]);
    expect(presentedItems(record, 'forward')).toHaveLength(14);
    const s = score(record);
    expect(s.fields).toMatchObject({ forwardTotal: null, backwardTotal: null });
    expect(s.reviewReasons).toContain('asr_unavailable');
  });

  it('does not score or discontinue on an item whose presentation failed onset QA', async () => {
    // Practice items are spoken in the instruction, so presentation #0 is forward item 0.
    const { record } = await run(participant(9, 8, (key) => (key === 'forward.0#1' ? speak([9, 9]) : undefined)), {
      flagPresentation: (n) => n === 0,
    });
    expect(record.trialResults.find((r) => r.windowKey === 'forward.0#1')).toMatchObject({ correct: null, tag: 'timing_flagged' });
    expect(record.flags.map((f) => f.kind)).toContain('timing');
    const s = score(record);
    expect(s.fields.forwardTotal).toBe(13);
    expect(s.reviewReasons).toContain('timing_flagged');
  });

  it('shows a chrome break card between forward and backward', async () => {
    const { call } = await run(participant(3, 2));
    expect(call.views.some((v) => v.phase === 'break' && v.zone === 'chrome' && v.message === 'Nice. A slightly different one next.')).toBe(true);
  });
});

describe('T3 Standardization Firewall (engine view)', () => {
  const lines = new Set(numberSpanSpec.lines.map((l) => l.text));

  it('only ever captions scripted lines, and never during presentation or listening', async () => {
    const { call } = await run(participant(5, 4));
    for (const v of call.views) {
      if (v.caption !== null) expect(lines.has(v.caption)).toBe(true);
      if (v.phase === 'presenting' || v.phase === 'listening') expect(v.caption).toBeNull();
    }
  });

  it('shows the same views whether an item is answered correctly, incorrectly or not at all', async () => {
    const variant = (answer: (item: number[]) => Script) =>
      run(participant(9, 8, (key) => (key === 'forward.0#1' ? answer(itemFor(key).item) : undefined))).then((r) => r.call.views);
    const correct = await variant((item) => speak(item));
    const incorrect = await variant(() => speak([9, 9, 9]));
    const silence = await variant(() => silent);
    expect(incorrect).toEqual(correct);
    expect(silence).toEqual(correct);
  });
});
