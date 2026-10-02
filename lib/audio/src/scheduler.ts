// Stimulus scheduler on the Web Audio clock (CLAUDE.md §4, §5).
//
// A coarse JS timer wakes every `tickMs` and queues any token whose onset
// falls inside the next `lookaheadMs` with `source.start(when)`. Playback is
// then sample-accurate on the audio thread, so main-thread jank shorter than
// the lookahead cannot move an onset. The interval is onset-to-onset.

/** The slice of AudioContext the scheduler needs (fakeable in tests). */
export interface AudioClock {
  readonly currentTime: number;
  readonly destination: unknown;
  createBufferSource(): {
    buffer: unknown;
    connect(dest: unknown): unknown;
    start(when: number): void;
    stop(when?: number): void;
    onended: ((ev: Event) => unknown) | null;
  };
}

export interface ClipBuffer {
  /** An AudioBuffer (opaque to the scheduler). */
  buffer: unknown;
  durationMs: number;
  clipId: string;
}

export interface Timer {
  every(ms: number, fn: () => void): () => void;
}

export const browserTimer: Timer = {
  every(ms, fn) {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  },
};

export interface OnsetRecord {
  index: number;
  clipId: string;
  /** Audio-clock ms. */
  scheduledOnsetMs: number;
  /** Best knowledge of the real onset: the scheduled time, or later if queued late. */
  actualOnsetMs: number;
  errorMs: number;
  /** |error| exceeded the tolerance: the trial must be flagged. */
  flagged: boolean;
}

export interface PresentationResult {
  onsets: OnsetRecord[];
  /** Clips longer than the interval that are followed by another (they would overlap it). */
  overlaps: string[];
  flagged: boolean;
}

export interface PresentOptions {
  clock: AudioClock;
  clips: readonly ClipBuffer[];
  rateMs: number;
  toleranceMs?: number;
  /** Delay before the first onset, giving the scheduler room to queue it. */
  leadInMs?: number;
  lookaheadMs?: number;
  tickMs?: number;
  timer?: Timer;
  /** Called as each token is queued, with its onset on the audio clock (for visuals only). */
  onQueued?: (onset: OnsetRecord) => void;
}

export interface Presentation {
  done: Promise<PresentationResult>;
  cancel(): void;
}

export function presentStimuli({
  clock,
  clips,
  rateMs,
  toleranceMs = 50,
  leadInMs = 200,
  lookaheadMs = 150,
  tickMs = 25,
  timer = browserTimer,
  onQueued,
}: PresentOptions): Presentation {
  const t0 = clock.currentTime * 1000 + leadInMs;
  const onsets: OnsetRecord[] = [];
  // Only a clip followed by another can overlap it (a lone sentence can run long).
  const overlaps = clips.filter((c, i) => i < clips.length - 1 && c.durationMs > rateMs).map((c) => c.clipId);
  const sources: ReturnType<AudioClock['createBufferSource']>[] = [];
  let next = 0;
  let stop: () => void = () => {};
  let resolve!: (r: PresentationResult) => void;
  const done = new Promise<PresentationResult>((r) => (resolve = r));

  const finish = () => {
    stop();
    resolve({ onsets, overlaps, flagged: onsets.some((o) => o.flagged) || overlaps.length > 0 });
  };

  const pump = () => {
    const nowMs = clock.currentTime * 1000;
    while (next < clips.length && t0 + next * rateMs < nowMs + lookaheadMs) {
      const clip = clips[next]!;
      const scheduledOnsetMs = t0 + next * rateMs;
      const actualOnsetMs = Math.max(scheduledOnsetMs, nowMs);
      const src = clock.createBufferSource();
      src.buffer = clip.buffer;
      src.connect(clock.destination);
      src.start(actualOnsetMs / 1000);
      sources.push(src);
      const errorMs = actualOnsetMs - scheduledOnsetMs;
      const onset = { index: next, clipId: clip.clipId, scheduledOnsetMs, actualOnsetMs, errorMs, flagged: Math.abs(errorMs) > toleranceMs };
      onsets.push(onset);
      onQueued?.(onset);
      if (next === clips.length - 1) src.onended = finish;
      next++;
    }
  };

  if (clips.length === 0) {
    resolve({ onsets, overlaps, flagged: false });
  } else {
    stop = timer.every(tickMs, pump);
    pump();
  }

  return {
    done,
    cancel() {
      stop();
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          // Already stopped.
        }
      }
      resolve({ onsets, overlaps, flagged: true });
    },
  };
}
