import React, { useCallback, useEffect, useState } from "react";

type MemoryPhase = "intro" | "study" | "recall" | "result";

export type FocusPreviewProps = {
  children?: React.ReactNode;
};

const SAMPLE_MS = 15_000;
const STUDY_MS = 5_000;
const MEMORY_ITEMS = ["Keys", "Mug", "Book"] as const;
const MEMORY_CHOICES = ["Keys", "Lamp", "Mug", "Apple", "Book", "Clock"] as const;

const styles = `
  .memory-preview {
    --mp-navy: #1e3a5f;
    --mp-cyan: #1bcedf;
    --mp-cream: #f5f1ea;
    width: 100%;
    overflow: hidden;
    padding: clamp(4.5rem, 10vw, 8rem) clamp(1.25rem, 4vw, 2.5rem);
    color: var(--mp-navy);
    background:
      radial-gradient(circle at 8% 12%, rgba(27, 206, 223, .08), transparent 25rem),
      var(--mp-cream);
  }
  .memory-preview *, .memory-preview *::before, .memory-preview *::after {
    box-sizing: border-box;
  }
  .memory-preview__inner {
    width: min(100%, 72rem);
    margin: 0 auto;
  }
  .memory-preview__heading {
    max-width: 48rem;
    margin: 0 auto clamp(2.25rem, 6vw, 4rem);
    text-align: center;
  }
  .memory-preview__eyebrow, .memory-preview__kicker {
    display: block;
    margin: 0 0 .8rem;
    color: var(--mp-cyan);
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .16em;
    line-height: 1.4;
    text-transform: uppercase;
  }
  .memory-preview__heading h2 {
    max-width: 44rem;
    margin: 0 auto;
    font-size: clamp(2.2rem, 6vw, 4.6rem);
    font-weight: 700;
    letter-spacing: -.045em;
    line-height: 1.03;
  }
  .memory-preview__heading p {
    max-width: 39rem;
    margin: 1.35rem auto 0;
    color: rgba(30, 58, 95, .76);
    font-size: clamp(1rem, 2.2vw, 1.18rem);
    line-height: 1.7;
  }
  .memory-preview__card {
    position: relative;
    width: min(100%, 58rem);
    min-height: 34rem;
    margin: 0 auto;
    overflow: hidden;
    border: 1px solid rgba(30, 58, 95, .12);
    border-radius: clamp(1.25rem, 3vw, 2.25rem);
    background: rgba(255, 255, 255, .48);
    box-shadow: 0 1.25rem 4rem rgba(30, 58, 95, .09), 0 .2rem .8rem rgba(30, 58, 95, .04);
  }
  .memory-preview__card::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: "";
    background: linear-gradient(135deg, rgba(255, 255, 255, .52), transparent 46%);
  }
  .memory-preview__card-header {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 5.4rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem clamp(1.25rem, 4vw, 2rem);
    border-bottom: 1px solid rgba(30, 58, 95, .1);
  }
  .memory-preview__label {
    display: block;
    margin-bottom: .2rem;
    color: rgba(30, 58, 95, .56);
    font-size: .66rem;
    font-weight: 800;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .memory-preview__title {
    margin: 0;
    font-size: .98rem;
    font-weight: 700;
  }
  .memory-preview__actions, .memory-preview__button-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: .65rem;
  }
  .memory-preview__actions {
    justify-content: flex-end;
  }
  .memory-preview button {
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .memory-preview__secondary, .memory-preview__text-button {
    min-height: 2.8rem;
    padding: 0 1rem;
    border: 1px solid rgba(30, 58, 95, .18);
    border-radius: 999px;
    color: var(--mp-navy);
    background: rgba(255, 255, 255, .6);
    font-size: .8rem;
    font-weight: 700;
  }
  .memory-preview__secondary:hover, .memory-preview__text-button:hover {
    border-color: rgba(27, 206, 223, .7);
    background: rgba(27, 206, 223, .12);
  }
  .memory-preview__primary {
    min-height: 2.9rem;
    padding: .8rem 1.3rem;
    border: 1px solid var(--mp-cyan);
    border-radius: 999px;
    color: var(--mp-navy);
    background: var(--mp-cyan);
    box-shadow: 0 .55rem 1.4rem rgba(27, 206, 223, .2);
    font-size: .91rem;
    font-weight: 800;
  }
  .memory-preview button:focus-visible {
    outline: 3px solid var(--mp-navy);
    outline-offset: 3px;
  }
  .memory-preview__body {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 28.5rem;
    align-items: center;
    justify-content: center;
    padding: clamp(1.5rem, 5vw, 3.5rem);
  }
  .memory-preview__screen {
    width: 100%;
    max-width: 44rem;
    text-align: center;
  }
  .memory-preview__screen h3 {
    max-width: 36rem;
    margin: 0 auto;
    font-size: clamp(1.55rem, 4vw, 2.35rem);
    font-weight: 700;
    letter-spacing: -.035em;
    line-height: 1.1;
  }
  .memory-preview__screen p {
    max-width: 34rem;
    margin: 1rem auto 0;
    color: rgba(30, 58, 95, .74);
    font-size: 1rem;
    line-height: 1.65;
  }
  .memory-preview__intro-mark {
    display: grid;
    width: 6.25rem;
    height: 6.25rem;
    margin: 0 auto 1.5rem;
    place-items: center;
    border-radius: 1.8rem;
    background: rgba(27, 206, 223, .13);
    box-shadow: 0 0 0 1rem rgba(27, 206, 223, .05);
    color: var(--mp-cyan);
    font-size: 2rem;
    font-weight: 800;
  }
  .memory-preview__button-row {
    margin-top: 1.7rem;
  }
  .memory-preview__progress {
    position: relative;
    display: grid;
    flex: 0 0 auto;
    width: 4.5rem;
    height: 4.5rem;
    place-items: center;
  }
  .memory-preview__progress svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .memory-preview__progress circle {
    fill: transparent;
    stroke-width: 4;
  }
  .memory-preview__progress-track { stroke: rgba(30, 58, 95, .1); }
  .memory-preview__progress-value {
    stroke: var(--mp-cyan);
    stroke-linecap: round;
    transition: stroke-dashoffset 100ms linear;
  }
  .memory-preview__progress span {
    position: relative;
    font-size: .73rem;
    font-weight: 800;
  }
  .memory-preview__items, .memory-preview__choices {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(.6rem, 2vw, 1rem);
    width: 100%;
    margin-top: 1.6rem;
  }
  .memory-preview__item {
    display: flex;
    aspect-ratio: 1;
    min-height: 8rem;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    border: 1px solid rgba(27, 206, 223, .3);
    border-radius: 1.5rem;
    background: rgba(27, 206, 223, .09);
    box-shadow: 0 .65rem 1.7rem rgba(30, 58, 95, .06);
  }
  .memory-preview__item span {
    margin-bottom: .7rem;
    color: var(--mp-cyan);
    font-size: .68rem;
    font-weight: 800;
    letter-spacing: .15em;
    text-transform: uppercase;
  }
  .memory-preview__item strong {
    font-size: clamp(1.3rem, 3.2vw, 2rem);
  }
  .memory-preview__choice {
    min-height: 4.7rem;
    padding: .8rem;
    border: 1px solid rgba(30, 58, 95, .14);
    border-radius: 1.15rem;
    color: var(--mp-navy);
    background: rgba(255, 255, 255, .76);
    font-size: .95rem;
    font-weight: 750;
  }
  .memory-preview__choice:hover {
    border-color: rgba(27, 206, 223, .7);
    background: rgba(27, 206, 223, .08);
  }
  .memory-preview__choice[aria-pressed="true"] {
    border-color: var(--mp-cyan);
    background: rgba(27, 206, 223, .16);
    box-shadow: 0 0 0 3px rgba(27, 206, 223, .12);
  }
  .memory-preview__note {
    margin: 1rem 0 0;
    color: rgba(30, 58, 95, .62);
    font-size: .82rem;
    font-weight: 650;
  }
  .memory-preview__children {
    width: min(100%, 58rem);
    margin: clamp(2rem, 5vw, 3.5rem) auto 0;
    padding: clamp(1.35rem, 4vw, 2.5rem);
    border: 1px solid rgba(27, 206, 223, .28);
    border-radius: clamp(1.25rem, 3vw, 2rem);
    background: rgba(255, 255, 255, .66);
    box-shadow: 0 1rem 3rem rgba(30, 58, 95, .08);
    text-align: center;
  }
  .memory-preview__children h3 {
    margin: 0;
    font-size: clamp(1.45rem, 3vw, 2.1rem);
    letter-spacing: -.03em;
    line-height: 1.15;
  }
  .memory-preview__children-content {
    display: flex;
    justify-content: center;
    margin-top: 1.35rem;
  }
  .memory-preview__disclaimer {
    max-width: 48rem;
    margin: 1.5rem auto 0;
    color: rgba(30, 58, 95, .58);
    font-size: .75rem;
    line-height: 1.6;
    text-align: center;
  }
  .memory-preview__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 35rem) {
    .memory-preview__card-header { align-items: flex-start; }
    .memory-preview__items, .memory-preview__choices { gap: .5rem; }
    .memory-preview__item { min-height: 6.5rem; padding: .65rem; }
    .memory-preview__choice { min-height: 4.1rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .memory-preview__progress-value { transition: none; }
  }
`;

