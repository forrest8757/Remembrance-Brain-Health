// T8 Oral Trails: parsing, the live decoder (errors, self-corrections,
// E-set tolerance, corrections), the pre-test / practice judges and the scorer.
import { describe, expect, it } from 'vitest';
import type { AsrToken } from '@workspace/asr';
import type { Form } from '@workspace/forms';
import {
  decodeTrail,
  initialTrailState,
  judgeAlphabet,
  judgeTrailPractice,
  oralTrailsJudges,
  oralTrailsScorer,
  parseTrailUnits,
  trailCorrection,
  type TrailEvent,
  type TrailState,
} from './oral-trails';

const A = Array.from({ length: 25 }, (_, i) => String(i + 1));
const B = Array.from({ length: 13 }, (_, i) => [String(i + 1), 'abcdefghijkl'[i]]).flat().filter(Boolean) as string[];

function say(text: string, stepMs = 500, conf = 0.98): AsrToken[] {
  return text.split(/\s+/).filter(Boolean).map((raw, i) => {
    const [token, c] = raw.split('~') as [string, string | undefined];
    return { id: `t${i}`, token, startMs: i * stepMs, endMs: i * stepMs + 300, confidence: c ? Number(c) : conf };
  });
}
const decodeA = (text: string, state: TrailState = initialTrailState, extra: Partial<Parameters<typeof decodeTrail>[3]> = {}) =>
  decodeTrail(A, parseTrailUnits(say(text), { letters: false }), state, { pairs: false, nowMs: 20_000, ...extra });
const decodeB = (text: string, state: TrailState = initialTrailState, extra: Partial<Parameters<typeof decodeTrail>[3]> = {}) =>
  decodeTrail(B, parseTrailUnits(say(text)), state, { pairs: true, nowMs: 20_000, ...extra });

describe('parseTrailUnits', () => {
  it('reads number words, compounds and digits', () => {
    expect(parseTrailUnits(say('one two 3 twenty twenty one twenty-five')).map((u) => u.unit)).toEqual(['1', '2', '3', '20', '21', '25']);
  });
  it('reads letter names and run-together pairs', () => {
    expect(parseTrailUnits(say('one a two bee 3 see 4d')).map((u) => u.unit)).toEqual(['1', 'a', '2', 'b', '3', 'c', '4', 'd']);
  });
  it('ignores fillers and (in Part A) letter words', () => {
    expect(parseTrailUnits(say('um one uh and two okay three'), { letters: false }).map((u) => u.unit)).toEqual(['1', '2', '3']);
  });
});

