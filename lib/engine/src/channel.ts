// Channel binding: executes engine commands on a concrete channel (web
// audio, Twilio) and feeds the results back as events. Channels contain no
// test logic (CLAUDE.md §3).
import type { Actor } from 'xstate';
import type { AdministrationMachine } from './machine';
import type { AsrTokenLike, CapturedResponse, EngineCommand, Onset } from './types';

export type VadSignal = { type: 'speech' } | { type: 'silence'; ms: number };

export interface EngineChannel {
  /** Play a scripted line; resolve when it has finished (or was stopped). */
  say(cmd: Extract<EngineCommand, { type: 'cmd.say' }>): Promise<void>;
  /** Play a spec-permitted prompt during a response window (fire and forget). */
  prompt(cmd: Extract<EngineCommand, { type: 'cmd.prompt' }>): void;
  present(cmd: Extract<EngineCommand, { type: 'cmd.present' }>): Promise<{ onsets: Onset[]; flagged: boolean }>;
  /**
   * Start recording + ASR + VAD. `onVad` must report speech onsets and each of
   * `silenceMarksMs` (measured from the last speech, or window open).
   */
  openWindow(
    cmd: Extract<EngineCommand, { type: 'cmd.openWindow' }>,
    onVad: (event: VadSignal) => void,
    onPartial?: (tokens: AsrTokenLike[]) => void,
  ): void;
  closeWindow(cmd: Extract<EngineCommand, { type: 'cmd.closeWindow' }>): Promise<CapturedResponse>;
  /**
   * Start/stop tap detection. Channels that detect taps themselves (phone:
   * transients on the mouthpiece) call `onTap`; the web TapPad sends TAP
   * events directly, so its channel can ignore this.
   */
  tapCapture?(on: boolean, onTap: (atMs?: number) => void): void;
  /** Interruption or abort: stop all audio and discard any open window. */
  stopAll(): void;
}

export function bindChannel(actor: Actor<AdministrationMachine>, channel: EngineChannel): () => void {
  const sub = actor.on('*', (cmd) => {
    switch (cmd.type) {
      case 'cmd.say':
        void channel.say(cmd).then(() => actor.send({ type: 'LINE_ENDED', playId: cmd.playId }));
        break;
      case 'cmd.prompt':
        channel.prompt(cmd);
        break;
      case 'cmd.present':
        void channel.present(cmd).then(({ onsets, flagged }) => actor.send({ type: 'PRESENTATION_ENDED', playId: cmd.playId, onsets, flagged }));
        break;
      case 'cmd.openWindow':
        channel.openWindow(
          cmd,
          (ev) => actor.send(ev.type === 'speech' ? { type: 'VAD_SPEECH' } : { type: 'VAD_SILENCE', ms: ev.ms }),
          (tokens) => actor.send({ type: 'ASR_PARTIAL', windowKey: cmd.windowKey, tokens }),
        );
        break;
      case 'cmd.closeWindow':
        void channel
          .closeWindow(cmd)
          .catch((): CapturedResponse => ({ audioUri: null, asrTokens: [], asrUnavailable: true }))
          .then((response) => actor.send({ type: 'RESPONSE_CAPTURED', windowKey: cmd.windowKey, response }));
        break;
      case 'cmd.tapCapture':
        channel.tapCapture?.(cmd.on, (atMs) => actor.send({ type: 'TAP', atMs }));
        break;
      case 'cmd.stopAll':
        channel.stopAll();
        break;
    }
  });
  return () => sub.unsubscribe();
}
