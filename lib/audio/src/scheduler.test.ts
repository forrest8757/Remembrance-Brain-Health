// Onset-accuracy tests (CLAUDE.md §14.7): a simulated audio clock plus a
// main-thread timer that suffers random stalls. Onsets must stay within
// ±50 ms of spec across a 15-token list at 1.0 s and 2.0 s rates.
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@workspace/forms';
import { presentStimuli, type AudioClock, type ClipBuffer, type Timer } from './scheduler';

/** Discrete-event simulation of an AudioContext and a janky JS timer. */
function simulate({ stallMaxMs, seed = 1, stallAtMs }: { stallMaxMs: number; seed?: number; stallAtMs?: [number, number] }) {
  const rand = mulberry32(seed);
  let now = 0;
  type Pending = { at: number; fn: () => void };
  let queue: Pending[] = [];
  const schedule = (at: number, fn: () => void) => queue.push({ at, fn });

  const clock: AudioClock = {
    get currentTime() {
      return now / 1000;
    },
    destination: {},
    createBufferSource() {
      const src = {
        buffer: null as unknown,
        onended: null as (() => void) | null,
        connect: () => undefined,
        start(when: number) {
          const dur = (src.buffer as { durationMs: number }).durationMs;
          schedule(when * 1000 + dur, () => src.onended?.());
        },
        stop() {},
      };
      return src;
    },
  };

  const timer: Timer = {
    every(ms, fn) {
      let active = true;
      const tick = (at: number) =>
        schedule(at, () => {
          if (!active) return;
          fn();
          let jitter = rand() * stallMaxMs;
          if (stallAtMs && now >= stallAtMs[0] && now < stallAtMs[0] + ms) jitter = stallAtMs[1];
          tick(now + ms + jitter);
        });
      tick(now + ms);
      return () => {
        active = false;
      };
    },
  };

  const runUntilIdle = () => {
    while (queue.length) {
      queue.sort((a, b) => a.at - b.at);
      const ev = queue.shift()!;
      now = Math.max(now, ev.at);
      ev.fn();
    }
  };
  return { clock, timer, runUntilIdle, reset: () => (queue = []) };
}

const clips = (n: number, durationMs = 600): ClipBuffer[] =>
  Array.from({ length: n }, (_, i) => ({ clipId: `tok.${i}`, durationMs, buffer: { durationMs } }));

describe('presentStimuli timing', () => {
  it.each([1000, 2000])('keeps 15 onsets within ±50 ms at %i ms/token despite ≤100 ms timer stalls', async (rateMs) => {
    for (let seed = 1; seed <= 20; seed++) {
      const sim = simulate({ stallMaxMs: 100, seed });
      const p = presentStimuli({ clock: sim.clock, timer: sim.timer, clips: clips(15), rateMs });
      sim.runUntilIdle();
      const result = await p.done;
      expect(result.onsets).toHaveLength(15);
      expect(result.flagged).toBe(false);
      for (const o of result.onsets) expect(Math.abs(o.errorMs)).toBeLessThanOrEqual(50);
      // Onset-to-onset interval is exactly the rate.
      const gaps = result.onsets.slice(1).map((o, i) => o.actualOnsetMs - result.onsets[i]!.actualOnsetMs);
      for (const g of gaps) expect(g).toBeCloseTo(rateMs, 6);
    }
  });

  it('flags the trial when a long stall makes an onset late', async () => {
    const sim = simulate({ stallMaxMs: 0, stallAtMs: [3000, 600] });
    const p = presentStimuli({ clock: sim.clock, timer: sim.timer, clips: clips(15), rateMs: 1000 });
    sim.runUntilIdle();
    const result = await p.done;
    expect(result.flagged).toBe(true);
    expect(result.onsets.some((o) => o.flagged && o.errorMs > 50)).toBe(true);
  });

  it('flags clips longer than the interval when another clip follows', async () => {
    const sim = simulate({ stallMaxMs: 0 });
    const p = presentStimuli({ clock: sim.clock, timer: sim.timer, clips: clips(3, 1200), rateMs: 1000 });
    sim.runUntilIdle();
    const result = await p.done;
    expect(result.overlaps).toEqual(['tok.0', 'tok.1']);
    expect(result.flagged).toBe(true);
  });

  it('does not flag a single long clip (a sentence) that nothing follows', async () => {
    const sim = simulate({ stallMaxMs: 0 });
    const p = presentStimuli({ clock: sim.clock, timer: sim.timer, clips: clips(1, 3000), rateMs: 1000 });
    sim.runUntilIdle();
    expect((await p.done).flagged).toBe(false);
  });
});
