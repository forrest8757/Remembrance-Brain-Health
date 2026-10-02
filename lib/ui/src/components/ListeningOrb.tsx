// The emotional center of the product (CLAUDE.md §9). A solid cyan core
// inside a 48-segment level ring. The ring maps microphone AMPLITUDE only:
// it looks identical for a right answer, a wrong answer, or any other sound.
//
// States: idle · examinerSpeaking (slow breathe) · listening (ring follows
// live RMS) · thinking (soft pulse) · paused (dimmed). Under reduced motion
// the core is static and the ring shows a fixed half-lit arc while listening.
import { useEffect, useRef } from 'react';
import { motion, useReducedMotionConfig } from 'framer-motion';
import { color, motion as motionTokens } from '../tokens';

export type OrbState = 'idle' | 'examinerSpeaking' | 'listening' | 'thinking' | 'paused';

export interface ListeningOrbProps {
  state: OrbState;
  /** Read once per frame; 0..1 smoothed amplitude. Never pass anything content-derived. */
  getAmplitude?: () => number;
  size?: number;
  className?: string;
  /**
   * Increments once per stimulus onset (e.g. each digit). Every pulse is the
   * same swell, so it marks rhythm without counting.
   */
  pulse?: number;
}

const SEGMENTS = 48;

function drawRing(ctx: CanvasRenderingContext2D, size: number, lit: number) {
  const dpr = ctx.canvas.width / size;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const c = size / 2;
  const outer = size / 2 - 6;
  const inner = outer - 10;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  // Unlit segments follow the theme (light gray on cream, deep slate on dark).
  const off = getComputedStyle(ctx.canvas).getPropertyValue('--color-rm-meter-off').trim() || color.meterOff;
  for (let i = 0; i < SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = i < lit ? color.cyan : off;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
    ctx.lineTo(c + Math.cos(a) * outer, c + Math.sin(a) * outer);
    ctx.stroke();
  }
}

export function ListeningOrb({ state, getAmplitude, size = 220, className, pulse }: ListeningOrbProps) {
  const reduce = useReducedMotionConfig() ?? false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const ampRef = useRef(getAmplitude);
  ampRef.current = getAmplitude;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    if (state !== 'listening') {
      drawRing(ctx, size, 0);
      return;
    }
    if (reduce) {
      drawRing(ctx, size, SEGMENTS / 2);
      return;
    }
    let raf = 0;
    const tick = () => {
      const amp = Math.max(0, Math.min(1, ampRef.current?.() ?? 0));
      drawRing(ctx, size, Math.round(amp * SEGMENTS));
      if (coreRef.current) coreRef.current.style.transform = `scale(${1 + amp * 0.08})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (coreRef.current) coreRef.current.style.transform = '';
    };
  }, [state, reduce, size]);

  // While stimuli play, the per-onset pulse replaces the slow breathe.
  const breathe = state === 'examinerSpeaking' && !reduce && pulse === undefined;
  const pulseThinking = state === 'thinking' && !reduce;

  return (
    <div
      aria-hidden
      data-orb-state={state}
      className={className}
      style={{ position: 'relative', width: size, height: size, opacity: state === 'paused' ? 0.45 : 1, transition: `opacity ${motionTokens.slow}ms` }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: size, height: size }} />
      <motion.div
        key={reduce ? 'static' : `pulse-${pulse ?? 0}`}
        style={{ position: 'absolute', inset: size * 0.2 }}
        initial={{ scale: 1 }}
        animate={pulse !== undefined && pulse > 0 && !reduce ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <motion.div
          style={{ position: 'absolute', inset: 0 }}
          animate={breathe ? { scale: [0.94, 1.04, 0.94] } : pulseThinking ? { opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
          transition={
            breathe
              ? { duration: motionTokens.breatheMs / 1000, repeat: Infinity, ease: 'easeInOut' }
              : pulseThinking
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: motionTokens.base / 1000 }
          }
        >
          <div
            ref={coreRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `linear-gradient(160deg, #3FE0EE 0%, ${color.cyan} 55%, ${color.cyanDeep} 100%)`,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
