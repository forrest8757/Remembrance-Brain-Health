// The browser RelayAsrProvider against the real relay over a real WebSocket,
// with a fake vendor behind it.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { AsrUnavailableError, RelayAsrProvider, type AsrProvider, type AsrToken } from '@workspace/asr';
import { attachAsrRelay } from './relay';

/** Fake vendor: one token per audio chunk received, streamed as partials. */
function fakeVendor(opts: { failOnFinish?: boolean } = {}): AsrProvider & { bytes: number; aborted: number } {
  const state = { bytes: 0, aborted: 0 };
  return Object.assign(state, {
    name: 'fake',
    startStream({ windowId }: { windowId: string }) {
      const tokens: AsrToken[] = [];
      const listeners = new Set<(t: AsrToken[]) => void>();
      return {
        write(chunk: ArrayBuffer) {
          state.bytes += chunk.byteLength;
          tokens.push({ id: `${windowId}:${tokens.length}`, token: `w${tokens.length}`, startMs: tokens.length * 300, endMs: tokens.length * 300 + 200, confidence: 0.9 });
          listeners.forEach((l) => l([...tokens]));
        },
        onPartial(l: (t: AsrToken[]) => void) {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        async finish() {
          if (opts.failOnFinish) throw new Error('vendor down');
          return { tokens, provider: 'fake', model: 'fake-1' };
        },
        abort() {
          state.aborted++;
        },
      };
    },
  });
}

let server: Server | null = null;

async function start(provider: () => AsrProvider | null, maxStreamMs?: number) {
  server = createServer();
  attachAsrRelay(server, { path: '/api/asr/stream', provider, maxStreamMs });
  await new Promise<void>((r) => server!.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return new RelayAsrProvider({ url: `ws://127.0.0.1:${port}/api/asr/stream`, finishTimeoutMs: 2_000 });
}

afterEach(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = null;
});

const pcm = (n: number) => new Int16Array(n).buffer;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('ASR relay', () => {
  it('streams audio, relays partials, and returns the final transcript', async () => {
    const vendor = fakeVendor();
    const asr = await start(() => vendor);
    const stream = asr.startStream({ windowId: 'serial7#1', sampleRate: 16_000 });
    const partials: number[] = [];
    stream.onPartial((t) => partials.push(t.length));
    // Written before the socket opens: must be buffered, not lost.
    stream.write(pcm(160));
    stream.write(pcm(160));
    await wait(100);
    stream.write(pcm(160));
    const result = await stream.finish();
    expect(result.tokens.map((t) => t.token)).toEqual(['w0', 'w1', 'w2']);
    expect(result.provider).toBe('relay:fake');
    expect(vendor.bytes).toBe(3 * 320);
    expect(partials.at(-1)).toBe(3);
  });

  it('reports "not configured" (no key) as an ASR outage, so the answer goes to review', async () => {
    const asr = await start(() => null);
    const stream = asr.startStream({ windowId: 'w#1', sampleRate: 16_000 });
    await expect(stream.finish()).rejects.toBeInstanceOf(AsrUnavailableError);
  });

  it('reports a vendor failure as an ASR outage', async () => {
    const asr = await start(() => fakeVendor({ failOnFinish: true }));
    const stream = asr.startStream({ windowId: 'w#1', sampleRate: 16_000 });
    stream.write(pcm(160));
    await expect(stream.finish()).rejects.toBeInstanceOf(AsrUnavailableError);
  });

  it('rejects malformed requests', async () => {
    const asr = await start(() => fakeVendor());
    await expect(asr.startStream({ windowId: 'bad id with spaces', sampleRate: 16_000 }).finish()).rejects.toBeInstanceOf(AsrUnavailableError);
    await expect(asr.startStream({ windowId: 'ok#1', sampleRate: 999_999 }).finish()).rejects.toBeInstanceOf(AsrUnavailableError);
  });

  it('aborts the vendor stream when the browser disconnects early', async () => {
    const vendor = fakeVendor();
    const asr = await start(() => vendor);
    const stream = asr.startStream({ windowId: 'w#1', sampleRate: 16_000 });
    stream.write(pcm(160));
    await wait(100);
    stream.abort();
    await wait(100);
    expect(vendor.aborted).toBe(1);
  });

  it('caps how long one window can stream', async () => {
    const vendor = fakeVendor();
    const asr = await start(() => vendor, 150);
    const stream = asr.startStream({ windowId: 'w#1', sampleRate: 16_000 });
    stream.write(pcm(160));
    await wait(300);
    await expect(stream.finish()).rejects.toBeInstanceOf(AsrUnavailableError);
    expect(vendor.aborted).toBe(1);
  });
});
