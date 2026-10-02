// Clip conditioning for the pre-render pipeline (CLAUDE.md §5): silence
// trim and loudness normalization to −16 LUFS per ITU-R BS.1770-4
// (K-weighting + absolute and relative gating), with a true-peak-ish ceiling.
import type { PcmAudio } from './wav';

interface Biquad {
  b: [number, number, number];
  a: [number, number];
}

/** BS.1770 K-weighting coefficients, derived for any sample rate. */
function kWeighting(fs: number): [Biquad, Biquad] {
  // Stage 1: high-shelf pre-filter.
  let f0 = 1681.974450955533;
  const G = 3.999843853973347;
  let Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / fs);
  const Vh = 10 ** (G / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf: Biquad = {
    b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
    a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0],
  };
  // Stage 2: RLB high-pass.
  f0 = 38.13547087602444;
  Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / fs);
  a0 = 1 + K / Q + K * K;
  const highpass: Biquad = { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  return [shelf, highpass];
}

function filter(x: Float32Array, { b, a }: Biquad): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i]! + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]!; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

/** Integrated loudness in LUFS (mono). Returns −Infinity for silence. */
export function integratedLoudness({ sampleRate, samples }: PcmAudio): number {
  const [shelf, hp] = kWeighting(sampleRate);
  const k = filter(filter(samples, shelf), hp);
  const block = Math.round(0.4 * sampleRate);
  const step = Math.round(0.1 * sampleRate);
  const powers: number[] = [];
  for (let start = 0; start + block <= k.length; start += step) {
    let sum = 0;
    for (let i = start; i < start + block; i++) sum += k[i]! * k[i]!;
    powers.push(sum / block);
  }
  // Clips shorter than one block: measure the whole clip.
  if (powers.length === 0 && k.length > 0) powers.push(k.reduce((s, v) => s + v * v, 0) / k.length);
  const lufs = (p: number) => -0.691 + 10 * Math.log10(p);
  const absGated = powers.filter((p) => p > 0 && lufs(p) > -70);
  if (absGated.length === 0) return -Infinity;
  const relThreshold = lufs(absGated.reduce((s, p) => s + p, 0) / absGated.length) - 10;
  const gated = absGated.filter((p) => lufs(p) > relThreshold);
  return lufs(gated.reduce((s, p) => s + p, 0) / gated.length);
}

/** Trim leading/trailing audio below `thresholdDb`, keeping `padMs` of margin. */
export function trimSilence(audio: PcmAudio, thresholdDb = -50, padMs = 20): PcmAudio {
  const threshold = 10 ** (thresholdDb / 20);
  const { samples, sampleRate } = audio;
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]!) < threshold) start++;
  let end = samples.length - 1;
  while (end > start && Math.abs(samples[end]!) < threshold) end--;
  if (start >= samples.length) return { sampleRate, samples: new Float32Array(0) };
  const pad = Math.round((padMs / 1000) * sampleRate);
  return { sampleRate, samples: samples.slice(Math.max(0, start - pad), Math.min(samples.length, end + 1 + pad)) };
}

export interface NormalizeResult {
  audio: PcmAudio;
  inputLufs: number;
  outputLufs: number;
  gainDb: number;
  /** True when the peak ceiling limited the gain (clip ends up quieter than target). */
  peakLimited: boolean;
}

export function normalizeLoudness(audio: PcmAudio, targetLufs = -16, peakCeilingDb = -1): NormalizeResult {
  const inputLufs = integratedLoudness(audio);
  if (!Number.isFinite(inputLufs)) return { audio, inputLufs, outputLufs: inputLufs, gainDb: 0, peakLimited: false };
  let gainDb = targetLufs - inputLufs;
  const peak = audio.samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const maxGainDb = peakCeilingDb - 20 * Math.log10(peak);
  const peakLimited = gainDb > maxGainDb;
  if (peakLimited) gainDb = maxGainDb;
  const g = 10 ** (gainDb / 20);
  const out = { sampleRate: audio.sampleRate, samples: audio.samples.map((v) => v * g) };
  return { audio: out, inputLufs, outputLufs: integratedLoudness(out), gainDb, peakLimited };
}
