import { describe, expect, it } from 'vitest';
import { createVad, type VadEvent } from './vad';

const LOUD = 0.1; // −20 dBFS
const QUIET = 0.001; // −60 dBFS

/** Drive the VAD at 20 ms frames through a list of [level, durationMs] segments. */
function run(segments: [number, number][], opts = {}): VadEvent[] {
  const vad = createVad(opts);
  vad.reset(0);
  const events: VadEvent[] = [];
  let t = 0;
  for (const [rms, dur] of segments) {
    for (const end = t + dur; t < end; t += 20) events.push(...vad.push({ rms, atMs: t }));
  }
  return events;
}

describe('createVad', () => {
  it('emits 5 s and 15 s silence marks from window open when nobody speaks', () => {
    const events = run([[QUIET, 16_000]]);
    expect(events).toEqual([
      { type: 'silence', ms: 5_000, atMs: 5_000 },
      { type: 'silence', ms: 15_000, atMs: 15_000 },
    ]);
  });

  it('detects speech and restarts silence timing after it ends', () => {
    const events = run([[QUIET, 1_000], [LOUD, 1_000], [QUIET, 6_000]]);
    expect(events.map((e) => e.type)).toEqual(['speech_start', 'speech_end', 'silence']);
    const end = events.find((e) => e.type === 'speech_end')!;
    const silence = events.find((e) => e.type === 'silence')!;
    expect(silence.atMs - end.atMs).toBe(5_000);
  });

  it('ignores a click shorter than the attack time', () => {
    expect(run([[QUIET, 500], [LOUD, 40], [QUIET, 500]])).toEqual([]);
  });

  it('bridges short pauses inside speech with the hangover', () => {
    const events = run([[LOUD, 500], [QUIET, 200], [LOUD, 500], [QUIET, 1_000]]);
    expect(events.filter((e) => e.type === 'speech_start')).toHaveLength(1);
  });
});
