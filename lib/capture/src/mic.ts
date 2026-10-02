// Browser microphone capture: raw audio for review/Canary/re-scoring, 16-bit
// PCM chunks for streaming ASR, and RMS frames for the VAD and ListeningOrb.
// Browser processing (echo cancellation, AGC, noise suppression) is turned
// off so stored audio stays raw (CLAUDE.md §6).
import { createVad, type Vad, type VadEvent, type VadOptions } from './vad';

export type MicSupport = 'supported' | 'insecure-context' | 'unsupported';

export function detectMicSupport(): MicSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure-context';
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return 'unsupported';
  return 'supported';
}

export interface MicSessionOptions {
  /** Share the playback context so stimuli and capture use one clock. */
  context?: AudioContext;
  vad?: VadOptions;
  /** Target PCM rate for ASR streaming. */
  pcmSampleRate?: number;
  onFrame?: (frame: { rms: number; atMs: number }) => void;
  onVad?: (event: VadEvent) => void;
  onPcm?: (chunk: ArrayBuffer) => void;
}

export interface ResponseRecording {
  blob: Blob;
  mimeType: string;
  openedAtMs: number;
  closedAtMs: number;
}

export interface MicSession {
  readonly context: AudioContext;
  /** Latest smoothed amplitude in 0..1, for the orb. Never derived from content. */
  amplitude(): number;
  /** Open a response window: starts recording and restarts VAD silence timing. */
  openWindow(opts?: { silenceMarksMs?: number[] }): void;
  /** Close the window and return its raw recording. */
  closeWindow(): Promise<ResponseRecording>;
  dispose(): Promise<void>;
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

function downsampleToPcm16(input: Float32Array, fromRate: number, toRate: number): ArrayBuffer {
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const out = new DataView(new ArrayBuffer(length * 2));
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]!));
    out.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out.buffer;
}

export async function openMicSession(opts: MicSessionOptions = {}): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const ownsContext = !opts.context;
  const context = opts.context ?? new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  // PCM tap for streaming ASR. ScriptProcessor is deprecated but universally
  // available; swap for an AudioWorklet when one is added to lib/audio.
  const pcmRate = opts.pcmSampleRate ?? 16_000;
  const tap = context.createScriptProcessor(4096, 1, 1);
  const silentSink = context.createGain();
  silentSink.gain.value = 0;
  source.connect(tap);
  tap.connect(silentSink);
  silentSink.connect(context.destination);
  let windowOpen = false;
  tap.onaudioprocess = (e) => {
    if (windowOpen && opts.onPcm) opts.onPcm(downsampleToPcm16(e.inputBuffer.getChannelData(0), context.sampleRate, pcmRate));
  };

  let vad: Vad = createVad(opts.vad);
  const buf = new Float32Array(analyser.fftSize);
  let smoothed = 0;
  let raf = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    const atMs = context.currentTime * 1000;
    smoothed += (Math.min(1, rms * 6) - smoothed) * 0.25;
    opts.onFrame?.({ rms, atMs });
    if (windowOpen) for (const ev of vad.push({ rms, atMs })) opts.onVad?.(ev);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const mimeType = pickMimeType();
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let openedAtMs = 0;

  return {
    context,
    amplitude: () => smoothed,
    openWindow(windowOpts = {}) {
      chunks = [];
      openedAtMs = context.currentTime * 1000;
      if (windowOpts.silenceMarksMs) vad = createVad({ ...opts.vad, silenceMarksMs: windowOpts.silenceMarksMs });
      vad.reset(openedAtMs);
      windowOpen = true;
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined);
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start(1000);
    },
    closeWindow() {
      windowOpen = false;
      const rec = recorder;
      recorder = null;
      const closedAtMs = context.currentTime * 1000;
      if (!rec || rec.state === 'inactive') {
        return Promise.resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, openedAtMs, closedAtMs });
      }
      return new Promise((resolve) => {
        rec.onstop = () => resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, openedAtMs, closedAtMs });
        rec.stop();
      });
    },
    async dispose() {
      cancelAnimationFrame(raf);
      windowOpen = false;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      tap.disconnect();
      silentSink.disconnect();
      if (ownsContext) await context.close();
    },
  };
}
