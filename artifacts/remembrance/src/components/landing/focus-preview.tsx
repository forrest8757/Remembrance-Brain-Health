import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type FocusPhase = "intro" | "active" | "processing" | "result";
type Target = { left: number; top: number };
type Ripple = Target & { id: number; createdAt: number };

export type FocusPreviewProps = {
  children?: React.ReactNode;
};

const ACTIVE_MS = 15_000;
const PROCESSING_MS = 3_500;
const TARGETS: Target[] = [
  { left: 0.2, top: 0.3 },
  { left: 0.76, top: 0.28 },
  { left: 0.5, top: 0.68 },
  { left: 0.29, top: 0.73 },
  { left: 0.79, top: 0.63 },
  { left: 0.52, top: 0.28 },
  { left: 0.18, top: 0.55 },
  { left: 0.73, top: 0.43 },
  { left: 0.45, top: 0.52 },
];

const styles = `
  .focus-preview {
    --fp-navy: #1E3A5F;
    --fp-cyan: #1BCEDF;
    --fp-cream: #F5F1EA;
    overflow: hidden;
    width: 100%;
    padding: clamp(4.5rem, 10vw, 8rem) clamp(1.25rem, 4vw, 2.5rem);
    color: var(--fp-navy);
    background:
      radial-gradient(circle at 8% 12%, rgba(27, 206, 223, .08), transparent 25rem),
      var(--fp-cream);
  }
  .focus-preview *, .focus-preview *::before, .focus-preview *::after {
    box-sizing: border-box;
  }
  .focus-preview__inner {
    width: min(100%, 72rem);
    margin: 0 auto;
  }
  .focus-preview__heading {
    max-width: 48rem;
    margin: 0 auto clamp(2.25rem, 6vw, 4rem);
    text-align: center;
  }
  .focus-preview__eyebrow, .focus-preview__kicker {
    display: block;
    margin: 0 0 .8rem;
    color: var(--fp-cyan);
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .16em;
    line-height: 1.4;
    text-transform: uppercase;
  }
  .focus-preview__heading h2 {
    max-width: 44rem;
    margin: 0 auto;
    font-size: clamp(2.2rem, 6vw, 4.6rem);
    font-weight: 700;
    letter-spacing: -.045em;
    line-height: 1.03;
  }
  .focus-preview__heading p {
    max-width: 38rem;
    margin: 1.35rem auto 0;
    color: rgba(30, 58, 95, .76);
    font-size: clamp(1rem, 2.2vw, 1.18rem);
    line-height: 1.7;
  }
  .focus-preview__card {
    position: relative;
    width: min(100%, 58rem);
    min-height: 34rem;
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid rgba(30, 58, 95, .12);
    border-radius: clamp(1.25rem, 3vw, 2.25rem);
    background: rgba(255, 255, 255, .42);
    box-shadow: 0 1.25rem 4rem rgba(30, 58, 95, .09), 0 .2rem .8rem rgba(30, 58, 95, .04);
  }
  .focus-preview__card::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background: linear-gradient(135deg, rgba(255, 255, 255, .46), transparent 46%);
  }
  .focus-preview__card-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 5.4rem;
    padding: 1rem clamp(1.25rem, 4vw, 2rem);
    border-bottom: 1px solid rgba(30, 58, 95, .1);
  }
  .focus-preview__label {
    display: block;
    margin-bottom: .2rem;
    color: rgba(30, 58, 95, .56);
    font-size: .66rem;
    font-weight: 800;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .focus-preview__title {
    margin: 0;
    font-size: .98rem;
    font-weight: 700;
    line-height: 1.25;
  }
  .focus-preview__header-actions, .focus-preview__button-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: .65rem;
  }
  .focus-preview__header-actions {
    justify-content: flex-end;
  }
  .focus-preview__card button {
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .focus-preview__header-button, .focus-preview__text-button,
  .focus-preview__pause-button, .focus-preview__secondary-button {
    min-height: 2.8rem;
    padding: 0 1rem;
    border: 1px solid rgba(30, 58, 95, .18);
    border-radius: 999px;
    color: var(--fp-navy);
    background: rgba(255, 255, 255, .5);
    font-size: .8rem;
    font-weight: 700;
    transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
  }
  .focus-preview__header-button:hover, .focus-preview__text-button:hover,
  .focus-preview__pause-button:hover, .focus-preview__secondary-button:hover {
    border-color: rgba(27, 206, 223, .7);
    background: rgba(27, 206, 223, .12);
  }
  .focus-preview__primary-button {
    min-height: 2.9rem;
    padding: .8rem 1.25rem;
    border: 1px solid var(--fp-cyan);
    border-radius: 999px;
    color: var(--fp-navy);
    background: var(--fp-cyan);
    box-shadow: 0 .55rem 1.4rem rgba(27, 206, 223, .2);
    font-size: .91rem;
    font-weight: 800;
    transition: background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }
  .focus-preview__primary-button:hover {
    background: #53d9e5;
    box-shadow: 0 .7rem 1.8rem rgba(27, 206, 223, .29);
  }
  .focus-preview__card button:focus-visible {
    outline: 3px solid var(--fp-navy);
    outline-offset: 3px;
  }
  .focus-preview__card button:active {
    transform: translateY(1px);
  }
  .focus-preview__body {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 28.5rem;
    align-items: center;
    justify-content: center;
    padding: clamp(1.5rem, 5vw, 3.5rem);
  }
  .focus-preview__screen {
    width: 100%;
    text-align: center;
  }
  .focus-preview__screen h3, .focus-preview__result h3,
  .focus-preview__processing h3 {
    max-width: 35rem;
    margin: 0 auto;
    font-size: clamp(1.55rem, 4vw, 2.35rem);
    font-weight: 700;
    letter-spacing: -.035em;
    line-height: 1.1;
  }
  .focus-preview__screen p, .focus-preview__result-copy,
  .focus-preview__processing-copy {
    max-width: 34rem;
    margin: 1rem auto 0;
    color: rgba(30, 58, 95, .74);
    font-size: 1rem;
    line-height: 1.65;
  }
  .focus-preview__intro-mark {
    display: grid;
    width: 6.25rem;
    height: 6.25rem;
    margin: 0 auto 1.5rem;
    place-items: center;
    border-radius: 50%;
    background: radial-gradient(circle at 37% 32%, rgba(255, 255, 255, .85), transparent 35%), var(--fp-cyan);
    box-shadow: 0 0 0 1.25rem rgba(27, 206, 223, .08), 0 0 3rem rgba(27, 206, 223, .23);
    font-size: 2rem;
    font-weight: 700;
  }
  .focus-preview__button-row {
    margin-top: 1.7rem;
  }
  .focus-preview__activity {
    width: 100%;
    max-width: 47rem;
  }
  .focus-preview__activity-meta, .focus-preview__activity-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .focus-preview__activity-meta {
    margin-bottom: 1rem;
  }
  .focus-preview__instruction, .focus-preview__tap-count {
    margin: 0;
    color: rgba(30, 58, 95, .72);
    font-size: .92rem;
    line-height: 1.5;
  }
  .focus-preview__tap-count {
    font-weight: 700;
  }
  .focus-preview__progress {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    width: 4.5rem;
    height: 4.5rem;
    place-items: center;
  }
  .focus-preview__progress svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .focus-preview__progress circle {
    fill: transparent;
    stroke-width: 4;
  }
  .focus-preview__progress-track {
    stroke: rgba(30, 58, 95, .1);
  }
  .focus-preview__progress-value {
    stroke: var(--fp-cyan);
    stroke-linecap: round;
    transition: stroke-dashoffset 100ms linear;
  }
  .focus-preview__progress span {
    position: relative;
    font-size: .73rem;
    font-weight: 800;
  }
  .focus-preview__canvas-wrap {
    position: relative;
    width: 100%;
    min-height: 16rem;
    overflow: hidden;
    border: 1px solid rgba(30, 58, 95, .08);
    border-radius: 1.5rem;
    background: var(--fp-cream);
    box-shadow: inset 0 0 4rem rgba(27, 206, 223, .06);
  }
  .focus-preview__canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .focus-preview__target {
    position: absolute;
    display: grid;
    width: clamp(4.75rem, 11vw, 5.75rem);
    height: clamp(4.75rem, 11vw, 5.75rem);
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    transform: translate(-50%, -50%);
  }
  .focus-preview__target::before {
    position: absolute;
    inset: .38rem;
    border: 1px solid rgba(30, 58, 95, .35);
    border-radius: 50%;
    content: "";
    opacity: 0;
    transition: inset 180ms ease, opacity 180ms ease;
  }
  .focus-preview__target:hover::before, .focus-preview__target:focus-visible::before {
    inset: .08rem;
    opacity: 1;
  }
  .focus-preview__target:focus-visible {
    outline: 3px solid var(--fp-navy);
    outline-offset: .3rem;
  }
  .focus-preview__target-label, .focus-preview__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .focus-preview__processing {
    width: 100%;
    max-width: 32rem;
    text-align: center;
  }
  .focus-preview__processing-art {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    height: 7.2rem;
    margin-bottom: 1.65rem;
  }
  .focus-preview__attention-orb {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    width: 5.2rem;
    height: 5.2rem;
    place-items: center;
    border: 1px solid rgba(27, 206, 223, .64);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(27, 206, 223, .28), rgba(27, 206, 223, .04) 67%, transparent 68%);
    box-shadow: 0 0 2.8rem rgba(27, 206, 223, .2);
  }
  .focus-preview__attention-orb::before, .focus-preview__attention-orb::after {
    position: absolute;
    border: 1px solid rgba(27, 206, 223, .34);
    border-radius: 50%;
    content: "";
  }
  .focus-preview__attention-orb::before { inset: .7rem; }
  .focus-preview__attention-orb::after { inset: -.6rem; }
  .focus-preview__attention-dot {
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 50%;
    background: var(--fp-cyan);
    box-shadow: 0 0 1.4rem rgba(27, 206, 223, .74);
  }
  .focus-preview__waveform {
    display: flex;
    align-items: center;
    gap: .27rem;
    height: 4rem;
  }
  .focus-preview__waveform i {
    display: block;
    width: .27rem;
    height: 35%;
    border-radius: 999px;
    background: var(--fp-cyan);
    opacity: .72;
    animation: focus-preview-wave 1.15s ease-in-out infinite alternate;
  }
  .focus-preview__waveform i:nth-child(2) { height: 62%; animation-delay: -.25s; }
  .focus-preview__waveform i:nth-child(3) { height: 88%; animation-delay: -.45s; }
  .focus-preview__waveform i:nth-child(4) { height: 48%; animation-delay: -.65s; }
  .focus-preview__waveform i:nth-child(5) { height: 72%; animation-delay: -.85s; }
  .focus-preview__waveform i:nth-child(6) { height: 42%; animation-delay: -.15s; }
  .focus-preview__waveform i:nth-child(7) { height: 66%; animation-delay: -.4s; }
  @keyframes focus-preview-wave {
    from { transform: scaleY(.55); opacity: .45; }
    to { transform: scaleY(1); opacity: 1; }
  }
  .focus-preview__processing-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: .75rem;
    margin-top: 1.5rem;
  }
  .focus-preview__result {
    width: 100%;
    max-width: 39rem;
    text-align: center;
  }
  .focus-preview__result-count {
    display: inline-flex;
    align-items: baseline;
    gap: .4rem;
    margin: 1.35rem 0 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .focus-preview__result-count strong {
    color: var(--fp-cyan);
    font-size: 2.35rem;
    line-height: 1;
  }
  .focus-preview__children {
    width: min(100%, 58rem);
    margin: clamp(2rem, 5vw, 3.5rem) auto 0;
    padding: clamp(1.35rem, 4vw, 2.5rem);
    border: 1px solid rgba(27, 206, 223, .28);
    border-radius: clamp(1.25rem, 3vw, 2rem);
    background: rgba(255, 255, 255, .66);
    box-shadow: 0 1rem 3rem rgba(30, 58, 95, .08);
  }
  .focus-preview__children h3 {
    margin: 0;
    font-size: clamp(1.45rem, 3vw, 2.1rem);
    letter-spacing: -.03em;
    line-height: 1.15;
    text-align: center;
  }
  .focus-preview__children-content {
    display: flex;
    justify-content: center;
    margin-top: 1.35rem;
  }
  .focus-preview__disclaimer {
    max-width: 48rem;
    margin: 1.5rem auto 0;
    color: rgba(30, 58, 95, .58);
    font-size: .75rem;
    line-height: 1.6;
    text-align: center;
  }
  @media (max-width: 35rem) {
    .focus-preview__card-header { align-items: flex-start; }
    .focus-preview__header-button { padding: 0 .75rem; font-size: .72rem; }
    .focus-preview__activity-meta { align-items: flex-start; }
    .focus-preview__canvas-wrap { min-height: 14rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .focus-preview__card button, .focus-preview__target::before,
    .focus-preview__progress-value { transition: none; }
    .focus-preview__waveform i { animation: none; }
  }
`;

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="focus-preview__progress"
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle
          className="focus-preview__progress-track"
          cx="24"
          cy="24"
          r={radius}
        />
        <circle
          className="focus-preview__progress-value"
          cx="24"
          cy="24"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span aria-hidden="true">{Math.round(clamped)}%</span>
    </div>
  );
}

