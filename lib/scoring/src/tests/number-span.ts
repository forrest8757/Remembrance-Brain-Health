// T3 Number Span judge and scorer (docs/build-prompts.md §T3 "Scoring").
//
// judgeSpan is used twice: live by the engine (to apply the discontinue rule
// and the backward reminder) and after the fact by numberSpanScorer, so the
// two can never disagree.
import type { Form } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';

export type SpanDirection = 'forward' | 'backward';

const SCORER_ID = 'number-span';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.7;
const MARKERS = new Set(['no', 'sorry', 'wait', 'actually']);

export interface SpanParse {
  /** The chosen ("final complete") attempt. */
  digits: number[];
  tokenIds: string[];
  /** Non-empty attempts heard in the window (>1 means a self-correction). */
  attempts: number;
  minConfidence: number;
}

/**
 * Turn a response into digits. Number words and chunks are split into
 * digits ("eighty four" → 8, 4); "oh" = 0; fillers and other words are
 * ignored. A correction marker ("no", "sorry", "I mean"…) or restarting from
 * the attempt's first digit starts a new attempt. The chosen attempt is the
 * last one with the expected length, else the last one.
 */
export function parseSpanResponse(tokens: readonly AsrToken[], expectedLength?: number): SpanParse {
  const norm = normalizeTokens(tokens, { selfCorrections: false });
  type Attempt = { digits: number[]; ids: string[]; conf: number[] };
  const attempts: Attempt[] = [{ digits: [], ids: [], conf: [] }];
  const current = () => attempts[attempts.length - 1]!;
  const startNew = () => {
    if (current().digits.length > 0) attempts.push({ digits: [], ids: [], conf: [] });
  };

  for (let i = 0; i < norm.length; i++) {
    const t = norm[i]!;
    const isMeanMarker = t.text === 'i' && norm[i + 1]?.text === 'mean';
    if (MARKERS.has(t.text) || isMeanMarker) {
      startNew();
      if (isMeanMarker) i++;
      continue;
    }
    const text = t.text === 'oh' ? '0' : t.text;
    if (!/^\d+$/.test(text)) continue;
    for (const ch of text) {
      const d = Number(ch);
      // Items never repeat a digit, so saying the first digit again is a restart.
      if (current().digits.length > 0 && d === current().digits[0]) startNew();
      current().digits.push(d);
      current().ids.push(...t.sourceIds.filter((id) => !current().ids.includes(id)));
      current().conf.push(t.confidence);
    }
  }

  const nonEmpty = attempts.filter((a) => a.digits.length > 0);
  const chosen =
    (expectedLength !== undefined ? [...nonEmpty].reverse().find((a) => a.digits.length === expectedLength) : undefined) ??
    nonEmpty[nonEmpty.length - 1] ?? { digits: [], ids: [], conf: [] };
  return {
    digits: chosen.digits,
    tokenIds: chosen.ids,
    attempts: nonEmpty.length,
    minConfidence: chosen.conf.length ? Math.min(...chosen.conf) : 1,
  };
}

export interface SpanJudgeInput {
  /** The presented item, e.g. "1-8-4". */
  expected: string;
  tokens: readonly AsrToken[];
  asrUnavailable: boolean;
}

export interface SpanJudgement {
  /** null = can't tell (ASR outage); never counts toward discontinue. */
  correct: boolean | null;
  tag?: 'no_response' | 'self_corrected' | 'forward_order' | 'asr_unavailable';
  parse?: SpanParse;
}

export function judgeSpan(direction: SpanDirection, { expected, tokens, asrUnavailable }: SpanJudgeInput): SpanJudgement {
  if (asrUnavailable) return { correct: null, tag: 'asr_unavailable' };
  const presented = expected.split('-').map(Number);
  const target = direction === 'forward' ? presented : [...presented].reverse();
  const parse = parseSpanResponse(tokens, target.length);
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const correct = same(parse.digits, target);

  let tag: SpanJudgement['tag'];
  if (parse.digits.length === 0) tag = 'no_response';
  else if (direction === 'backward' && !correct && presented.length > 1 && same(parse.digits, presented)) tag = 'forward_order';
  else if (parse.attempts > 1) tag = 'self_corrected';
  return { correct, tag, parse };
}

