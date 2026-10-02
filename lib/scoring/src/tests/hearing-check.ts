// P1 hearing repetition: the sentence repeated exactly (normalized ASR match).
import type { Form } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type Scorer, type ScoreResult } from '../types';

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/(\w)'s\b/g, '$1 is')
    .replace(/[^a-z' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Exact match after normalization: case, punctuation, fillers, "cup's" = "cup is". */
export function repeatedExactly(target: string, tokens: readonly AsrToken[]): boolean {
  const heard = words(normalizeTokens(tokens, { numbers: false, selfCorrections: false }).map((t) => t.text).join(' '));
  return heard.join(' ') === words(target).join(' ');
}

export const hearingCheckJudges = {
  'hearing-repeat': ({ expected, tokens, asrUnavailable }: { expected: string; tokens: AsrToken[]; asrUnavailable: boolean }) =>
    asrUnavailable ? { correct: null, tag: 'unverified' } : { correct: repeatedExactly(expected, tokens) },
};

export interface HearingCheckInput {
  form: Form;
  /** The final repetition judgement: true / false / null (no transcript: can't verify). */
  passed: boolean | null;
  tries: number;
}

export const hearingCheckScorer: Scorer<HearingCheckInput> = {
  scorerId: 'hearing-check',
  scorerVersion: '1.0.0',
  confidenceThreshold: 0.5,
  score({ passed, tries }): ScoreResult {
    return finalizeScore(
      { testId: 'hearing-check', scorerId: 'hearing-check', scorerVersion: '1.0.0', items: [], fields: { passed: passed === null ? null : passed ? 1 : 0, tries }, equated: true },
      0.5,
      passed === null ? ['asr_unavailable'] : [],
    );
  },
};
