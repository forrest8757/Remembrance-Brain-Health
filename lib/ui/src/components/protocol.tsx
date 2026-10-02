// Components that may appear inside the PROTOCOL zone. None of them accept
// response content, so none can signal correctness (CLAUDE.md §4).
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'framer-motion';
import { Button, Text, cx } from '../primitives';

// ---- ExaminerCaption --------------------------------------------------------

/** Caption of the current INSTRUCTION line. Never pass stimulus text. */
export function ExaminerCaption({ text, label = 'Listen' }: { text: string; label?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Text variant="eyebrow">{label}</Text>
      {/* data-caption: Settings → "Listen only" hides this written line (theme.css); the label stays. */}
      <Text variant="instruction" aria-live="polite" data-caption>
        {text}
      </Text>
    </div>
  );
}

// ---- ProgressRail -----------------------------------------------------------

/** Test N of M in the session. Never item-level progress inside a test. */
export function ProgressRail({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full" role="group" aria-label={`Activity ${current} of ${total}`}>
      <p className="mb-2 text-rm-eyebrow font-medium text-rm-ink-soft" aria-hidden>
        Activity {current} of {total}
      </p>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cx('h-1.5 flex-1 rounded-full', i < current - 1 ? 'bg-rm-ink-soft' : i === current - 1 ? 'bg-rm-cyan' : 'bg-rm-line')}
          />
        ))}
      </div>
    </div>
  );
}

// ---- DoneButton -------------------------------------------------------------

export function DoneButton({ onDone, disabled }: { onDone: () => void; disabled?: boolean }) {
  return (
    <Button onClick={onDone} disabled={disabled}>
      I'm finished
    </Button>
  );
}

// ---- TapPad -----------------------------------------------------------------

/**
 * Giant tap surface for vigilance-style tasks. Every tap gets the SAME soft
 * pulse, whether it is a hit, a commission error, or anything else.
 */
export function TapPad({ onTap, label = 'Tap here' }: { onTap: (atMs: number) => void; label?: string }) {
  const reduce = useReducedMotionConfig();
  const [pulses, setPulses] = useState<number[]>([]);
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        onTap(e.timeStamp);
        if (!reduce) setPulses((p) => [...p.slice(-3), e.timeStamp]);
      }}
      className="rm-focus relative flex aspect-square w-full max-w-[420px] select-none items-center justify-center overflow-hidden rounded-rm-lg bg-rm-surface text-rm-lead font-semibold text-rm-ink shadow-rm-card touch-manipulation"
    >
      <AnimatePresence>
        {pulses.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            className="absolute inset-[20%] rounded-full bg-rm-cyan-soft"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 1.3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onAnimationComplete={() => setPulses((p) => p.filter((x) => x !== id))}
          />
        ))}
      </AnimatePresence>
      <span className="relative">{label}</span>
    </button>
  );
}
