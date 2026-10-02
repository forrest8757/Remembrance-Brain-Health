// P1 hearing repetition through the engine: pass, pass on the second try, fail twice.
import { describe, expect, it } from 'vitest';
import { HEARING_SENTENCE, hearingCheckSpec } from '@workspace/test-spec';
import { hearingCheckForms } from '@workspace/forms';
import { hearingCheckJudges, repeatedExactly } from '@workspace/scoring';
import { simulateCall, type Script } from './testing';

const say = (t: string): Script => ({ words: t.split(' ').map((w, i) => [w, 800 + i * 350] as [string, number]) });
const tok = (t: string) => t.split(' ').map((token, i) => ({ id: `t${i}`, token, startMs: i * 300, endMs: i * 300 + 250, confidence: 0.95 }));

describe('exact repetition (normalized)', () => {
  it('ignores case, punctuation, fillers; "cup\'s" = "cup is"', () => {
    expect(repeatedExactly(HEARING_SENTENCE, tok('the blue cup is on the kitchen table'))).toBe(true);
    expect(repeatedExactly(HEARING_SENTENCE, tok("um The blue cup's on the kitchen table."))).toBe(true);
  });
  it('a changed or missing word fails', () => {
    expect(repeatedExactly(HEARING_SENTENCE, tok('the blue cup is on the table'))).toBe(false);
    expect(repeatedExactly(HEARING_SENTENCE, tok('the blue cap is on the kitchen table'))).toBe(false);
  });
});

async function run(scripts: Record<string, Script>) {
  const call = simulateCall(hearingCheckSpec, hearingCheckForms[0]!, (k) => scripts[k] ?? { words: [] }, { judges: hearingCheckJudges });
  await call.advanceUntilDone();
  const record = await call.run.done;
  return { call, record, last: record.trialResults.at(-1) };
}

describe('hearing check (simulated call)', () => {
  it('passes on the first try', async () => {
    const { last, call } = await run({ 'repeat#1': say(HEARING_SENTENCE.replace('.', '')) });
    expect(last?.correct).toBe(true);
    expect(call.played).not.toContain('hearing-check.repeatAgain');
  });
  it('a miss → "Once more: …" → pass', async () => {
    const { last, call, record } = await run({ 'repeat#1': say('the blue cap'), 'repeat#2': say(HEARING_SENTENCE.replace('.', '')) });
    expect(call.played).toContain('hearing-check.repeatAgain');
    expect(record.responseWindows).toHaveLength(2);
    expect(last?.correct).toBe(true);
  });
  it('two misses → fails (the shell then offers volume help)', async () => {
    const { last, record } = await run({ 'repeat#1': say('sorry what'), 'repeat#2': say('the blue cap') });
    expect(record.responseWindows).toHaveLength(2);
    expect(last?.correct).toBe(false);
  });
});