describe('decodeTrail: Part A', () => {
  it('a clean run finishes', () => {
    const r = decodeA(A.join(' '));
    expect(r.done).toBe(true);
    expect(r.events.filter((e) => e.type === 'progress')).toHaveLength(25);
  });
  it('a wrong next number followed by more numbers is a confirmed error, with the "You last said" correction', () => {
    const r = decodeA('1 2 3 5 6');
    expect(r.correct).toMatchObject({ line: 'correction', vars: { last: '3' } });
    expect(r.events.find((e) => e.type === 'error')).toMatchObject({ pos: 3, heard: '5', expected: '4', kind: 'sequencing' });
    // Continue from position 3 ("4" next), with speech muted while the clip plays.
    expect(r.correct!.state).toMatchObject({ pos: 3, muteUntilMs: 22_500 });
  });
  it('a wrong number as the latest word waits for a self-correction (pending), then commits', () => {
    const pending = decodeA('1 2 3 5');
    expect(pending.pending).not.toBeNull();
    expect(pending.correct).toBeNull();
    const committed = decodeA('1 2 3 5', pending.state, { action: 'commit' });
    expect(committed.correct?.vars).toEqual({ last: '3', lastSpoken: '3' });
  });
  it('a self-correction before the examiner speaks is logged, not an error', () => {
    const r = decodeA('1 2 3 5 4 5 6');
    expect(r.events.some((e) => e.type === 'selfCorrection')).toBe(true);
    expect(r.events.some((e) => e.type === 'error')).toBe(false);
    expect(r.state.pos).toBe(6);
  });
  it('after a correction, re-saying the last number ("…3, please continue" → "3, 4") is fine', () => {
    const first = decodeA('1 2 3 5 6');
    const after = decodeTrail(A, parseTrailUnits([...say('1 2 3 5 6'), ...say('3 4 5').map((t, i) => ({ ...t, id: `u${i}`, startMs: 25_000 + i * 500, endMs: 25_300 + i * 500 }))], { letters: false }), first.correct!.state, { pairs: false, nowMs: 26_000 });
    expect(after.events.filter((e) => e.type === 'error')).toHaveLength(0);
    expect(after.state.pos).toBe(5);
  });
  it('speech during the correction clip is ignored (barge-in)', () => {
    const first = decodeA('1 2 3 5 6');
    const tokens = [...say('1 2 3 5 6'), { id: 'x', token: '9', startMs: 21_000, endMs: 21_300, confidence: 0.99 }];
    const r = decodeTrail(A, parseTrailUnits(tokens, { letters: false }), first.correct!.state, { pairs: false, nowMs: 21_500 });
    expect(r.correct).toBeNull();
  });
  it('a low-confidence mismatch never interrupts (logged for review)', () => {
    const r = decodeA('1 2 3 9~0.3 4');
    expect(r.correct).toBeNull();
    expect(r.events.some((e) => e.type === 'lowConfidence')).toBe(true);
    expect(r.state.pos).toBe(4);
  });
  it('"lost" gives the last correct number and counts an error', () => {
    const r = decodeA('1 2 3', initialTrailState, { action: 'lost' });
    expect(r.state.pos).toBe(0);
    const s = decodeA('1 2 3');
    const lost = decodeA('1 2 3', s.state, { action: 'lost' });
    expect(lost.correct?.vars.last).toBe('3');
    expect(lost.events.find((e) => e.type === 'error')).toMatchObject({ kind: 'lost' });
  });
  it('before anything correct, the correction is "Start with 1."', () => {
    expect(trailCorrection(A, initialTrailState, { pairs: false }, 0)).toMatchObject({ line: 'correctionStart', vars: { first: '1' } });
  });
});

describe('decodeTrail: Part B', () => {
  it('a clean run finishes', () => {
    expect(decodeB(B.join(' ')).done).toBe(true);
  });
  it('"4, 5" instead of "4, D" is a set-loss error; the correction names the last pair', () => {
    const r = decodeB('1 a 2 b 3 c 4 5 6');
    expect(r.events.find((e) => e.type === 'error')).toMatchObject({ kind: 'setLoss', heard: '5', expected: 'd' });
    expect(r.correct).toMatchObject({ line: 'correction', vars: { pair: '3, C', pairSpoken: '3, C.' } });
    // Resume at "4" (the number after the named pair).
    expect(r.correct!.state.pos).toBe(6);
  });
  it('an error right after a letter names that complete pair', () => {
    const r = decodeB('1 a 2 b 4 5');
    expect(r.correct?.vars.pair).toBe('2, B');
    expect(r.correct!.state.pos).toBe(4);
  });
  it('letter-first ("A, 1") is an error at the first element', () => {
    const r = decodeB('a 1 b 2');
    expect(r.events.find((e) => e.type === 'error')).toMatchObject({ pos: 0, heard: 'A' });
    expect(r.correct?.line).toBe('correctionStart');
  });
  it('accepts an E-set confusion ("dee" heard for B) when unsure, flagged', () => {
    const r = decodeB('1 a 2 d~0.7 3');
    expect(r.events.some((e) => e.type === 'compatible')).toBe(true);
    expect(r.state.pos).toBe(5);
  });
});

