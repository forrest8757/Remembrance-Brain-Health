// Derived speech metrics per response window (CLAUDE.md §6). These feed the
// Remembrance Score and Canary Speech; they never feed back into the UI.
import type { AsrToken } from './types';

export interface SpeechMetrics {
  timeToFirstWordMs: number | null;
  interResponseIntervalsMs: number[];
  pauseCount: number;
  totalPauseMs: number;
  /** Words per minute over the span from first to last word. */
  speechRateWpm: number | null;
  /** Word counts per 15-second bin from window open (fluency tasks). */
  outputPer15s: number[];
}

export function speechMetrics(tokens: readonly AsrToken[], windowMs: number, pauseThresholdMs = 1000): SpeechMetrics {
  const sorted = [...tokens].sort((a, b) => a.startMs - b.startMs);
  const bins = Array.from({ length: Math.max(1, Math.ceil(windowMs / 15_000)) }, () => 0);
  for (const t of sorted) bins[Math.min(bins.length - 1, Math.floor(t.startMs / 15_000))]!++;

  if (sorted.length === 0) {
    return { timeToFirstWordMs: null, interResponseIntervalsMs: [], pauseCount: 0, totalPauseMs: 0, speechRateWpm: null, outputPer15s: bins };
  }
  const gaps = sorted.slice(1).map((t, i) => Math.max(0, t.startMs - sorted[i]!.endMs));
  const pauses = gaps.filter((g) => g >= pauseThresholdMs);
  const spanMs = sorted[sorted.length - 1]!.endMs - sorted[0]!.startMs;
  return {
    timeToFirstWordMs: sorted[0]!.startMs,
    interResponseIntervalsMs: gaps,
    pauseCount: pauses.length,
    totalPauseMs: pauses.reduce((a, b) => a + b, 0),
    speechRateWpm: spanMs > 0 ? (sorted.length / spanMs) * 60_000 : null,
    outputPer15s: bins,
  };
}
