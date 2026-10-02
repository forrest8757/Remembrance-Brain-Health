// T6 Category Fluency through the engine on a simulated phone call
// (docs/build-prompts.md §T6 Definition of Done; CLAUDE.md §14.6, §14.9).
import { describe, expect, it } from 'vitest';
import { categoryFluencySpec } from '@workspace/test-spec';
import { categoryFluencyForms } from '@workspace/forms';
import { categoryFluencyJudges, categoryFluencyScorer } from '@workspace/scoring';
import type { AdministrationRecord } from './index';
import { simulateCall, type Script } from './testing';

const [formA, formB] = categoryFluencyForms as [(typeof categoryFluencyForms)[0], (typeof categoryFluencyForms)[0]];
const words = (text: string, gapMs = 2000, startMs = 1000): Script => ({
  words: text.split(' ').map((w, i) => [w, startMs + i * gapMs] as [string, number]),
});

async function run(scripts: Record<string, Script>, form = formA, opts: { interruptAt?: number } = {}) {
  const call = simulateCall(categoryFluencySpec, form, (windowKey) => scripts[windowKey.split('#')[0]!] ?? { words: [] }, { judges: categoryFluencyJudges });
  if (opts.interruptAt !== undefined) {
    await call.advance(opts.interruptAt);
    call.run.actor.send({ type: 'PAUSE', reason: 'backgrounded' });
    await call.advance(1_000);
    call.run.actor.send({ type: 'RESUME' });
  }
  await call.advanceUntilDone();
  const record: AdministrationRecord = await call.run.done;
  return { call, record };
}

const prompts = (r: AdministrationRecord, stepKey: string) => r.promptEvents.filter((p) => p.stepKey === stepKey).map((p) => `${p.promptKey}:${p.reason}`);
const score = (r: AdministrationRecord, form = formA) => {
  const last = (step: string) => r.responseWindows.filter((w) => w.stepKey === step).at(-1);
  const trial = (step: string) => {
    const w = last(step);
    return w ? { tokens: w.asrTokens, asrUnavailable: w.asrUnavailable, completed: w.closeReason === 'timeout' } : null;
  };
  return categoryFluencyScorer.score({ form, animals: trial('animals'), second: trial('second'), reasonCode: r.reasonCode, equated: false });
};

describe('T6 Category Fluency (simulated call)', () => {
  it('runs practice → Animals 60 s → Vegetables 60 s, saying "Stop." at each limit', async () => {
    const { call, record } = await run({
      practice: words('socks pants'),
      animals: words('dog cat cow horse pig lion tiger'),
      second: words('carrot peas corn'),
    });
    expect(record.status).toBe('complete');
    // Practice: two correct → "That's right." (code 4), and the window closed at two answers.
    expect(call.played).toContain('category-fluency.pCode4');
    expect(record.responseWindows.find((w) => w.stepKey === 'practice')!.closeReason).toBe('count');
    // Each trial closes on the 60-s limit with "Stop."
    for (const step of ['animals', 'second']) {
      const w = record.responseWindows.find((x) => x.stepKey === step)!;
      expect(w.closeReason).toBe('timeout');
      expect(w.closedAt! - w.openedAt).toBe(60_000);
      expect(prompts(record, step)).toContain('timeout:time_limit');
    }
    const s = score(record);
    expect(s.fields.animals).toBe(7);
    expect(s.fields.secondCategory).toBe(3);
  });

  it('plays the practice line that matches the code (one incorrect answer → code 1)', async () => {
    const { call } = await run({ practice: words('dog'), animals: words('dog'), second: words('carrot') });
    expect(call.played).toContain('category-fluency.pCode1one');
    expect(call.played).not.toContain('category-fluency.pCode4');
  });

  it('allows ONE prompt per trial: 15 s silence and "I can\'t think of any more" share it', async () => {
    const { record } = await run({
      practice: words('socks pants'),
      // Incapacity at ~5 s fires the prompt; the 15-s silence later may not fire a second one.
      animals: { words: [['dog', 1000], ['cat', 2000], ['I', 3000], ["can't", 3300], ['think', 3600], ['of', 3900], ['any', 4200], ['more', 4500]] },
      second: { words: [] },
    });
    expect(prompts(record, 'animals').filter((p) => p.startsWith('tellMe'))).toEqual(['tellMe:phrase:fluency-incapacity']);
    // Silent Vegetables trial: the silence prompt fires once.
    expect(prompts(record, 'second').filter((p) => p.startsWith('tellMe'))).toEqual(['tellMe:silence:15000']);
  });

  it('answers "Yes." to "do birds count?" and nothing to "do unicorns count?"', async () => {
    const { record, call } = await run({
      practice: words('socks pants'),
      animals: words('dog do birds count robin do unicorns count'),
      second: words('carrot'),
    });
    expect(prompts(record, 'animals').filter((p) => p.startsWith('yes'))).toEqual(['yes:phrase:fluency-question']);
    expect(call.played.filter((c) => c === 'category-fluency.yes')).toHaveLength(1);
  });

  it('the "Yes." detector uses the form\'s second category (Form B: fruits)', async () => {
    const { record } = await run({ practice: words('socks pants'), animals: words('dog'), second: words('apple do berries count') }, formB);
    expect(prompts(record, 'second').filter((p) => p.startsWith('yes'))).toEqual(['yes:phrase:fluency-question']);
  });

  it('ignores speech after 60.0 s (kept in the raw transcript, not scored)', async () => {
    const { record } = await run({
      practice: words('socks pants'),
      animals: { words: [['dog', 59_000], ['cat', 59_600]] },
      second: words('carrot'),
    });
    const s = score(record);
    expect(s.fields.animals).toBe(2);
  });

  it('an interruption mid-trial restarts that trial with a fresh 60 s and flags it', async () => {
    const { record } = await run(
      { practice: words('socks pants'), animals: words('dog cat cow'), second: words('carrot') },
      formA,
      { interruptAt: 40_000 },
    );
    const animalWindows = record.responseWindows.filter((w) => w.stepKey === 'animals');
    expect(animalWindows.length).toBe(2);
    expect(animalWindows.at(-1)!.closedAt! - animalWindows.at(-1)!.openedAt).toBe(60_000);
    expect(record.flags.some((f) => f.kind === 'interruption')).toBe(true);
    expect(record.status).toBe('complete');
  });
});
