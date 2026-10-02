// Engine ↔ channel contract. The engine never touches audio, DOM or phone
// lines: it emits commands, and channels (web, Twilio) report back events.
import type { Zone } from '@workspace/test-spec';

export const ENGINE_VERSION = '0.1.0';

export interface Onset {
  index: number;
  clipId: string;
  scheduledOnsetMs: number;
  actualOnsetMs: number;
  errorMs: number;
  flagged: boolean;
}

export interface AsrTokenLike {
  id: string;
  token: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface CapturedResponse {
  audioUri: string | null;
  asrTokens: AsrTokenLike[];
  asrUnavailable: boolean;
}

export type CloseReason = 'timeout' | 'participant_done' | 'silence' | 'count' | 'discontinue';
export type ReasonCode = 95 | 96 | 97 | 98 | 995 | 996 | 997 | 998;

// ---- Commands (engine → channel) -------------------------------------------

export type EngineCommand =
  | { type: 'cmd.say'; playId: number; stepKey: string; lineKey: string; clipId: string; zone: Zone }
  | { type: 'cmd.prompt'; stepKey: string; promptKey: string; lineKey: string; clipId: string }
  | { type: 'cmd.present'; playId: number; stepKey: string; clipIds: string[]; rateMs: number; toleranceMs: number }
  | { type: 'cmd.openWindow'; windowKey: string; stepKey: string; maxMs: number; silenceMarksMs: number[] }
  | { type: 'cmd.closeWindow'; windowKey: string; reason: CloseReason }
  /** Start/stop detecting taps (phone: transients in the audio; web: the TapPad reports directly). */
  | { type: 'cmd.tapCapture'; stepKey: string; on: boolean }
  | { type: 'cmd.stopAll' };

// ---- Events (channel/participant → engine) ---------------------------------

export type EngineEvent =
  | { type: 'LINE_ENDED'; playId: number }
  | { type: 'PRESENTATION_ENDED'; playId: number; onsets: Onset[]; flagged: boolean }
  | { type: 'PARTICIPANT_DONE' }
  | { type: 'VAD_SILENCE'; ms: number }
  | { type: 'VAD_SPEECH' }
  | { type: 'CONTINUE' }
  /** A tap (TapPad or phone mouthpiece). `atMs` on the session clock; defaults to now. */
  | { type: 'TAP'; atMs?: number }
  /** Streaming transcript so far for the open window. */
  | { type: 'ASR_PARTIAL'; windowKey: string; tokens: AsrTokenLike[] }
  | { type: 'REPEAT_REQUESTED' }
  | { type: 'RESPONSE_CAPTURED'; windowKey: string; response: CapturedResponse }
  | { type: 'FOCUS_LOST' }
  | { type: 'PAUSE'; reason: string }
  | { type: 'RESUME' }
  | { type: 'ABORT'; reasonCode: ReasonCode };

// ---- Administration log (CLAUDE.md §13) ------------------------------------

export interface StimulusEventRecord {
  stepKey: string;
  /** Item within a trials block (null for a plain present step). */
  itemIndex: number | null;
  token: string;
  clipId: string;
  scheduledOnsetMs: number;
  actualOnsetMs: number;
}

export interface ResponseWindowRecord {
  windowKey: string;
  stepKey: string;
  /** Item within a trials block (null for respond/practice windows). */
  itemIndex: number | null;
  openedAt: number;
  closedAt: number | null;
  closeReason: CloseReason | null;
  audioUri: string | null;
  asrTokens: AsrTokenLike[];
  asrUnavailable: boolean;
}

export interface PromptEventRecord {
  stepKey: string;
  promptKey: string;
  reason: string;
  at: number;
}

/** Live judgement of one response window (trials and practice). */
export interface TrialResultRecord {
  stepKey: string;
  /** -1 for a practice item. */
  itemIndex: number;
  item: string;
  windowKey: string;
  correct: boolean | null;
  tag: string | null;
}

// ---- Live judging (implemented in lib/scoring, injected by the app) ----------

export interface JudgeInput {
  expected: string;
  /** Expected items for list judges (e.g. the five memory words). */
  items?: string[];
  tokens: AsrTokenLike[];
  asrUnavailable: boolean;
  /** Earlier live judgements, keyed by step key (e.g. registration trials). */
  prior?: Record<string, Judgement>;
  /** Sequence decoders (sequenceTask): the state returned last time, what to do, and window-relative now. */
  state?: unknown;
  action?: 'decode' | 'commit' | 'lost';
  nowMs?: number;
}

export interface Judgement {
  /** null = can't tell (e.g. ASR outage). Never counts toward a discontinue. */
  correct: boolean | null;
  tag?: string;
  /** Judge-specific details later steps may use (e.g. recalled words). */
  data?: unknown;
  /** Placeholder values for a follow-up line (e.g. { missing: "year" }). */
  vars?: Record<string, string>;
}

export type Judge = (input: JudgeInput) => Judgement;

export interface LineEventRecord {
  stepKey: string;
  lineKey: string;
  repeat: boolean;
  at: number;
}

export interface InterruptionRecord {
  stepKey: string;
  reason: string;
  pausedAt: number;
  resumedAt: number | null;
}

export type ValidityFlagKind = 'timing' | 'focus_lost' | 'interruption' | 'asr_unavailable';

export interface AdministrationRecord {
  testId: string;
  specVersion: string;
  engineVersion: string;
  formId: string;
  formVersion: string;
  status: 'complete' | 'partial';
  reasonCode: ReasonCode | null;
  startedAt: number;
  endedAt: number | null;
  stimulusEvents: StimulusEventRecord[];
  responseWindows: ResponseWindowRecord[];
  promptEvents: PromptEventRecord[];
  lineEvents: LineEventRecord[];
  trialResults: TrialResultRecord[];
  discontinued: { stepKey: string; afterItemIndex: number; at: number }[];
  /** Taps on the session clock (vigilance). */
  taps: { stepKey: string; atMs: number; phase: 'check' | 'task' }[];
  /** Tap tasks that could not be administered (e.g. taps undetectable on the phone). */
  notAdministered: { stepKey: string; reasonCode: number; reason: string }[];
  /** Live sequence-decoder events (Oral Trails): progress, errors, corrections with latency, prompts. */
  sequenceEvents: ({ stepKey: string; windowKey: string; type: string } & Record<string, unknown>)[];
  /** Live judgements of respond steps that other steps depend on. */
  notes: Record<string, Judgement>;
  /** Wall-clock epoch ms at `startedAt`, and the participant's IANA time zone (orientation scoring). */
  wallClockStart: number;
  timeZone: string;
  interruptions: InterruptionRecord[];
  flags: { kind: ValidityFlagKind; stepKey: string; at: number }[];
}
