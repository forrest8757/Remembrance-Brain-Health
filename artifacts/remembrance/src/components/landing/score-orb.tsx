import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { BrainVisualization } from '@/components/brain-viz';

/** The uploaded model replaces the old sphere; keep the sample score readable
 * below it rather than hiding the anatomy behind a large number. */
export function ScoreOrb({
  targetScore = 84,
  size = 'large',
}: {
  targetScore?: number;
  size?: 'small' | 'large';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reducedMotion = useReducedMotion();
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setScore(targetScore);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / 1800);
      setScore(Math.round(targetScore * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reducedMotion, targetScore]);

  return (
    <div
      ref={ref}
      className={`relative flex flex-col items-center ${
        size === 'large'
          ? 'w-[min(82vw,360px)] md:w-[440px]'
          : 'w-48 md:w-60'
      }`}
    >
      <div className="relative w-full">
        <div className="absolute inset-[15%] rounded-full bg-cyan/10 blur-3xl" aria-hidden="true" />
        <BrainVisualization className="!max-w-none" />
      </div>
      <div className="relative -mt-2 flex items-center gap-4 rounded-2xl border border-navy/10 bg-cream/95 px-6 py-3 text-navy shadow-sm">
        <div className="font-sans text-4xl font-bold tabular-nums md:text-5xl" aria-hidden="true">
          {score}<span className="ml-1 text-base font-medium text-navy/60">/100</span>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">Remembrance Score</p>
          <p className="mt-1 text-xs text-navy/70">Illustrative sample</p>
        </div>
        <span className="sr-only">Illustrative Remembrance Score: {targetScore} out of 100.</span>
      </div>
    </div>
  );
}