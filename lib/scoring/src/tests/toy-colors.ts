// Scorer for the pipeline toy test: free recall of three colors.
// Rules: 1 point per target said at least once, any order; repeats are not
// extra credit; non-target color words are intrusions; everything else is
// ignored. Confidence comes from ASR confidence plus near-miss detection.
import type { Form } from '@workspace/forms';
import { BASIC_COLORS } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type Scorer, type ScoreResult } from '../types';
import { isNearMiss } from '../similarity';

export interface ToyColorsInput {
  form: Form;
  recall: { tokens: AsrToken[]; asrUnavailable: boolean };
  equated: boolean;
}

const HOMOPHONES: Record<string, string> = { read: 'red', blew: 'blue', grey: 'gray', whit: 'white' };
const SCORER_ID = 'toy-colors';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.7;

export const toyColorsScorer: Scorer<ToyColorsInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score({ form, recall, equated }): ScoreResult {
    const targets = form.items.colors ?? [];
    const base = { testId: 'toy-colors', scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, equated };

    if (recall.asrUnavailable) {
      return finalizeScore({ ...base, items: [], fields: { recalled: null, intrusions: null } }, THRESHOLD, ['asr_unavailable']);
    }

    const tokens = normalizeTokens(recall.tokens, { homophones: HOMOPHONES });
    const items: ItemScore[] = targets.map((target) => {
      const hits = tokens.filter((t) => t.text === target);
      if (hits.length > 0) {
        const best = hits.reduce((a, b) => (b.confidence > a.confidence ? b : a));
        return {
          itemKey: target,
          value: 1,
          confidence: best.confidence,
          rationale: `"${target}" recalled`,
          evidenceTokenIds: best.sourceIds,
          scorer: 'auto',
          scorerVersion: SCORER_VERSION,
        };
      }
      // Not recalled. Uncertain if something close was heard (possible ASR
      // error); otherwise as sure as the recognizer was overall.
      const near = tokens.filter((t) => isNearMiss(t.text, target) || (target.startsWith(t.text) && t.text.length >= 3));
      const overall = tokens.length ? Math.min(...tokens.map((t) => t.confidence)) : 0.95;
      return {
        itemKey: target,
        value: 0,
        confidence: near.length ? 0.5 : overall,
        rationale: near.length ? `not recalled; near-miss "${near.map((n) => n.text).join(', ')}" needs listening` : `"${target}" not recalled`,
        evidenceTokenIds: near.flatMap((n) => n.sourceIds),
        scorer: 'auto',
        scorerVersion: SCORER_VERSION,
      };
    });

    const intrusions = new Set(tokens.filter((t) => t.text in BASIC_COLORS && !targets.includes(t.text)).map((t) => t.text));
    return finalizeScore(
      { ...base, items, fields: { recalled: items.reduce((s, i) => s + i.value, 0), intrusions: intrusions.size } },
      THRESHOLD,
    );
  },
};
