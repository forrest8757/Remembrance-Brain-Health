// Speech-to-text relay: the browser streams a response window's audio here,
// and this forwards it to the ASR vendor with the server-held API key
// (CLAUDE.md §6). One WebSocket per response window.
//
// Protocol (client → server): binary frames = 16-bit little-endian mono PCM;
// text {"type":"finish"} = end of audio.
// Server → client: {"type":"partial","tokens":[…]} as words arrive;
// {"type":"final","tokens":[…],"provider","model"} once; or
// {"type":"error","reason"} and close.
//
// Transcripts are PHI: they are relayed, never logged.
import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { AsrProvider, AsrStream } from '@workspace/asr';

export interface AsrRelayOptions {
  /** URL path to accept upgrades on, e.g. /api/asr/stream. */
  path: string;
  /** Returns null when ASR isn't configured (no key): clients get an error and fall back to review. */
  provider: () => AsrProvider | null;
  /** Hard cap per window, so a stuck client can't hold an upstream stream open. */
  maxStreamMs?: number;
  log?: { info: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void };
}

const WINDOW_ID = /^[A-Za-z0-9._:#-]{1,120}$/;

function send(ws: WebSocket, message: object) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function toArrayBuffer(data: RawData): ArrayBuffer {
  const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export function attachAsrRelay(server: Server, opts: AsrRelayOptions): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1 << 20 });
  const maxStreamMs = opts.maxStreamMs ?? 5 * 60_000;

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== opts.path) return;
    wss.handleUpgrade(req, socket, head, (ws) => handle(ws, url));
  });

  function handle(ws: WebSocket, url: URL) {
    const windowId = url.searchParams.get('windowId') ?? '';
    const sampleRate = Number(url.searchParams.get('sampleRate'));
    const keywords = (url.searchParams.get('keywords') ?? '').split(',').filter(Boolean).slice(0, 20);
    if (!WINDOW_ID.test(windowId) || !(sampleRate >= 8_000 && sampleRate <= 48_000)) {
      send(ws, { type: 'error', reason: 'bad_request' });
      ws.close(1008);
      return;
    }
    const provider = opts.provider();
    if (!provider) {
      send(ws, { type: 'error', reason: 'not_configured' });
      ws.close(1011);
      return;
    }

    let stream: AsrStream;
    try {
      stream = provider.startStream({ windowId, sampleRate, keywords });
    } catch {
      send(ws, { type: 'error', reason: 'upstream' });
      ws.close(1011);
      return;
    }
    let finished = false;
    const unsubscribe = stream.onPartial((tokens) => send(ws, { type: 'partial', tokens }));
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      unsubscribe();
      stream.abort();
      send(ws, { type: 'error', reason: 'too_long' });
      ws.close(1009);
    }, maxStreamMs);
    opts.log?.info({ provider: provider.name }, 'asr stream opened');

    ws.on('message', (data, isBinary) => {
      if (finished) return;
      if (isBinary) {
        stream.write(toArrayBuffer(data));
        return;
      }
      let msg: { type?: string };
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg.type !== 'finish') return;
      finished = true;
      clearTimeout(timer);
      stream
        .finish()
        .then((result) => send(ws, { type: 'final', tokens: result.tokens, provider: result.provider, model: result.model }))
        .catch(() => {
          opts.log?.warn({ provider: provider.name }, 'asr stream failed');
          send(ws, { type: 'error', reason: 'upstream' });
        })
        .finally(() => {
          unsubscribe();
          ws.close(1000);
        });
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        unsubscribe();
        stream.abort();
      }
    });
  }

  return wss;
}