/** Live judges for the engine, keyed by the ids used in the T3 spec. */
export const numberSpanJudges = {
  'span-forward': (input: SpanJudgeInput) => judgeSpan('forward', input),
  'span-backward': (input: SpanJudgeInput) => judgeSpan('backward', input),
};

// ---- Scorer -------------------------------------------------------------------

export interface SpanResponse {
  direction: SpanDirection;
  itemIndex: number;
  /** The item's final response window (after any reminder). */
  tokens: AsrToken[];
  asrUnavailable: boolean;
  /** Stimulus onsets failed QA: don't score (docs §T3 edge cases). */
  timingFlagged: boolean;
}

export interface NumberSpanInput {
  form: Form;
  responses: SpanResponse[];
  /** A direction is complete when it ran to the end or hit the discontinue rule. */
  completed: Record<SpanDirection, boolean>;
  reasonCode: number | null;
  equated: boolean;
}

export const numberSpanScorer: Scorer<NumberSpanInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score({ form, responses, completed, reasonCode, equated }): ScoreResult {
    const reasons: ReviewReason[] = [];
    const items: ItemScore[] = [];
    const fields: Record<string, number | null> = {};

    for (const direction of ['forward', 'backward'] as const) {
      const list = form.items[direction] ?? [];
      const mine = responses.filter((r) => r.direction === direction).sort((a, b) => a.itemIndex - b.itemIndex);
      let total = 0;
      let longest = 0;
      let unknown = false;

      for (const r of mine) {
        const expected = list[r.itemIndex];
        if (!expected) continue;
        const itemKey = `${direction}.${r.itemIndex}`;
        const base = { itemKey, scorer: 'auto' as const, scorerVersion: SCORER_VERSION };
        if (r.asrUnavailable) {
          unknown = true;
          reasons.push('asr_unavailable');
          items.push({ ...base, value: 0, confidence: 0, rationale: 'no transcript (ASR unavailable)', evidenceTokenIds: [] });
          continue;
        }
        if (r.timingFlagged) {
          reasons.push('timing_flagged');
          items.push({ ...base, value: 0, confidence: 0, rationale: 'not scored: stimulus onsets failed QA', evidenceTokenIds: [] });
          continue;
        }
        const j = judgeSpan(direction, { expected, tokens: r.tokens, asrUnavailable: false });
        const value = j.correct ? 1 : 0;
        total += value;
        if (j.correct) longest = Math.max(longest, expected.split('-').length);
        const confidence = j.tag === 'self_corrected' ? 0.6 : j.tag === 'no_response' ? 0.9 : (j.parse?.minConfidence ?? 1);
        items.push({
          ...base,
          value,
          confidence,
          rationale: `${j.correct ? 'correct' : 'incorrect'}: heard ${j.parse?.digits.join('-') || '(nothing)'} for ${expected}${j.tag ? ` [${j.tag}]` : ''}`,
          evidenceTokenIds: j.parse?.tokenIds ?? [],
        });
      }

      const prefix = direction === 'forward' ? 'forward' : 'backward';
      if (!completed[direction]) {
        fields[`${prefix}Total`] = reasonCode;
        fields[`${prefix}LongestSpan`] = null;
      } else if (unknown) {
        fields[`${prefix}Total`] = null;
        fields[`${prefix}LongestSpan`] = null;
      } else {
        fields[`${prefix}Total`] = total;
        fields[`${prefix}LongestSpan`] = longest;
      }
    }

    return finalizeScore({ testId: 'number-span', scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, [
      ...new Set(reasons),
    ]);
  },
};
