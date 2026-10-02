// Scoring contract (CLAUDE.md §7). Scorers are pure, deterministic and
// versioned. Raw data is never mutated: a re-score is a new score version.

export type ScorerKind = 'auto' | 'llm' | 'human';

export interface ItemScore {
  itemKey: string;
  value: number;
  /** 0..1: how sure the scorer is that `value` is right. */
  confidence: number;
  rationale: string;
  evidenceTokenIds: string[];
  scorer: ScorerKind;
  scorerVersion: string;
}

export type ReviewReason = 'low_confidence' | 'asr_unavailable' | 'timing_flagged' | 'validity_flagged';

export interface ScoreResult {
  testId: string;
  scorerId: string;
  scorerVersion: string;
  items: ItemScore[];
  /** NACC field codes (or internal keys) → value; null when not scorable. */
  fields: Record<string, number | null>;
  needsReview: boolean;
  reviewReasons: ReviewReason[];
  /** False until the form is equated (CLAUDE.md §8). */
  equated: boolean;
}

export interface Scorer<Input> {
  readonly scorerId: string;
  readonly scorerVersion: string;
  /** Items below this confidence send the administration to review. */
  readonly confidenceThreshold: number;
  score(input: Input): ScoreResult;
}

/** Shared finishing step: applies the threshold and collects review reasons. */
export function finalizeScore(
  base: Omit<ScoreResult, 'needsReview' | 'reviewReasons'>,
  threshold: number,
  extraReasons: ReviewReason[] = [],
): ScoreResult {
  const reasons = new Set<ReviewReason>(extraReasons);
  if (base.items.some((i) => i.confidence < threshold)) reasons.add('low_confidence');
  return { ...base, needsReview: reasons.size > 0, reviewReasons: [...reasons] };
}
