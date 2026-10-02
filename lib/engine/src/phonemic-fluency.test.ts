// T7 Phonemic Fluency through the engine on a simulated phone call: the two
// 60-s trials, the 15-s pause prompts in order, the 3-in-a-row letter
// reminder (once), per-rule reminders (once each), and the letter cue.
import { beforeAll, describe, expect, it } from 'vitest';
import { clipIdFor, phonemicFluencySpec } from '@workspace/test-spec';
import { phonemicFluencyForms } from '@workspace/forms';
import { loadPhonemicDictionary, phonemicFluencyJudges, phonemicFluencyScorer } from '@workspace/scoring';
import type { AdministrationRecord } from './index';
import { simulateCall, type Script } from './testing';

beforeAll(async () => {
  await loadPhonemicDictionary();
});

const [formA, formB] = phonemicFluencyForms as [(typeof phonemicFluencyForms)[0], (typeof phonemicFluencyForms)[0]];
const words = (text: string, gap = 2000, start = 1000): Script => ({ words: text.split(' ').map((w, i) => [w, start + i * gap] as [string, number]) });

async function run(scripts: Record<string, Script>, form = formA) {
  const call = simulateCall(phonemicFluencySpec, form, (k) => scripts[k.split('#')[0]!] ?? { words: [] }, { judges: phonemicFluencyJudges });
  await call.advanceUntilDone();
  return { call, record: (await call.run.done) as AdministrationRecord };
}
const prompts = (r: AdministrationRecord, step: string) => r.promptEvents.filter((p) => p.stepKey === step).map((p) => p.promptKey);
const trial = (r: AdministrationRecord, step: string) => {
  const w = r.responseWindows.filter((x) => x.stepKey === step).at(-1);
  return w ? { tokens: w.asrTokens, asrUnavailable: w.asrUnavailable, completed: w.closeReason === 'timeout' } : null;
};

describe('T7 Phonemic Fluency (simulated call)', () => {
  it('runs F then L, 60 s each with "Stop.", and scores Q10a–i', async () => {
    const { record, call } = await run({ first: words('fish fox fast fish phone'), second: words('lamp lion lake') });
    expect(record.status).toBe('complete');
    for (const step of ['first', 'second']) {
      const w = record.responseWindows.find((x) => x.stepKey === step)!;
      expect(w.closedAt! - w.openedAt).toBe(60_000);
    }
    expect(call.played.some((c) => c.startsWith('phonemic-fluency.firstGo.your-first-letter-is-eff-as-in-fox'))).toBe(true);
    const s = phonemicFluencyScorer.score({ form: formA, first: trial(record, 'first'), second: trial(record, 'second'), reasonCode: null, equated: false });
    expect(s.fields).toMatchObject({ firstCorrect: 3, firstRepetitions: 1, firstViolations: 1, secondCorrect: 3, totalCorrect: 6 });
  });

  it('15-s pauses: "Keep going." first, then "Can you think of any more words…" (once each)', async () => {
    const { record } = await run({ first: words('fish'), second: words('lamp') });
    // The simulated VAD marks one 15-s silence per window: the first prompt fires.
    expect(prompts(record, 'first')).toContain('keepGoing');
    expect(prompts(record, 'first')).not.toContain('whatOther');
  });

  it('3 wrong-letter words in a row → "Remember, the letter is F." once only', async () => {
    const { record, call } = await run({ first: words('fish dog cat mouse bird horse cow fox'), second: words('lamp') });
    expect(prompts(record, 'first').filter((p) => p === 'usingLetter')).toHaveLength(1);
    expect(call.played).toContain('phonemic-fluency.usingFirst.remember-the-letter-is-eff');
  });

  it('3 violations of the same rule in a row → that rule\'s reminder, once per rule', async () => {
    const { record } = await run({
      first: words('fred florida france fish four five fifty fix fixes fixed fixing frog'),
      second: words('lamp'),
    });
    const p = prompts(record, 'first');
    expect(p.filter((x) => x === 'remindNames')).toHaveLength(1);
    expect(p.filter((x) => x === 'remindNumbers')).toHaveLength(1);
    expect(p.filter((x) => x === 'remindEndings')).toHaveLength(1);
  });

  it('the second letter comes from the form (Form B: S then W)', async () => {
    const { call } = await run({ first: words('sun sock'), second: words('water wind') }, formB);
    expect(call.played).toContain(clipIdFor(phonemicFluencySpec, 'secondGo', formB));
    expect(formB.items.secondLetterSpoken).toEqual(['double-you']);
    expect(call.views.filter((v) => v.phase === 'listening').map((v) => v.cue)).toEqual(['S', 'W']);
  });
});
