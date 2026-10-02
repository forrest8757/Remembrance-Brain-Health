// Phone channel (CLAUDE.md §3, §5). The same machine drives a call through a
// TelephonyPort; artifacts/voice-ivr implements the port on Twilio Media
// Streams (8 kHz μ-law clips, server-side scheduler, server-side VAD + ASR).
import { createActor, type Actor } from 'xstate';
import type { TestSpec } from '@workspace/test-spec';
import type { Form } from '@workspace/forms';
import { bindChannel, type EngineChannel, type VadSignal } from './channel';
import { createAdministrationMachine, type AdministrationMachine } from './machine';
import type { AdministrationRecord, AsrTokenLike, CapturedResponse, Judge, Onset } from './types';

export interface TelephonyPort {
  playClip(clipId: string): Promise<void>;
  playSequence(clipIds: string[], rateMs: number, toleranceMs: number): Promise<{ onsets: Onset[]; flagged: boolean }>;
  startListening(windowKey: string, silenceMarksMs: number[], onVad: (event: VadSignal) => void, onPartial?: (tokens: AsrTokenLike[]) => void): void;
  /** Detect taps on the mouthpiece (transient onsets in the call audio). */
  detectTaps?(on: boolean, onTap: (atMs?: number) => void): void;
  stopListening(windowKey: string): Promise<CapturedResponse>;
  stopAll(): void;
}

export function createIvrChannel(port: TelephonyPort): EngineChannel {
  return {
    say: (cmd) => port.playClip(cmd.clipId),
    prompt: (cmd) => void port.playClip(cmd.clipId),
    present: (cmd) => port.playSequence(cmd.clipIds, cmd.rateMs, cmd.toleranceMs),
    openWindow: (cmd, onVad, onPartial) => port.startListening(cmd.windowKey, cmd.silenceMarksMs, onVad, onPartial),
    tapCapture: (on, onTap) => port.detectTaps?.(on, onTap),
    closeWindow: (cmd) => port.stopListening(cmd.windowKey),
    stopAll: () => port.stopAll(),
  };
}

export interface IvrRun {
  actor: Actor<AdministrationMachine>;
  done: Promise<AdministrationRecord>;
  /** Call dropped: pause now; call `resume()` after the callback connects. */
  callDropped(): void;
  resume(): void;
}

/** Structural copy of XState's (unexported) Clock: SimulatedClock in tests. */
export interface EngineClock {
  setTimeout(fn: (...args: unknown[]) => void, timeout: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface IvrOptions {
  now?: () => number;
  clock?: EngineClock;
  judges?: Record<string, Judge>;
  wallClock?: () => number;
  timeZone?: string;
}

export function runIvrAdministration(spec: TestSpec, form: Form, port: TelephonyPort, opts: IvrOptions = {}): IvrRun {
  const actor = createActor(createAdministrationMachine(spec), {
    input: { spec, form, now: opts.now ?? (() => Date.now()), judges: opts.judges, wallClock: opts.wallClock, timeZone: opts.timeZone },
    ...(opts.clock ? { clock: opts.clock } : {}),
  });
  const unbind = bindChannel(actor, createIvrChannel(port));
  const done = new Promise<AdministrationRecord>((resolve) => {
    actor.subscribe((snap) => {
      if (snap.status === 'done') {
        unbind();
        resolve(snap.output!);
      }
    });
  });
  actor.start();
  return {
    actor,
    done,
    callDropped: () => actor.send({ type: 'PAUSE', reason: 'call_dropped' }),
    resume: () => actor.send({ type: 'RESUME' }),
  };
}
