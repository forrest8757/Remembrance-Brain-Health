// Test utilities: drive a real administration through a simulated phone
// call. The fake TelephonyPort plays clips instantly, schedules the
// participant's speech and VAD events on XState's SimulatedClock, and
// returns fixture ASR tokens when a window closes.
import { SimulatedClock } from 'xstate';
import type { TestSpec } from '@workspace/test-spec';
import type { Form } from '@workspace/forms';
import { getView, runIvrAdministration, type AdministrationView, type CapturedResponse, type Judge, type TelephonyPort } from './index';

/** Participant behaviour per response window: words said at ms offsets from window open. */
export type Script = { words: [string, number][]; sayDoneAt?: number };

export interface SimulateOptions {
  judges?: Record<string, Judge>;
  /** Tap "continue" on break cards automatically (default true). */
  autoContinue?: boolean;
  /** Every window reports an ASR outage. */
  asrUnavailable?: boolean;
  /** Mark the nth presentation (0-based) as failing onset QA. */
  flagPresentation?: (callIndex: number) => boolean;
  /** Presentations take their real duration on the simulated clock (needed for taps). Default: instant. */
  realtimePresentation?: boolean;
  /** The participant taps during these clips (e.g. every "A"), 500 ms after onset. */
  tapOn?: (clipId: string) => boolean;
  /** The participant answers the tap check (default true). */
  tapsDetectable?: boolean;
  /** Wall clock (epoch ms) at simulated time 0, and time zone, for orientation. */
  wallClockStart?: number;
  timeZone?: string;
}

export function simulateCall(
  spec: TestSpec,
  form: Form,
  scripts: Script[] | ((windowKey: string, index: number) => Script),
  opts: SimulateOptions = {},
) {
  const clock = new SimulatedClock();
  const played: string[] = [];
  let stopAllCalls = 0;
  let windowIndex = 0;
  let presentCalls = 0;
  let onTap: ((atMs?: number) => void) | null = null;
  const windows = new Map<string, { openedAt: number; script: Script; timers: number[] }>();
  let run!: ReturnType<typeof runIvrAdministration>;
  const scriptFor = (windowKey: string, index: number): Script =>
    typeof scripts === 'function' ? scripts(windowKey, index) : scripts[Math.min(index, scripts.length - 1)]!;

  const port: TelephonyPort = {
    async playClip(clipId) {
      played.push(clipId);
    },
    async playSequence(clipIds, rateMs) {
      played.push(...clipIds);
      const flagged = opts.flagPresentation?.(presentCalls++) ?? false;
      const t0 = clock.now() + 200;
      const onsets = clipIds.map((clipId, index) => ({ index, clipId, scheduledOnsetMs: t0 + index * rateMs, actualOnsetMs: t0 + index * rateMs, errorMs: 0, flagged: false }));
      if (opts.tapOn) {
        for (const o of onsets) if (opts.tapOn(o.clipId)) clock.setTimeout(() => onTap?.(o.actualOnsetMs + 500), o.actualOnsetMs + 500 - clock.now());
      }
      if (opts.realtimePresentation) {
        await new Promise<void>((resolve) => clock.setTimeout(() => resolve(), 200 + (clipIds.length - 1) * rateMs + 400));
      }
      return { flagged, onsets };
    },
    detectTaps(on, tap) {
      onTap = on ? tap : null;
      // Answer the tap check a second after detection starts (only before any letters play).
      if (on && opts.tapsDetectable !== false) clock.setTimeout(() => onTap?.(clock.now()), 1000);
    },
    startListening(windowKey, silenceMarksMs, onVad, onPartial) {
      const script = scriptFor(windowKey, windowIndex++);
      const openedAt = clock.now();
      const timers: number[] = [];
      if (script.words.length) timers.push(clock.setTimeout(() => onVad({ type: 'speech' }), Math.min(...script.words.map(([, t]) => t))));
      // Streaming ASR: the transcript so far, after each word.
      if (onPartial && !opts.asrUnavailable) {
        script.words.forEach(([, t], k) =>
          timers.push(
            clock.setTimeout(
              () => onPartial(script.words.slice(0, k + 1).map(([token, at], i) => ({ id: `${windowKey}:${i}`, token, startMs: at, endMs: at + 300, confidence: 0.95 }))),
              t + 300,
            ),
          ),
        );
      }
      // Server-side VAD: silence is measured from the last word (or window open).
      const lastWordEnd = script.words.length ? Math.max(...script.words.map(([, t]) => t + 300)) : 0;
      for (const ms of silenceMarksMs) timers.push(clock.setTimeout(() => onVad({ type: 'silence', ms }), lastWordEnd + ms));
      if (script.sayDoneAt !== undefined) timers.push(clock.setTimeout(() => run.actor.send({ type: 'PARTICIPANT_DONE' }), script.sayDoneAt));
      windows.set(windowKey, { openedAt, script, timers });
    },
    async stopListening(windowKey): Promise<CapturedResponse> {
      const w = windows.get(windowKey)!;
      w.timers.forEach((t) => clock.clearTimeout(t));
      const elapsed = clock.now() - w.openedAt;
      if (opts.asrUnavailable) return { audioUri: `mem://${windowKey}`, asrUnavailable: true, asrTokens: [] };
      return {
        audioUri: `mem://${windowKey}`,
        asrUnavailable: false,
        asrTokens: w.script.words
          .filter(([, t]) => t < elapsed)
          .map(([token, t], i) => ({ id: `${windowKey}:${i}`, token, startMs: t, endMs: t + 300, confidence: 0.95 })),
      };
    },
    stopAll() {
      stopAllCalls++;
      for (const w of windows.values()) w.timers.forEach((t) => clock.clearTimeout(t));
    },
  };

  const views: AdministrationView[] = [];
  const onSnapshot = (snap: ReturnType<typeof run.actor.getSnapshot>) => {
    const v = getView(snap);
    const prev = views[views.length - 1];
    if (!prev || JSON.stringify(prev) !== JSON.stringify(v)) views.push(v);
    if (v.phase === 'break' && opts.autoContinue !== false) queueMicrotask(() => run.actor.send({ type: 'CONTINUE' }));
  };
  run = runIvrAdministration(spec, form, port, {
    clock,
    now: () => clock.now(),
    judges: opts.judges,
    wallClock: () => (opts.wallClockStart ?? 0) + clock.now(),
    timeZone: opts.timeZone ?? 'UTC',
  });
  run.actor.subscribe(onSnapshot);
  // Subscriptions don't replay the current state: handle a test that starts on a break card.
  onSnapshot(run.actor.getSnapshot());

  const flush = () => new Promise((r) => setImmediate(r));
  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 100) {
      await flush();
      clock.increment(100);
    }
    await flush();
  };
  /** Run the simulated clock until the administration finishes (or `maxMs` passes). */
  const advanceUntilDone = async (maxMs = 3_600_000) => {
    for (let t = 0; t < maxMs && run.actor.getSnapshot().status !== 'done'; t += 100) {
      await flush();
      clock.increment(100);
    }
    await flush();
  };
  return { run, clock, played, views, advance, advanceUntilDone, flush, stopAllCalls: () => stopAllCalls };
}