function ProgressRing({ value }: { value: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="memory-preview__progress" role="img" aria-label={`${Math.round(clamped)} percent complete`}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle className="memory-preview__progress-track" cx="24" cy="24" r={radius} />
        <circle
          className="memory-preview__progress-value"
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

export function FocusPreview({ children }: FocusPreviewProps) {
  const [phase, setPhase] = useState<MemoryPhase>("intro");
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const suspended = userPaused || hidden;
  const progress = Math.min(100, (elapsed / SAMPLE_MS) * 100);

  const start = useCallback(() => {
    setElapsed(0);
    setSelected([]);
    setUserPaused(false);
    setPhase("study");
  }, []);

  const reset = useCallback(() => {
    setElapsed(0);
    setSelected([]);
    setUserPaused(false);
    setPhase("intro");
  }, []);

  useEffect(() => {
    const handleVisibility = () => setHidden(document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if ((phase !== "study" && phase !== "recall") || suspended) return;
    const interval = window.setInterval(() => {
      setElapsed((current) => Math.min(SAMPLE_MS, current + 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase, suspended]);

  useEffect(() => {
    if (phase === "study" && elapsed >= STUDY_MS) setPhase("recall");
    if ((phase === "study" || phase === "recall") && elapsed >= SAMPLE_MS) setPhase("result");
  }, [elapsed, phase]);

  const chooseItem = (item: string) => {
    setSelected((current) => {
      const next = current.includes(item)
        ? current.filter((value) => value !== item)
        : current.length < 3
          ? [...current, item]
          : current;
      if (next.length === 3) setPhase("result");
      return next;
    });
  };

  const title =
    phase === "intro"
      ? "A quick memory moment"
      : phase === "study"
        ? "Remember these three"
        : phase === "recall"
          ? "Which ones did you see?"
          : "A moment for your memory";

  return (
    <section className="memory-preview" aria-labelledby="memory-preview-heading">
      <style>{styles}</style>
      <div className="memory-preview__inner">
        <header className="memory-preview__heading">
          <span className="memory-preview__eyebrow">Try a 15-second memory sample</span>
          <h2 id="memory-preview-heading">Remember three everyday items.</h2>
          <p>
            We will show you three familiar things, then ask which ones you saw.
            It is brief, calm, and there is no score or penalty.
          </p>
        </header>

        <div className="memory-preview__card">
          <div className="memory-preview__card-header">
            <div>
              <span className="memory-preview__label">Everyday recall</span>
              <h3 className="memory-preview__title">{title}</h3>
            </div>
            <div className="memory-preview__actions">
              {phase !== "intro" && (
                <button type="button" className="memory-preview__text-button" onClick={reset}>
                  Reset
                </button>
              )}
              {(phase === "study" || phase === "recall") && <ProgressRing value={progress} />}
            </div>
          </div>

          <div className="memory-preview__body">
            <div className="memory-preview__sr-only" aria-live="polite">
              {phase === "study"
                ? "Three items are shown: keys, mug, and book."
                : phase === "recall"
                  ? `${selected.length} of 3 choices selected.`
                  : phase === "result"
                    ? "Memory sample complete."
                    : "Ready to begin the memory sample."}
            </div>

            {phase === "intro" && (
              <div className="memory-preview__screen">
                <div className="memory-preview__intro-mark" aria-hidden="true">3</div>
                <h3>Three items. One short pause. Then choose what you remember.</h3>
                <p>
                  The items stay on screen for five seconds. After that, select
                  them from a short list.
                </p>
                <div className="memory-preview__button-row">
                  <button type="button" className="memory-preview__primary" onClick={start}>
                    Start memory sample
                  </button>
                </div>
              </div>
            )}

            {phase === "study" && (
              <div className="memory-preview__screen">
                <h3>Take a moment to remember these.</h3>
                <div className="memory-preview__items">
                  {MEMORY_ITEMS.map((item, index) => (
                    <div className="memory-preview__item" key={item}>
                      <span>Item {index + 1}</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
                <p className="memory-preview__note">The choices will appear in a few seconds.</p>
                <div className="memory-preview__button-row">
                  <button type="button" className="memory-preview__secondary" onClick={() => setUserPaused((value) => !value)}>
                    {userPaused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            )}

            {phase === "recall" && (
              <div className="memory-preview__screen">
                <h3>Which three items did you just see?</h3>
                <p>Choose three. You can change a choice before you finish.</p>
                <div className="memory-preview__choices">
                  {MEMORY_CHOICES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="memory-preview__choice"
                      aria-pressed={selected.includes(item)}
                      onClick={() => chooseItem(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="memory-preview__note">{selected.length} of 3 selected</p>
              </div>
            )}

            {phase === "result" && (
              <div className="memory-preview__screen">
                <span className="memory-preview__kicker">Sample complete</span>
                <h3>Thanks for giving your memory a moment.</h3>
                <p>
                  The three items were keys, mug, and book. This was only a
                  playful preview, not a health measurement.
                </p>
                <div className="memory-preview__button-row">
                  <button type="button" className="memory-preview__primary" onClick={start}>
                    Try again
                  </button>
                  <button type="button" className="memory-preview__secondary" onClick={reset}>
                    Start over
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {phase === "result" && (
          <aside className="memory-preview__children" aria-labelledby="memory-preview-waitlist-heading">
            <h3 id="memory-preview-waitlist-heading">
              Want your full Remembrance Score? Join the waitlist.
            </h3>
            {children && <div className="memory-preview__children-content">{children}</div>}
          </aside>
        )}

        <p className="memory-preview__disclaimer">
          Remembrance is a wellness and brain-health tool. This mini activity is
          for exploration only—not a medical assessment or a substitute for care
          from a qualified professional.
        </p>
      </div>
    </section>
  );
}