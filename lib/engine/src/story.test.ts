// T2 Story Recall through the engine on a simulated call: immediate and
// delayed, the cue path, the one allowed reply, no repetition, and the two
// interruption policies (story → invalid; recall → resumes).
import { describe, expect, it } from 'vitest';
import { storyDelayedSpec, storyImmediateSpec, type TestSpec } from '@workspace/test-spec';
import { storyForms } from '@workspace/forms';
import { storyRecallJudgesFor, storyRecallScorer } from '@workspace/scoring';
import type { AdministrationRecord } from './index';
import { simulateCall, type Script } from './testing';

const form = storyForms[0]!;
const judges = storyRecallJudgesFor(form);
const words = (text: string, gap = 400, start = 800): Script => ({ words: text.split(' ').map((w, i) => [w, start + i * gap] as [string, number]) });
const story = form.items.story![0]!.replace(/[.,]/g, '');

/** All recall windows of the step, joined (an interrupted recall resumes in a new window). */
function recallOf(r: AdministrationRecord) {
  const ws = r.responseWindows.filter((w) => w.stepKey === 'recall');
  return ws.length ? { tokens: ws.flatMap((w) => w.asrTokens), asrUnavailable: ws.some((w) => w.asrUnavailable) } : null;
}

async function run(spec: TestSpec, scripts: Record<string, Script>, opts: { interruptAt?: number; repeatAt?: number } = {}) {
  const call = simulateCall(spec, form, (k) => scripts[k] ?? scripts[k.split('#')[0]!] ?? { words: [] }, { judges, realtimePresentation: true });
  if (opts.repeatAt !== undefined) {
    await call.advance(opts.repeatAt);
    call.run.actor.send({ type: 'REPEAT_REQUESTED' });
  }
  if (opts.interruptAt !== undefined) {
    await call.advance(opts.interruptAt);
    call.run.actor.send({ type: 'PAUSE', reason: 'backgrounded' });
    await call.advance(500);
    call.run.actor.send({ type: 'RESUME' });
  }
  await call.advanceUntilDone();
  return { call, record: (await call.run.done) as AdministrationRecord };
}

describe('T2 immediate', () => {
  it('ready card → intro → the story once → recall → "later" line; a perfect retelling scores 44 / 25', async () => {
    const { record, call } = await run(storyImmediateSpec, { recall: words(story) });
    expect(record.status).toBe('complete');
    expect(call.played.filter((c) => c.startsWith('story-immediate.story.'))).toHaveLength(1);
    expect(call.played.at(-1)).toBe('story-immediate.later');
    const s = storyRecallScorer.score({ form, recall: recallOf(record), completed: true, reasonCode: null, equated: false });
    expect(s.fields).toMatchObject({ verbatim: 44, paraphrase: 25 });
  });

  it('no repetitions: asking during the story replays nothing', async () => {
    const { call } = await run(storyImmediateSpec, { recall: words('tommy flew kites') }, { repeatAt: 1 });
    expect(call.played.filter((c) => c.startsWith('story-immediate.story.'))).toHaveLength(1);
  });

  it('an interruption during the story invalidates the immediate recall (97), without re-telling it', async () => {
    // The simulated voice finishes lines instantly, so pause the moment the story step starts.
    const call = simulateCall(storyImmediateSpec, form, () => words(story), { judges });
    let paused = false;
    call.run.actor.subscribe((snap) => {
      if (!paused && snap.context.stepKey === 'story') {
        paused = true;
        call.run.actor.send({ type: 'PAUSE', reason: 'backgrounded' });
      }
    });
    for (let i = 0; i < 50 && !paused; i++) await call.advance(10);
    await call.advance(500);
    call.run.actor.send({ type: 'RESUME' });
    await call.advanceUntilDone();
    const record = await call.run.done;
    expect(record).toMatchObject({ status: 'partial', reasonCode: 97 });
    expect(call.played.filter((c) => c.startsWith('story-immediate.story.')).length).toBeLessThanOrEqual(1);
    const s = storyRecallScorer.score({ form, recall: null, completed: false, reasonCode: record.reasonCode, equated: false });
    expect(s.fields).toMatchObject({ verbatim: 97, paraphrase: null });
  });

  it('an interruption during recall reopens the window; both parts of the recall count', async () => {
    const half = story.split(' ').length / 2;
    const first = story.split(' ').slice(0, half).join(' ');
    const second = story.split(' ').slice(half).join(' ');
    const { record } = await run(storyImmediateSpec, { 'recall#1': words(first), 'recall#2': words(second) }, { interruptAt: 5_000 });
    expect(record.responseWindows.filter((w) => w.stepKey === 'recall').length).toBe(2);
    expect(record.flags.some((f) => f.kind === 'interruption')).toBe(true);
    expect(record.status).toBe('complete');
  });
});

describe('T2 delayed', () => {
  it('a real recall → no cue; cue needed = 0', async () => {
    const { record, call } = await run(storyDelayedSpec, { recall: words('a boy named tommy flew kites with his friends') });
    expect(call.played.some((c) => c.startsWith('story-delayed.cue.'))).toBe(false);
    expect(record.promptEvents.some((p) => p.promptKey === 'followUp')).toBe(false);
  });

  it('"what story?" → "It was a story about a young boy…" once, then the recall continues (cue needed = 1)', async () => {
    const { record, call } = await run(storyDelayedSpec, { 'recall#1': words('what story'), 'recall#2': words('tommy flew kites') });
    expect(call.played.filter((c) => c.startsWith('story-delayed.cue.'))).toHaveLength(1);
    expect(record.promptEvents.filter((p) => p.promptKey === 'followUp')).toHaveLength(1);
    expect(record.responseWindows.filter((w) => w.stepKey === 'recall')).toHaveLength(2);
  });

  it('10 s of silence → the cue', async () => {
    const { call } = await run(storyDelayedSpec, { 'recall#1': { words: [] }, 'recall#2': words('tommy flew kites') });
    expect(call.played.filter((c) => c.startsWith('story-delayed.cue.'))).toHaveLength(1);
  });

  it('a question or repeat request → only "Just tell me as much of the story as you can remember."', async () => {
    const { record, call } = await run(storyDelayedSpec, { recall: words('can you say it again please tommy flew kites') });
    expect(record.promptEvents.filter((p) => p.promptKey === 'onlyReply')).toHaveLength(1);
    expect(call.played).toContain('story-delayed.onlyReply');
  });
});
