import { describe, expect, it } from 'vitest';
import { MockAsrProvider, normalizeTokens, speechMetrics, type AsrToken } from './index';

const toks = (words: string, stepMs = 400): AsrToken[] =>
  words.split(' ').map((w, i) => ({ id: `w:${i}`, token: w, startMs: i * stepMs, endMs: i * stepMs + 300, confidence: 0.9 }));

const texts = (words: string, opts = {}) => normalizeTokens(toks(words), opts).map((t) => t.text);

describe('normalizeTokens', () => {
  it('removes fillers and filler phrases', () => {
    expect(texts("um red uh let's see blue")).toEqual(['red', 'blue']);
  });

  it('keeps words that are only fillers in other contexts', () => {
    expect(texts('like lake oh')).toEqual(['like', 'lake', 'oh']);
  });

  it('applies self-corrections', () => {
    expect(texts('drum, no, bell')).toEqual(['bell']);
    expect(texts('red I mean green blue')).toEqual(['green', 'blue']);
  });

  it('converts number words to digits', () => {
    expect(texts('ninety three eighty six seventy nine')).toEqual(['93', '86', '79']);
    expect(texts('one hundred')).toEqual(['100']);
    expect(texts('seventy')).toEqual(['70']);
  });

  it('keeps each digit separate in digitsOnly mode', () => {
    expect(texts('two one eight five four', { digitsOnly: true })).toEqual(['2', '1', '8', '5', '4']);
    expect(texts('seven oh two', { digitsOnly: true })).toEqual(['7', '0', '2']);
  });

  it('applies a per-test homophone lexicon', () => {
    expect(texts('read blew', { homophones: { read: 'red', blew: 'blue' } })).toEqual(['red', 'blue']);
  });

  it('keeps provenance for merged tokens', () => {
    const [t] = normalizeTokens(toks('ninety three'));
    expect(t).toMatchObject({ text: '93', sourceIds: ['w:0', 'w:1'], startMs: 0, endMs: 700 });
  });
});

describe('speechMetrics', () => {
  it('computes latency, pauses, rate and 15-s bins', () => {
    const tokens: AsrToken[] = [
      { id: 'a', token: 'red', startMs: 1200, endMs: 1500, confidence: 1 },
      { id: 'b', token: 'blue', startMs: 1700, endMs: 2000, confidence: 1 },
      { id: 'c', token: 'green', startMs: 16_000, endMs: 16_400, confidence: 1 },
    ];
    const m = speechMetrics(tokens, 30_000);
    expect(m.timeToFirstWordMs).toBe(1200);
    expect(m.interResponseIntervalsMs).toEqual([200, 14_000]);
    expect(m.pauseCount).toBe(1);
    expect(m.outputPer15s).toEqual([2, 1]);
  });

  it('handles silence', () => {
    expect(speechMetrics([], 10_000)).toMatchObject({ timeToFirstWordMs: null, pauseCount: 0, outputPer15s: [0] });
  });
});

describe('MockAsrProvider', () => {
  it('returns fixture tokens with window-scoped ids', async () => {
    const asr = new MockAsrProvider({ w1: [{ token: 'red', startMs: 100, endMs: 400 }] });
    const result = await asr.startStream({ windowId: 'w1', sampleRate: 16_000 }).finish();
    expect(result.tokens).toEqual([{ id: 'w1:0', token: 'red', startMs: 100, endMs: 400, confidence: 0.95 }]);
  });
});