/**
 * A wellness-only taste of Remembrance. The canvas is paired with a real
 * button at the current target position so the same activity works with
 * touch, mouse, keyboard, and assistive technology.
 */
export function FocusPreview({ children }: FocusPreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasSize = useRef({ width: 0, height: 0, dpr: 1 });
  const activeRef = useRef(0);
  const processingRef = useRef(0);
  const rippleId = useRef(0);

  const [phase, setPhase] = useState<FocusPhase>("intro");
  const [activeElapsed, setActiveElapsed] = useState(0);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const suspended = userPaused || hidden || offscreen;
  const target = TARGETS[targetIndex];
  const activeProgress = Math.min(100, (activeElapsed / ACTIVE_MS) * 100);
  const processingProgress = Math.min(
    100,
    (processingElapsed / PROCESSING_MS) * 100,
  );
  const secondsLeft = Math.max(
    0,
    Math.ceil((ACTIVE_MS - activeElapsed) / 1_000),
  );

  const reset = useCallback(() => {
    activeRef.current = 0;
    processingRef.current = 0;
    setActiveElapsed(0);
    setProcessingElapsed(0);
    setTargetIndex(0);
    setTapCount(0);
    setRipples([]);
    setUserPaused(false);
    setPhase("intro");
  }, []);

  const start = useCallback(() => {
    activeRef.current = 0;
    processingRef.current = 0;
    setActiveElapsed(0);
    setProcessingElapsed(0);
    setTargetIndex(0);
    setTapCount(0);
    setRipples([]);
    setUserPaused(false);
    setPhase("active");
  }, []);

  const showResult = useCallback(() => {
    setUserPaused(false);
    setPhase("result");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);

    const root = rootRef.current;
    let observer: IntersectionObserver | undefined;
    if (root && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => setOffscreen(!entry.isIntersecting),
        { threshold: 0.05 },
      );
      observer.observe(root);
    }
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (phase !== "active" || suspended) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(
        ACTIVE_MS,
        activeRef.current + Math.max(0, now - previous),
      );
      activeRef.current = elapsed;
      setActiveElapsed(elapsed);
      if (elapsed >= ACTIVE_MS) {
        processingRef.current = 0;
        setProcessingElapsed(0);
        setPhase("processing");
        return;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, suspended]);

  useEffect(() => {
    if (phase !== "processing" || suspended) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(
        PROCESSING_MS,
        processingRef.current + Math.max(0, now - previous),
      );
      processingRef.current = elapsed;
      setProcessingElapsed(elapsed);
      if (elapsed >= PROCESSING_MS) {
        setPhase("result");
        return;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, suspended]);

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const { width, height, dpr } = canvasSize.current;
      if (!canvas || !width || !height) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.save();
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const background = context.createRadialGradient(
        width * 0.48,
        height * 0.45,
        0,
        width * 0.48,
        height * 0.45,
        Math.max(width, height) * 0.8,
      );
      background.addColorStop(0, "rgba(255,255,255,.4)");
      background.addColorStop(1, "#F5F1EA");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(30,58,95,.075)";
      context.lineWidth = 1;
      [0.31, 0.45].forEach((radius) => {
        context.beginPath();
        context.arc(
          width * 0.51,
          height * 0.49,
          Math.min(width, height) * radius,
          0,
          Math.PI * 2,
        );
        context.stroke();
      });

      const x = target.left * width;
      const y = target.top * height;
      const radius = Math.min(34, Math.max(27, Math.min(width, height) * 0.1));
      if (phase === "intro" || phase === "active") {
        const glow = context.createRadialGradient(
          x,
          y,
          radius * 0.25,
          x,
          y,
          radius * 2.9,
        );
        glow.addColorStop(0, "rgba(27,206,223,.36)");
        glow.addColorStop(0.42, "rgba(27,206,223,.12)");
        glow.addColorStop(1, "rgba(27,206,223,0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 2.9, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = phase === "intro" ? 0.72 : 1;
        context.fillStyle = "#1BCEDF";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        context.fillStyle = "rgba(255,255,255,.54)";
        context.beginPath();
        context.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion) {
        ripples.forEach((ripple) => {
          const age = Math.max(0, time - ripple.createdAt);
          if (age > 1_050) return;
          const progress = age / 1_050;
          context.strokeStyle = `rgba(27,206,223,${0.52 * (1 - progress)})`;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(
            ripple.left * width,
            ripple.top * height,
            radius * (1 + progress * 2.4),
            0,
            Math.PI * 2,
          );
          context.stroke();
        });
      }
      context.restore();
    },
    [phase, reducedMotion, ripples, target.left, target.top],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasSize.current = { width: bounds.width, height: bounds.height, dpr };
      canvas.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas.height = Math.max(1, Math.round(bounds.height * dpr));
      draw(performance.now());
    };
    resize();
    const observer =
      "ResizeObserver" in window ? new ResizeObserver(resize) : undefined;
    observer?.observe(canvas);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [draw]);

  useEffect(() => {
    const animate =
      !reducedMotion &&
      !suspended &&
      (phase === "active" || phase === "processing");
    if (!animate) {
      draw(performance.now());
      return;
    }
    let frame = 0;
    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw, phase, reducedMotion, suspended]);

  const handleTap = () => {
    if (phase !== "active" || suspended) return;
    const tapped = TARGETS[targetIndex];
    rippleId.current += 1;
    setRipples((current) => [
      ...current.slice(-4),
      { ...tapped, id: rippleId.current, createdAt: performance.now() },
    ]);
    setTapCount((count) => count + 1);
    setTargetIndex((index) => (index + 1) % TARGETS.length);
  };

  const title =
    phase === "intro"
      ? "A gentle moment"
      : phase === "active"
        ? "Tap the bright circle"
        : phase === "processing"
          ? "Making a tiny preview"
          : "Your mini preview";
  const liveMessage =
    phase === "active"
      ? `${tapCount} target${tapCount === 1 ? "" : "s"} tapped. Take your time.`
      : phase === "processing"
        ? "Creating a small simulated preview. This is not a health measurement."
        : phase === "result"
          ? `Mini preview complete. You tapped ${tapCount} target${tapCount === 1 ? "" : "s"}.`
          : "Ready when you are. This activity has no score or penalty.";

  return (
    <section
      ref={rootRef}
      className="focus-preview"
      aria-labelledby="focus-preview-heading"
    >
      <style>{styles}</style>
      <div className="focus-preview__inner">
        <header className="focus-preview__heading">
          <span className="focus-preview__eyebrow">Try a 15-second taste</span>
          <h2 id="focus-preview-heading">
            Find a little focus, one tap at a time.
          </h2>
          <p>
            A bright, calming moment from Remembrance. Tap the circles as they
            appear—there is no score, no pressure, and no wrong way to begin.
          </p>
        </header>

        <div className="focus-preview__card" aria-busy={phase === "processing"}>
          <div className="focus-preview__card-header">
            <div>
              <span className="focus-preview__label">Focus field</span>
              <h3 className="focus-preview__title">{title}</h3>
            </div>
            <div className="focus-preview__header-actions">
              {phase !== "intro" && (
                <button
                  type="button"
                  className="focus-preview__header-button"
                  onClick={reset}
                  aria-label="Reset the focus preview"
                >
                  Reset
                </button>
              )}
              {phase === "active" && (
                <ProgressRing
                  value={activeProgress}
                  label={`${Math.round(activeProgress)} percent of the 15-second activity`}
                />
              )}
              {phase === "processing" && (
                <ProgressRing
                  value={processingProgress}
                  label={`${Math.round(processingProgress)} percent of preview processing`}
                />
              )}
            </div>
          </div>

          <div className="focus-preview__body">
            <div className="focus-preview__sr-only" aria-live="polite">
              {liveMessage}
            </div>

            {phase === "intro" && (
              <div className="focus-preview__screen">
                <div className="focus-preview__intro-mark" aria-hidden="true">+</div>
                <h3>Let your attention wander, then gently bring it back.</h3>
                <p>
                  When the activity starts, follow one large cyan circle at a
                  time. You can pause or leave whenever you like.
                </p>
                <div className="focus-preview__button-row">
                  <button
                    type="button"
                    className="focus-preview__primary-button"
                    onClick={start}
                  >
                    Start 15-second moment
                  </button>
                  <button
                    type="button"
                    className="focus-preview__secondary-button"
                    onClick={showResult}
                  >
                    Skip to preview
                  </button>
                </div>
              </div>
            )}

            {phase === "active" && (
              <div className="focus-preview__activity">
                <div className="focus-preview__activity-meta">
                  <p id="focus-preview-instructions" className="focus-preview__instruction">
                    Tap the bright circle. Keyboard users can press Enter or
                    Space on the focused target.
                  </p>
                  <span className="focus-preview__sr-only">
                    {secondsLeft} seconds remaining
                  </span>
                </div>
                <div className="focus-preview__canvas-wrap">
                  <canvas
                    ref={canvasRef}
                    className="focus-preview__canvas"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className="focus-preview__target"
                    style={{
                      left: `${target.left * 100}%`,
                      top: `${target.top * 100}%`,
                    }}
                    onClick={handleTap}
                    disabled={suspended}
                    aria-label={`Bright target ${targetIndex + 1} of ${TARGETS.length}. Activate to tap it.`}
                    aria-describedby="focus-preview-instructions"
                    aria-keyshortcuts="Enter Space"
                  >
                    <span className="focus-preview__target-label">
                      Tap bright target
                    </span>
                  </button>
                </div>
                <div className="focus-preview__activity-footer">
                  <p className="focus-preview__tap-count">
                    {tapCount} tap{tapCount === 1 ? "" : "s"} so far
                  </p>
                  <div className="focus-preview__button-row" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      className="focus-preview__pause-button"
                      onClick={() => setUserPaused((paused) => !paused)}
                      aria-pressed={userPaused}
                    >
                      {userPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      className="focus-preview__text-button"
                      onClick={showResult}
                    >
                      Skip to result
                    </button>
                  </div>
                </div>
                {suspended && (
                  <p className="focus-preview__processing-copy" role="status">
                    {userPaused
                      ? "Paused. Resume whenever you feel ready."
                      : "Paused while this preview is out of view."}
                  </p>
                )}
              </div>
            )}

            {phase === "processing" && (
              <div className="focus-preview__processing">
                <div className="focus-preview__processing-art" aria-hidden="true">
                  <div className="focus-preview__attention-orb">
                    <span className="focus-preview__attention-dot" />
                  </div>
                  <div className="focus-preview__waveform">
                    {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
                  </div>
                </div>
                <h3>A calm little pause to reflect.</h3>
                <p className="focus-preview__processing-copy">
                  This is a miniature simulated preview—not a health
                  measurement. You can skip this moment at any time.
                </p>
                <div className="focus-preview__processing-controls">
                  <button
                    type="button"
                    className="focus-preview__pause-button"
                    onClick={() => setUserPaused((paused) => !paused)}
                    aria-pressed={userPaused}
                  >
                    {userPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    className="focus-preview__secondary-button"
                    onClick={showResult}
                  >
                    Skip processing
                  </button>
                </div>
                {suspended && (
                  <p className="focus-preview__processing-copy" role="status">
                    {userPaused
                      ? "Paused. Resume whenever you feel ready."
                      : "Paused while this preview is out of view."}
                  </p>
                )}
              </div>
            )}

            {phase === "result" && (
              <div className="focus-preview__result">
                <span className="focus-preview__kicker">A moment to notice</span>
                <h3>Nice work making time for yourself.</h3>
                <p className="focus-preview__result-copy">
                  You explored a small moment of attention with Remembrance.
                  This is a playful preview, not a health assessment.
                </p>
                <p className="focus-preview__result-count">
                  <strong>{tapCount}</strong>
                  target tap{tapCount === 1 ? "" : "s"}
                </p>
                <div className="focus-preview__button-row">
                  <button
                    type="button"
                    className="focus-preview__primary-button"
                    onClick={start}
                  >
                    Play again
                  </button>
                  <button
                    type="button"
                    className="focus-preview__secondary-button"
                    onClick={reset}
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {phase === "result" && (
          <aside
            className="focus-preview__children"
            aria-labelledby="focus-preview-waitlist-heading"
          >
            <h3 id="focus-preview-waitlist-heading">
              Want your full Remembrance Score? Join the waitlist.
            </h3>
            {children && (
              <div className="focus-preview__children-content">{children}</div>
            )}
          </aside>
        )}

        <p className="focus-preview__disclaimer">
          Remembrance is a wellness and brain-health tool. This mini activity
          is for exploration only—not a medical assessment or a substitute for
          care from a qualified professional.
        </p>
      </div>
    </section>
  );
}
