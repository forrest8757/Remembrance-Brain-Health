export type MicrophoneSupport =
  | { supported: true }
  | {
      supported: false;
      reason: 'media-devices-unavailable' | 'get-user-media-unavailable' | 'audio-context-unavailable';
    };

export type VoiceAudioSession = {
  stream: MediaStream;
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  silence: GainNode;
};

type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;

  const windowWithWebkitAudio = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };

  return window.AudioContext || windowWithWebkitAudio.webkitAudioContext || null;
}

export function detectMicrophoneSupport(): MicrophoneSupport {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return { supported: false, reason: 'media-devices-unavailable' };
  }

  if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return { supported: false, reason: 'get-user-media-unavailable' };
  }

  if (!getAudioContextConstructor()) {
    return { supported: false, reason: 'audio-context-unavailable' };
  }

  return { supported: true };
}

/**
 * Opens a microphone session without connecting it to the speakers. The stream
 * is kept only by the caller and must be disposed when the recording ends.
 */
export async function openVoiceAudioSession(): Promise<VoiceAudioSession> {
  const support = detectMicrophoneSupport();
  if (support.supported === false) {
    throw new DOMException(
      `Microphone is unavailable: ${support.reason}`,
      'NotSupportedError',
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioContextClass = getAudioContextConstructor();

  if (!AudioContextClass) {
    stream.getTracks().forEach((track) => track.stop());
    throw new DOMException('Audio analysis is unavailable in this browser.', 'NotSupportedError');
  }

  try {
    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;

    const source = context.createMediaStreamSource(stream);
    const silence = context.createGain();
    silence.gain.value = 0;
    source.connect(analyser);
    // Keep the graph active for reliable analyser frames without ever
    // monitoring the microphone back through the speakers.
    analyser.connect(silence);
    silence.connect(context.destination);

    if (context.state === 'suspended') {
      await context.resume();
    }

    return { stream, context, analyser, source, silence };
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

export function readVoiceAudioFrame(
  session: VoiceAudioSession,
  waveformSize = 18,
): { level: number; waveform: number[] } {
  const timeDomain = new Uint8Array(session.analyser.fftSize);
  session.analyser.getByteTimeDomainData(timeDomain);

  let squaredTotal = 0;
  for (const value of timeDomain) {
    const normalizedValue = (value - 128) / 128;
    squaredTotal += normalizedValue * normalizedValue;
  }

  const rms = Math.sqrt(squaredTotal / timeDomain.length);
  const level = Math.min(1, rms / 0.14);

  const frequencies = new Uint8Array(session.analyser.frequencyBinCount);
  session.analyser.getByteFrequencyData(frequencies);
  const waveform = Array.from({ length: waveformSize }, (_, index) => {
    const start = Math.floor((index * frequencies.length) / waveformSize);
    const end = Math.max(start + 1, Math.floor(((index + 1) * frequencies.length) / waveformSize));
    let total = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      total += frequencies[cursor];
    }
    return Math.min(1, total / (end - start) / 180);
  });

  return { level, waveform };
}

export function disposeVoiceAudioSession(session: VoiceAudioSession | null): void {
  if (!session) return;

  try {
    session.source.disconnect();
  } catch {
    // The context may already be closed during a navigation.
  }
  try {
    session.analyser.disconnect();
  } catch {
    // The analyser can already be disconnected after a browser-level stop.
  }
  try {
    session.silence.disconnect();
  } catch {
    // The silent output can already be disconnected after a browser-level stop.
  }
  session.stream.getTracks().forEach((track) => track.stop());

  if (session.context.state !== 'closed') {
    void session.context.close().catch(() => undefined);
  }
}

export function canReadTextAloud(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

export function readTextAloud(text: string): boolean {
  if (!canReadTextAloud()) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.93;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopReadingTextAloud(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}