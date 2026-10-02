// Written before the scorer (CLAUDE.md §15). Every rule in docs/build-prompts.md
// §T3 "Scoring" has a case here.
import { describe, expect, it } from 'vitest';
import { numberSpanFormA } from '@workspace/forms';
import type { AsrToken } from '@workspace/asr';
import { judgeSpan, numberSpanScorer, parseSpanResponse, type SpanResponse } from './number-span';

/** Words spoken 400 ms apart. */
const said = (words: string, confidence = 0.95): AsrToken[] =>
  words
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => ({ id: `w:${i}`, token: w, startMs: 500 + i * 400, endMs: 800 + i * 400, confidence }));

const fwd = (expected: string, words: string, confidence?: number) => judgeSpan('forward', { expected, tokens: said(words, confidence), asrUnavailable: false });
const bwd = (expected: string, words: string) => judgeSpan('backward', { expected, tokens: said(words), asrUnavailable: false });

describe('parseSpanResponse', () => {
  it.each([
    ['one eight four', [1, 8, 4]],
    ['184', [1, 8, 4]],
    ['one eighty four', [1, 8, 4]],
    ['eighteen four', [1, 8, 4]],
    ['sixty four ninety two', [6, 4, 9, 2]],
    ['um one uh eight four', [1, 8, 4]],
    ['one oh four', [1, 0, 4]],
    ['okay one eight four', [1, 8, 4]],
  ])('"%s" → %j', (words, digits) => {
    expect(parseSpanResponse(said(words)).digits).toEqual(digits);
  });

  it('takes the final complete attempt after an explicit self-correction', () => {
    const p = parseSpanResponse(said('one eight five no one eight four'));
    expect(p.digits).toEqual([1, 8, 4]);
    expect(p.attempts).toBe(2);
  });

  it('treats restarting from the first digit as a new attempt', () => {
    const p = parseSpanResponse(said('one eight one eight four'));
    expect(p.digits).toEqual([1, 8, 4]);
    expect(p.attempts).toBe(2);
  });

  it('prefers the last attempt of the right length', () => {
    expect(parseSpanResponse(said('one eight four sorry one eight'), 3).digits).toEqual([1, 8, 4]);
  });
});

describe('judgeSpan', () => {
  it('scores an exact forward sequence correct', () => {
    expect(fwd('1-8-4', 'one eight four')).toMatchObject({ correct: true });
  });

  it('scores a transposition, omission or intrusion incorrect', () => {
    expect(fwd('1-8-4', 'one four eight').correct).toBe(false);
    expect(fwd('1-8-4', 'one eight').correct).toBe(false);
    expect(fwd('1-8-4', 'one eight four two').correct).toBe(false);
  });

  it('scores silence incorrect with a no_response tag', () => {
    expect(fwd('1-8-4', '')).toMatchObject({ correct: false, tag: 'no_response' });
  });

  it('flags self-corrections', () => {
    expect(fwd('1-8-4', 'one eight five no one eight four')).toMatchObject({ correct: true, tag: 'self_corrected' });
  });

  it('requires the exact reverse for backward items', () => {
    expect(bwd('7-4-2', 'two four seven').correct).toBe(true);
    expect(bwd('7-4-2', 'two seven four').correct).toBe(false);
  });

  it('tags a forward-order answer on a backward item (for the one-time reminder)', () => {
    expect(bwd('2-9-6', 'two nine six')).toMatchObject({ correct: false, tag: 'forward_order' });
  });

  it('returns unknown when ASR is unavailable', () => {
    expect(judgeSpan('forward', { expected: '1-8-4', tokens: [], asrUnavailable: true })).toMatchObject({ correct: null, tag: 'asr_unavailable' });
  });
});

// ---- Scorer -------------------------------------------------------------------

const form = numberSpanFormA;
const F = form.items.forward!;
const B = form.items.backward!;
const digitWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const speak = (item: string, reverse = false) => {
  const d = item.split('-').map(Number);
  return (reverse ? d.reverse() : d).map((x) => digitWords[x]).join(' ');
};
const resp = (direction: 'forward' | 'backward', itemIndex: number, words: string, extra: Partial<SpanResponse> = {}): SpanResponse => ({
  direction,
  itemIndex,
  tokens: said(words),
  asrUnavailable: false,
  timingFlagged: false,
  ...extra,
});

