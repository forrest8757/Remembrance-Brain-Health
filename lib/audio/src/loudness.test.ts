import { describe, expect, it } from 'vitest';
import { decodeWav, encodeWav, integratedLoudness, normalizeLoudness, trimSilence, type PcmAudio } from './index';

const sine = (freq: number, amp: number, seconds: number, sampleRate = 48_000): PcmAudio => ({
  sampleRate,
  samples: Float32Array.from({ length: Math.round(seconds * sampleRate) }, (_, i) => amp * Math.sin((2 * Math.PI * freq * i) / sampleRate)),
});

describe('loudness', () => {
  it('measures a 1 kHz full-scale sine at about −3.01 LUFS (BS.1770 reference)', () => {
    expect(integratedLoudness(sine(1000, 1, 3))).toBeCloseTo(-3.01, 1);
  });

  it('normalizes to −16 LUFS', () => {
    const r = normalizeLoudness(sine(440, 0.05, 2));
    expect(r.outputLufs).toBeCloseTo(-16, 1);
    expect(r.peakLimited).toBe(false);
  });

  it('respects the peak ceiling', () => {
    // A sparse click train is loud in peak but quiet in loudness.
    const samples = new Float32Array(48_000);
    for (let i = 0; i < samples.length; i += 4800) samples[i] = 0.5;
    const r = normalizeLoudness({ sampleRate: 48_000, samples });
    expect(r.peakLimited).toBe(true);
    expect(Math.max(...r.audio.samples.map(Math.abs))).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
  });

  it('trims leading and trailing silence with padding', () => {
    const tone = sine(440, 0.5, 0.5).samples;
    const padded = new Float32Array(48_000 + tone.length);
    padded.set(tone, 24_000);
    const trimmed = trimSilence({ sampleRate: 48_000, samples: padded }, -50, 20);
    expect(trimmed.samples.length).toBeGreaterThan(tone.length - 50);
    expect(trimmed.samples.length).toBeLessThan(tone.length + 2 * 960 + 50);
  });

  it('round-trips WAV', () => {
    const a = sine(440, 0.5, 0.1, 24_000);
    const b = decodeWav(encodeWav(a));
    expect(b.sampleRate).toBe(24_000);
    expect(b.samples.length).toBe(a.samples.length);
    expect(Math.abs(b.samples[100]! - a.samples[100]!)).toBeLessThan(1e-4);
  });
});
