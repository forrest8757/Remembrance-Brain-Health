// Fake voice amplitude for stories: speech bursts separated by pauses.
export function fakeAmplitude(): () => number {
  const start = performance.now();
  let smoothed = 0;
  return () => {
    const t = (performance.now() - start) / 1000;
    const phrase = Math.max(0, Math.sin(t * 0.9)) ** 0.6;
    const syllable = 0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 4.3);
    smoothed += (phrase * (0.35 + 0.65 * syllable) - smoothed) * 0.18;
    return smoothed;
  };
}
