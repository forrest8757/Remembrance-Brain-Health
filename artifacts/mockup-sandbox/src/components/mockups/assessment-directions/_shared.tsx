// Shared scaffolding for the three P0 design directions.
// Static screens only: no test logic, fake amplitude, fixed copy so the
// directions are compared on visual language alone.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

export const SCREENS = [
  'welcome',
  'mic-check',
  'examiner-speaking',
  'listening',
  'break',
  'complete',
] as const;

export type ScreenKey = (typeof SCREENS)[number];

export const SCREEN_LABELS: Record<ScreenKey, string> = {
  welcome: 'Welcome',
  'mic-check': 'Mic check',
  'examiner-speaking': 'Examiner speaking (protocol zone)',
  listening: 'Participant listening (protocol zone)',
  break: 'Break',
  complete: 'Session complete',
};

// Copy is identical across directions. The examiner line is an instruction
// (captioned), never a stimulus; see CLAUDE.md §4.
export const COPY = {
  name: 'Margaret',
  welcomeTitle: 'Good morning, Margaret.',
  welcomeBody:
    "Today's session takes about 25 minutes. Find a quiet spot, and we'll go at your pace.",
  welcomeCta: "I'm ready to begin",
  welcomeSecondary: 'Not right now',
  micTitle: "Let's make sure I can hear you.",
  micBody: "Say your name out loud, the way you'd talk across a kitchen table.",
  micStatus: 'I can hear you clearly',
  micCta: 'Sounds good, continue',
  examinerLine:
    'I am going to say some numbers and when I am through, repeat them to me exactly as I said them.',
  examinerLabel: 'Listen',
  listeningLabel: 'Your turn. Speak whenever you are ready.',
  done: "I'm finished",
  pause: 'Pause',
  progress: { current: 3, total: 7 },
  breakTitle: 'Time for a short breather.',
  breakBody: 'Follow the circle. Breathe in as it grows, and out as it settles.',
  breakCta: "I'm ready for the next one",
  completeTitle: "That's everything for today, Margaret.",
  completeBody:
    'Thank you for your time and focus. Your results will be ready tomorrow morning.',
  streak: '4 weeks in a row',
  streakBody: "You've made time for your brain health every week this month.",
  completeCta: 'Back to home',
} as const;

export function getScreenParam(): ScreenKey | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('screen');
  return SCREENS.includes(value as ScreenKey) ? (value as ScreenKey) : null;
}

/**
 * Smoothed fake voice amplitude in [0, 1]: bursts of "speech" separated by
 * pauses. Returns a steady mid value under reduced motion.
 */
export function useFakeAmplitude(active = true): number {
  const reduce = useReducedMotion();
  const [amp, setAmp] = useState(0.35);
  const smoothed = useRef(0);

  useEffect(() => {
    if (!active || reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      // Syllable-rate wobble gated by a slow phrase envelope.
      const phrase = Math.max(0, Math.sin(t * 0.9)) ** 0.6;
      const syllable = 0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 4.3);
      const target = phrase * (0.35 + 0.65 * syllable);
      smoothed.current += (target - smoothed.current) * 0.18;
      setAmp(smoothed.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduce]);

  return reduce ? 0.35 : amp;
}

/**
 * Renders a single screen when `?screen=` is set (used for screenshots),
 * otherwise every screen stacked with a small reviewer label.
 */
export function DirectionFrame({
  direction,
  render,
  labelClassName = '',
}: {
  direction: string;
  render: (screen: ScreenKey) => ReactNode;
  labelClassName?: string;
}) {
  const screen = getScreenParam();
  if (screen) return <>{render(screen)}</>;

  return (
    <div>
      {SCREENS.map((key) => (
        <section key={key} aria-label={SCREEN_LABELS[key]}>
          <div
            className={`px-4 py-2 font-mono text-xs uppercase tracking-widest ${labelClassName}`}
          >
            {direction} · {SCREEN_LABELS[key]}
          </div>
          {render(key)}
        </section>
      ))}
    </div>
  );
}
