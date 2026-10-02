// Mock provider: ignores audio and returns fixture transcripts, keyed by
// window id. Used by unit tests, the simulated phone call and offline dev.
import type { AsrProvider, AsrResult, AsrStream, AsrStreamOptions, AsrToken } from '../types';

export interface FixtureWord {
  token: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export class MockAsrProvider implements AsrProvider {
  readonly name = 'mock';
  private fixtures = new Map<string, FixtureWord[]>();

  constructor(fixtures: Record<string, FixtureWord[]> = {}) {
    for (const [k, v] of Object.entries(fixtures)) this.fixtures.set(k, v);
  }

  setFixture(windowId: string, words: FixtureWord[]): void {
    this.fixtures.set(windowId, words);
  }

  startStream(opts: AsrStreamOptions): AsrStream {
    const words = this.fixtures.get(opts.windowId) ?? [];
    const tokens: AsrToken[] = words.map((w, i) => ({
      id: `${opts.windowId}:${i}`,
      token: w.token,
      startMs: w.startMs,
      endMs: w.endMs,
      confidence: w.confidence ?? 0.95,
    }));
    const listeners = new Set<(t: AsrToken[]) => void>();
    let done = false;
    return {
      write() {},
      onPartial(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async finish(): Promise<AsrResult> {
        if (!done) listeners.forEach((l) => l(tokens));
        done = true;
        return { tokens, provider: 'mock', model: 'fixture' };
      },
      abort() {
        done = true;
      },
    };
  }
}
