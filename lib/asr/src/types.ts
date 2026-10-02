// ASR contract (CLAUDE.md §6). Providers are swappable behind AsrProvider.

export interface AsrToken {
  /** Stable id so scores can cite evidence (ItemScore.evidenceTokenIds). */
  id: string;
  token: string;
  /** Relative to the response-window start. */
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface AsrResult {
  tokens: AsrToken[];
  provider: string;
  /** Provider-reported model/version, stored with the transcript. */
  model: string;
}

export interface AsrStreamOptions {
  /** Response window id; token ids are prefixed with it. */
  windowId: string;
  sampleRate: number;
  /** Hints for the recognizer (e.g. the digits of a span test). Never stimuli text for display. */
  keywords?: string[];
}

export interface AsrStream {
  /** 16-bit little-endian mono PCM. */
  write(chunk: ArrayBuffer): void;
  onPartial(listener: (tokens: AsrToken[]) => void): () => void;
  /** Signals end of audio and resolves with the final transcript. */
  finish(): Promise<AsrResult>;
  abort(): void;
}

export interface AsrProvider {
  readonly name: string;
  startStream(opts: AsrStreamOptions): AsrStream;
}

/** Thrown by providers when the service is unreachable; the engine marks the administration needsReview. */
export class AsrUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AsrUnavailableError';
  }
}
