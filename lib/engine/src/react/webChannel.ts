// Web channel: executes engine commands with pre-rendered clips on the Web
// Audio clock, the microphone session, and a streaming ASR provider.
import { presentStimuli, type ClipLibrary, type Presentation } from '@workspace/audio';
import type { MicSession, ResponseRecording, VadEvent } from '@workspace/capture';
import type { AsrProvider, AsrStream } from '@workspace/asr';
import type { EngineChannel, VadSignal } from '../channel';
import type { CapturedResponse } from '../types';

export interface WebChannelOptions {
  clips: ClipLibrary;
  asr: AsrProvider;
  /** Persist a window's raw audio and return its URI (signed-URL upload in production). */
  storeAudio?: (windowKey: string, recording: ResponseRecording) => Promise<string | null>;
  /** Fires at each stimulus onset (visual rhythm only; never content). */
  onStimulusOnset?: () => void;
}

export interface WebChannel extends EngineChannel {
  /** Wire these into openMicSession({ onPcm, onVad }). */
  onPcm(chunk: ArrayBuffer): void;
  onVad(event: VadEvent): void;
  attachMic(mic: MicSession): void;
}

export function createWebChannel({ clips, asr, storeAudio, onStimulusOnset }: WebChannelOptions): WebChannel {
  let mic: MicSession | null = null;
  let line: { stop(): void } | null = null;
  let presentation: Presentation | null = null;
  let stream: AsrStream | null = null;
  let windowKey: string | null = null;
  let vadListener: ((event: VadSignal) => void) | null = null;

  const requireMic = () => {
    if (!mic) throw new Error('Web channel used before a microphone session was attached');
    return mic;
  };

  return {
    attachMic(m) {
      mic = m;
    },
    onPcm(chunk) {
      stream?.write(chunk);
    },
    onVad(event) {
      if (event.type === 'silence') vadListener?.({ type: 'silence', ms: event.ms });
      else if (event.type === 'speech_start') vadListener?.({ type: 'speech' });
    },

    async say(cmd) {
      line?.stop();
      const playing = clips.play(cmd.clipId);
      line = playing;
      await playing.ended;
    },
    prompt(cmd) {
      // Prompts may overlap the participant; they never block the window.
      clips.play(cmd.clipId);
    },
    async present(cmd) {
      presentation = presentStimuli({
        clock: clips.context,
        clips: cmd.clipIds.map((id) => clips.get(id)),
        rateMs: cmd.rateMs,
        toleranceMs: cmd.toleranceMs,
        onQueued: (onset) => {
          if (!onStimulusOnset) return;
          const delay = Math.max(0, onset.actualOnsetMs - clips.context.currentTime * 1000);
          setTimeout(onStimulusOnset, delay);
        },
      });
      const result = await presentation.done;
      presentation = null;
      return { onsets: result.onsets, flagged: result.flagged };
    },
    openWindow(cmd, vad, onPartial) {
      const m = requireMic();
      windowKey = cmd.windowKey;
      vadListener = vad;
      stream = asr.startStream({ windowId: cmd.windowKey, sampleRate: 16_000 });
      if (onPartial) stream.onPartial(onPartial);
      m.openWindow({ silenceMarksMs: cmd.silenceMarksMs });
    },
    async closeWindow(cmd): Promise<CapturedResponse> {
      const m = requireMic();
      vadListener = null;
      const s = stream;
      stream = null;
      windowKey = null;
      const recording = await m.closeWindow();
      const audioUri = storeAudio ? await storeAudio(cmd.windowKey, recording).catch(() => null) : null;
      try {
        const result = await s!.finish();
        return { audioUri, asrTokens: result.tokens, asrUnavailable: false };
      } catch {
        // ASR outage: keep the audio, never block the participant (CLAUDE.md §11).
        return { audioUri, asrTokens: [], asrUnavailable: true };
      }
    },
    stopAll() {
      line?.stop();
      line = null;
      presentation?.cancel();
      presentation = null;
      vadListener = null;
      stream?.abort();
      stream = null;
      if (windowKey && mic) void mic.closeWindow();
      windowKey = null;
    },
  };
}
