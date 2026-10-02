// Deepgram streaming adapter: word-level timestamps and confidences over a
// WebSocket. Server-side only: the API key must never reach the browser, so
// the web app streams audio to the API, which runs this adapter. Deepgram
// signs a BAA for HIPAA workloads; confirm it is in place before real PHI.
import { AsrUnavailableError, type AsrProvider, type AsrResult, type AsrStream, type AsrStreamOptions, type AsrToken } from '../types';

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramMessage {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { words?: DeepgramWord[] }[] };
}

export interface DeepgramOptions {
  apiKey: string;
  model?: string;
  /** Injectable for tests; defaults to the global WebSocket (Node ≥ 22, browsers). */
  WebSocketImpl?: typeof WebSocket;
}

export class DeepgramAsrProvider implements AsrProvider {
  readonly name = 'deepgram';
  constructor(private readonly opts: DeepgramOptions) {}

  startStream(stream: AsrStreamOptions): AsrStream {
    const model = this.opts.model ?? 'nova-3';
    const params = new URLSearchParams({
      model,
      encoding: 'linear16',
      sample_rate: String(stream.sampleRate),
      channels: '1',
      punctuate: 'false',
      smart_format: 'false',
      // Keep disfluencies: the normalization layer decides what to drop.
      filler_words: 'true',
      interim_results: 'true',
    });
    for (const k of stream.keywords ?? []) params.append('keyterm', k);

    const WS = this.opts.WebSocketImpl ?? globalThis.WebSocket;
    if (!WS) throw new AsrUnavailableError('No WebSocket implementation available');
    // Deepgram accepts the key via the `token` subprotocol.
    const ws = new WS(`wss://api.deepgram.com/v1/listen?${params}`, ['token', this.opts.apiKey]);
    ws.binaryType = 'arraybuffer';

    const finals: DeepgramWord[] = [];
    const listeners = new Set<(t: AsrToken[]) => void>();
    const pending: ArrayBuffer[] = [];
    let failed: unknown = null;
    let resolveClosed!: () => void;
    const closed = new Promise<void>((r) => (resolveClosed = r));

    const toTokens = (words: DeepgramWord[]): AsrToken[] =>
      words.map((w, i) => ({
        id: `${stream.windowId}:${i}`,
        token: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
        confidence: w.confidence,
      }));

    ws.onopen = () => {
      for (const chunk of pending.splice(0)) ws.send(chunk);
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      const msg = JSON.parse(ev.data) as DeepgramMessage;
      const words = msg.channel?.alternatives?.[0]?.words ?? [];
      if (msg.type === 'Results' && msg.is_final) finals.push(...words);
      if (msg.type === 'Results') {
        const partial = toTokens([...finals, ...(msg.is_final ? [] : words)]);
        listeners.forEach((l) => l(partial));
      }
    };
    ws.onerror = (err: Event) => {
      failed = err;
    };
    ws.onclose = () => resolveClosed();

    return {
      write(chunk) {
        if (ws.readyState === ws.OPEN) ws.send(chunk);
        else if (ws.readyState === ws.CONNECTING) pending.push(chunk);
      },
      onPartial(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async finish(): Promise<AsrResult> {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }));
        await closed;
        if (failed) throw new AsrUnavailableError('Deepgram stream failed', failed);
        return { tokens: toTokens(finals), provider: 'deepgram', model };
      },
      abort() {
        ws.close();
      },
    };
  }
}
