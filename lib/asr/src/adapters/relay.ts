// Browser-side ASR provider that streams to our API relay
// (artifacts/api-server/src/asr/relay.ts), which holds the vendor key.
// Any failure (no key, network, vendor error, timeout) surfaces as
// AsrUnavailableError so the administration keeps its audio and goes to
// review (CLAUDE.md §11).
import { AsrUnavailableError, type AsrProvider, type AsrResult, type AsrStream, type AsrStreamOptions, type AsrToken } from '../types';

export interface RelayAsrOptions {
  /** ws:// or wss:// URL of the relay endpoint. */
  url: string;
  /** How long to wait for the final transcript after the audio ends. */
  finishTimeoutMs?: number;
  /** Injectable for tests; defaults to the global WebSocket. */
  WebSocketImpl?: typeof WebSocket;
}

type ServerMessage =
  | { type: 'partial'; tokens: AsrToken[] }
  | { type: 'final'; tokens: AsrToken[]; provider: string; model: string }
  | { type: 'error'; reason: string };

export class RelayAsrProvider implements AsrProvider {
  readonly name = 'relay';
  constructor(private readonly opts: RelayAsrOptions) {}

  startStream(stream: AsrStreamOptions): AsrStream {
    const WS = this.opts.WebSocketImpl ?? globalThis.WebSocket;
    const params = new URLSearchParams({ windowId: stream.windowId, sampleRate: String(stream.sampleRate) });
    if (stream.keywords?.length) params.set('keywords', stream.keywords.join(','));
    const ws = new WS(`${this.opts.url}?${params}`);
    ws.binaryType = 'arraybuffer';

    const pending: ArrayBuffer[] = [];
    const listeners = new Set<(tokens: AsrToken[]) => void>();
    let finishRequested = false;
    let settled = false;
    let resolveFinal!: (r: AsrResult) => void;
    let rejectFinal!: (e: Error) => void;
    const final = new Promise<AsrResult>((resolve, reject) => {
      resolveFinal = resolve;
      rejectFinal = reject;
    });
    // Callers only await `final` via finish(); avoid unhandled rejections before that.
    final.catch(() => {});

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      rejectFinal(new AsrUnavailableError(`ASR relay: ${reason}`));
    };
    const sendFinish = () => ws.send(JSON.stringify({ type: 'finish' }));

    ws.onopen = () => {
      for (const chunk of pending.splice(0)) ws.send(chunk);
      if (finishRequested) sendFinish();
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      const msg = JSON.parse(ev.data) as ServerMessage;
      if (msg.type === 'partial') listeners.forEach((l) => l(msg.tokens));
      else if (msg.type === 'final' && !settled) {
        settled = true;
        resolveFinal({ tokens: msg.tokens, provider: `relay:${msg.provider}`, model: msg.model });
      } else if (msg.type === 'error') fail(msg.reason);
    };
    ws.onerror = () => fail('connection error');
    ws.onclose = () => fail('closed before a final transcript');

    return {
      write(chunk) {
        if (ws.readyState === ws.OPEN) ws.send(chunk);
        else if (ws.readyState === ws.CONNECTING) pending.push(chunk);
      },
      onPartial(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      finish: () => {
        finishRequested = true;
        if (ws.readyState === ws.OPEN) sendFinish();
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AsrUnavailableError('ASR relay: timed out')), this.opts.finishTimeoutMs ?? 10_000),
        );
        return Promise.race([final, timeout]);
      },
      abort() {
        fail('aborted');
        ws.close();
      },
    };
  }
}