describe('numberSpanScorer', () => {
  it('computes totals and longest span per direction (C2T Q5a/Q5b, Q6a/Q6b)', () => {
    // Forward: pass lengths 3–5 (one trial each at 5), fail both at 6 → discontinue.
    const forward = [
      resp('forward', 0, speak(F[0]!)), resp('forward', 1, speak(F[1]!)),
      resp('forward', 2, speak(F[2]!)), resp('forward', 3, speak(F[3]!)),
      resp('forward', 4, speak(F[4]!)), resp('forward', 5, 'one two'),
      resp('forward', 6, 'nine'), resp('forward', 7, ''),
    ];
    // Backward: pass length 2 both, length 3 one, fail both at 4.
    const backward = [
      resp('backward', 0, speak(B[0]!, true)), resp('backward', 1, speak(B[1]!, true)),
      resp('backward', 2, speak(B[2]!, true)), resp('backward', 3, 'four seven'),
      resp('backward', 4, 'one'), resp('backward', 5, 'one'),
    ];
    const r = numberSpanScorer.score({ form, responses: [...forward, ...backward], completed: { forward: true, backward: true }, reasonCode: null, equated: false });
    expect(r.fields).toEqual({ forwardTotal: 5, forwardLongestSpan: 5, backwardTotal: 3, backwardLongestSpan: 3 });
    expect(r.needsReview).toBe(false);
  });

  it('gives longest span 0 when nothing is correct', () => {
    const r = numberSpanScorer.score({
      form,
      responses: [resp('forward', 0, ''), resp('forward', 1, ''), resp('backward', 0, ''), resp('backward', 1, '')],
      completed: { forward: true, backward: true },
      reasonCode: null,
      equated: false,
    });
    expect(r.fields).toMatchObject({ forwardTotal: 0, forwardLongestSpan: 0 });
  });

  it('records a reason code and blanks the longest span when a direction was not completed', () => {
    const r = numberSpanScorer.score({
      form,
      responses: [resp('forward', 0, speak(F[0]!))],
      completed: { forward: false, backward: false },
      reasonCode: 98,
      equated: false,
    });
    expect(r.fields).toEqual({ forwardTotal: 98, forwardLongestSpan: null, backwardTotal: 98, backwardLongestSpan: null });
  });

  it('sends ASR outages to review and leaves that direction unscored', () => {
    const r = numberSpanScorer.score({
      form,
      responses: [resp('forward', 0, '', { asrUnavailable: true })],
      completed: { forward: true, backward: true },
      reasonCode: null,
      equated: false,
    });
    expect(r.fields.forwardTotal).toBeNull();
    expect(r.reviewReasons).toContain('asr_unavailable');
  });

  it('does not score items whose presentation failed onset QA, and sends them to review', () => {
    const r = numberSpanScorer.score({
      form,
      responses: [resp('forward', 0, speak(F[0]!), { timingFlagged: true }), resp('forward', 1, speak(F[1]!))],
      completed: { forward: true, backward: true },
      reasonCode: null,
      equated: false,
    });
    expect(r.fields.forwardTotal).toBe(1);
    expect(r.reviewReasons).toContain('timing_flagged');
  });

  it('sends self-corrected and low-confidence items to review', () => {
    const r = numberSpanScorer.score({
      form,
      responses: [resp('forward', 0, 'one eight five no one eight four')],
      completed: { forward: true, backward: true },
      reasonCode: null,
      equated: false,
    });
    expect(r.items[0]).toMatchObject({ value: 1, itemKey: 'forward.0' });
    expect(r.needsReview).toBe(true);
  });

  it('cites the evidence tokens for each item', () => {
    const r = numberSpanScorer.score({ form, responses: [resp('forward', 0, 'one eight four')], completed: { forward: true, backward: true }, reasonCode: null, equated: false });
    expect(r.items[0]!.evidenceTokenIds).toEqual(['w:0', 'w:1', 'w:2']);
  });
});
