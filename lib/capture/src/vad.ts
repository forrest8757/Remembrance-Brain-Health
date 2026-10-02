// Energy-based voice activity detection (CLAUDE.md §6). Pure and
// clock-agnostic: feed it RMS frames with timestamps and it emits speech
// boundaries plus silence marks (e.g. silence:5000, silence:15000) that drive
// spec-permitted prompts and window closes.

export type VadEvent =
  | { type: 'speech_start'; atMs: number }
  | { type: 'speech_end'; atMs: number }
  | { type: 'silence'; ms: number; atMs: number };

export interface VadOptions {
  /** RMS level (dBFS) above which a frame counts as voiced. */
  thresholdDb?: number;
  /** Voiced time needed to confirm speech (debounces clicks and taps). */
  attackMs?: number;
  /** Unvoiced time before speech is considered ended. */
  hangoverMs?: number;
  /** Silence durations to announce, measured from the last speech end (or window open). */
  silenceMarksMs?: number[];
}

export interface Vad {
  /** Feed one analysis frame. Returns any events it produced. */
  push(frame: { rms: number; atMs: number }): VadEvent[];
  /** Restart silence timing (call when a response window opens). */
  reset(atMs: number): void;
  readonly speaking: boolean;
}

export function rmsToDb(rms: number): number {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

export function createVad(opts: VadOptions = {}): Vad {
  const thresholdDb = opts.thresholdDb ?? -45;
  const attackMs = opts.attackMs ?? 60;
  const hangoverMs = opts.hangoverMs ?? 400;
  const marks = [...(opts.silenceMarksMs ?? [5_000, 15_000])].sort((a, b) => a - b);

  let speaking = false;
  let voicedSince: number | null = null;
  let lastVoicedAt = 0;
  let silenceFrom = 0;
  let nextMark = 0;

  return {
    get speaking() {
      return speaking;
    },
    reset(atMs) {
      speaking = false;
      voicedSince = null;
      silenceFrom = atMs;
      lastVoicedAt = atMs;
      nextMark = 0;
    },
    push({ rms, atMs }) {
      const events: VadEvent[] = [];
      const voiced = rmsToDb(rms) >= thresholdDb;

      if (voiced) {
        lastVoicedAt = atMs;
        voicedSince ??= atMs;
        if (!speaking && atMs - voicedSince >= attackMs) {
          speaking = true;
          events.push({ type: 'speech_start', atMs: voicedSince });
        }
      } else {
        voicedSince = null;
        if (speaking && atMs - lastVoicedAt >= hangoverMs) {
          speaking = false;
          silenceFrom = lastVoicedAt;
          nextMark = 0;
          events.push({ type: 'speech_end', atMs: lastVoicedAt });
        }
      }

      if (!speaking) {
        while (nextMark < marks.length && atMs - silenceFrom >= marks[nextMark]!) {
          events.push({ type: 'silence', ms: marks[nextMark]!, atMs: silenceFrom + marks[nextMark]! });
          nextMark++;
        }
      }
      return events;
    },
  };
}