describe('pre-test (alphabet A–L)', () => {
  it('counts errors against A–L', () => {
    expect(judgeAlphabet(say('a b c d e f g h i j k l m n o')).errors).toBe(0);
    expect(judgeAlphabet(say('a b c d e f g h j k l')).errors).toBe(1);
    expect(judgeAlphabet(say('a b d c e f g h i j k l')).errors).toBe(2);
    expect(judgeAlphabet(say('a b c f g h l')).errors).toBeGreaterThanOrEqual(3);
  });
  it('tags pass / retry / fail', () => {
    const tag = (t: string) => oralTrailsJudges['trails-pretest']({ expected: '', tokens: say(t), asrUnavailable: false }).tag;
    expect(tag('a b c d e f g h i j k l')).toBe('pass');
    expect(tag('a b c d e f g h j k l')).toBe('retry');
    expect(tag('a b c q r s')).toBe('fail');
  });
});

describe('Part B practice (1 A 2 B 3 C 4)', () => {
  it('passes only the exact alternation', () => {
    expect(judgeTrailPractice(say('one a two b three c four'))).toBe(true);
    expect(judgeTrailPractice(say('one two three four'))).toBe(false);
    expect(judgeTrailPractice(say('a one b two c three d'))).toBe(false);
  });
});

describe('scorer', () => {
  const form = { formId: 'oral-trails.A', testId: 'oral-trails', version: '1.0.0', items: {}, licensed: false, equated: false } as unknown as Form;
  const run = (n: number, endS: number, extra: TrailEvent[] = []): TrailEvent[] => [
    ...Array.from({ length: n }, (_, i): TrailEvent => ({ type: 'progress', pos: i, unit: String(i + 1), atMs: ((i + 1) * endS * 1000) / n, confidence: 0.98 })),
    ...extra,
    { type: 'done', atMs: endS * 1000 },
  ];
  const done = (events: TrailEvent[]) => ({ events, outcome: 'done' as const, asrUnavailable: false });

  it('records time, errors and correct; switch cost = B − A', () => {
    const s = oralTrailsScorer.score({
      form,
      partA: done(run(25, 30, [{ type: 'error', pos: 7, heard: '9', expected: '8', atMs: 9000, kind: 'sequencing' }])),
      partB: done(run(25, 75)),
      partBReasonCode: null,
      discontinueReasonCode: 996,
      practiceAttempts: 1,
      equated: false,
    });
    expect(s.fields).toMatchObject({ partATime: 30, partAErrors: 1, partACorrect: 25, partBTime: 75, partBErrors: 0, switchCost: 45, switchRatio: 2.5 });
  });
  it('not finished by the cap → the cap (100 / 300)', () => {
    const s = oralTrailsScorer.score({
      form,
      partA: { events: run(20, 99).filter((e) => e.type !== 'done'), outcome: 'timeout', asrUnavailable: false },
      partB: { events: [], outcome: 'timeout', asrUnavailable: false },
      partBReasonCode: null,
      discontinueReasonCode: 996,
      practiceAttempts: 1,
      equated: false,
    });
    expect(s.fields.partATime).toBe(100);
    expect(s.fields.partBTime).toBe(300);
    expect(s.fields.switchCost).toBeNull();
  });
  it('discontinued (15-s stall) → reason code, errors and correct blank', () => {
    const s = oralTrailsScorer.score({
      form,
      partA: { events: run(5, 10), outcome: 'discontinued', asrUnavailable: false },
      partB: { events: [], outcome: 'notAdministered', asrUnavailable: false },
      partBReasonCode: 997,
      discontinueReasonCode: 996,
      practiceAttempts: null,
      equated: false,
    });
    expect(s.fields).toMatchObject({ partATime: 996, partAErrors: null, partACorrect: null, partBTime: 997 });
  });
  it('a sound-alike acceptance sends the administration to review', () => {
    const s = oralTrailsScorer.score({
      form,
      partA: done(run(25, 30)),
      partB: done(run(25, 70, [{ type: 'compatible', pos: 3, heard: 'd', expected: 'b', atMs: 5000 }])),
      partBReasonCode: null,
      discontinueReasonCode: 996,
      practiceAttempts: 1,
      equated: false,
    });
    expect(s.needsReview).toBe(true);
  });
  it.todo('maps Part A/B time, errors and correct to NACC C2T field codes (not in the source manual; look up and map)');
});
