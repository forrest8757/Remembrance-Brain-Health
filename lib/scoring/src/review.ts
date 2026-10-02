// Review-queue emission (CLAUDE.md §7): any administration with an item
// below threshold, an ASR outage, or a timing/validity flag is queued for
// the review console (artifacts/review, P3).
import type { ReviewReason, ScoreResult } from './types';

export interface ReviewQueueEntry {
  administrationId: string;
  testId: string;
  scorerId: string;
  scorerVersion: string;
  reasons: ReviewReason[];
  /** Lowest item confidence, for sorting the queue. */
  minConfidence: number;
  lowConfidenceItems: string[];
}

export interface ReviewSink {
  enqueue(entry: ReviewQueueEntry): Promise<void>;
}

export function toReviewQueueEntry(administrationId: string, result: ScoreResult, threshold = 0.7): ReviewQueueEntry | null {
  if (!result.needsReview) return null;
  return {
    administrationId,
    testId: result.testId,
    scorerId: result.scorerId,
    scorerVersion: result.scorerVersion,
    reasons: result.reviewReasons,
    minConfidence: result.items.reduce((m, i) => Math.min(m, i.confidence), 1),
    lowConfidenceItems: result.items.filter((i) => i.confidence < threshold).map((i) => i.itemKey),
  };
}

export async function emitReview(sink: ReviewSink, administrationId: string, result: ScoreResult, threshold?: number): Promise<boolean> {
  const entry = toReviewQueueEntry(administrationId, result, threshold);
  if (!entry) return false;
  await sink.enqueue(entry);
  return true;
}
