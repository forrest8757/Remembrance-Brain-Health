// Reading trial blocks back out of an administration record, for scorers.
import type { TestSpec } from '@workspace/test-spec';
import type { Form } from '@workspace/forms';
import type { AdministrationRecord, AsrTokenLike } from './types';

export interface TrialResponse {
  itemIndex: number;
  /** Tokens of the item's final window (after any reminder retry). */
  tokens: AsrTokenLike[];
  asrUnavailable: boolean;
  /** The item's presentation failed onset QA. */
  timingFlagged: boolean;
}

export interface TrialBlockSummary {
  responses: TrialResponse[];
  /** Ran to its last item, or stopped by the discontinue rule. */
  completed: boolean;
  discontinuedAfter: number | null;
}

export function summarizeTrials(record: AdministrationRecord, spec: TestSpec, form: Form): Record<string, TrialBlockSummary> {
  const out: Record<string, TrialBlockSummary> = {};
  for (const step of spec.steps) {
    if (step.type !== 'trials') continue;
    const itemCount = form.items[step.items]?.length ?? 0;
    const finals = new Map<number, TrialResponse>();
    for (const w of record.responseWindows) {
      if (w.stepKey !== step.key || w.itemIndex === null || w.closedAt === null) continue;
      const result = [...record.trialResults].reverse().find((r) => r.windowKey === w.windowKey);
      finals.set(w.itemIndex, {
        itemIndex: w.itemIndex,
        tokens: w.asrTokens,
        asrUnavailable: w.asrUnavailable,
        timingFlagged: result?.tag === 'timing_flagged',
      });
    }
    const judged = new Set(record.trialResults.filter((r) => r.stepKey === step.key).map((r) => r.itemIndex));
    const discontinued = record.discontinued.find((d) => d.stepKey === step.key);
    out[step.key] = {
      responses: [...finals.values()].filter((r) => judged.has(r.itemIndex)).sort((a, b) => a.itemIndex - b.itemIndex),
      completed: !!discontinued || judged.has(itemCount - 1),
      discontinuedAfter: discontinued?.afterItemIndex ?? null,
    };
  }
  return out;
}
