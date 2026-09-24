import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BRAIN_DOMAINS } from '@/lib/brain-domains';
import { BRAIN_PALETTE } from '@/lib/brain-palette';
import './brain-explorer.css';

function BrainImage() {
  return (
    <img
      className="pentagon-brain-image"
      src={`${import.meta.env.BASE_URL}models/brain-poster.png`}
      alt=""
      aria-hidden="true"
    />
  );
}

export function BrainExplorer() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const firstDomainRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const activeDomain = activeIndex === null ? null : BRAIN_DOMAINS[activeIndex];
  const selectedIndex = activeIndex ?? 0;

  useEffect(() => {
    if (activeDomain && detailRef.current) {
      detailRef.current.focus({ preventScroll: true });
    }
  }, [activeIndex, activeDomain]);

  const selectDomain = (index: number) => {
    setActiveIndex(index);
  };

  const changeDomain = (direction: number) => {
    const current = activeIndex ?? 0;
    selectDomain((current + direction + BRAIN_DOMAINS.length) % BRAIN_DOMAINS.length);
  };

  const returnToOverview = () => {
    setActiveIndex(null);
    requestAnimationFrame(() => firstDomainRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className="brain-explorer">
      <section className="pentagon-shell" aria-labelledby="pentagon-title">
        <header
          className={`pentagon-header pentagon-reveal-header ${activeDomain ? 'is-detail' : ''}`}
          aria-hidden={Boolean(activeDomain)}
        >
          <div>
            <p className="pentagon-kicker pentagon-reveal-copy pentagon-reveal-copy--one">Explore the five areas</p>
            <h2 className="pentagon-title pentagon-reveal-copy pentagon-reveal-copy--two" id="pentagon-title">
              Brain Regions &amp; Wellness
            </h2>
            <p className="pentagon-intro pentagon-reveal-copy pentagon-reveal-copy--three">
              Select an area to discover how your brain supports your daily activities.
            </p>
            <p className="pentagon-note pentagon-reveal-copy pentagon-reveal-copy--four">
              The illustrative colors represent functional learning zones, not exact anatomical boundaries.
            </p>
          </div>
        </header>

        <section className={`pentagon-stage ${activeDomain ? 'is-detail' : ''}`} aria-label="Brain domain explorer">
          {BRAIN_DOMAINS.map((domain, index) => {
            const palette = BRAIN_PALETTE[index];
            return (
              <button
                ref={index === 0 ? firstDomainRef : undefined}
                className={`pentagon-card pentagon-card--${domain.id} pentagon-card--reveal-${index + 1}`}
                key={domain.id}
                type="button"
                onClick={() => selectDomain(index)}
                aria-hidden={Boolean(activeDomain)}
                tabIndex={activeDomain ? -1 : 0}
                style={{ '--domain-color': palette.color } as CSSProperties}
                data-testid={`button-pentagon-domain-${domain.id}`}
              >
                <span className="pentagon-card__eyebrow">
                  <span className="pentagon-card__dot" aria-hidden="true" />
                  {String(index + 1).padStart(2, '0')} / Wellness area
                </span>
                <h3>{domain.title}</h3>
                <p>{domain.summary}</p>
              </button>
            );
          })}

          {activeDomain ? (
            <button
              className="pentagon-brain-button"
              type="button"
              aria-label="Return to the five domain overview"
              onClick={returnToOverview}
              data-testid="button-return-to-overview-brain"
            >
              <BrainImage />
              <span className="pentagon-brain-caption">Back to five areas</span>
            </button>
          ) : (
            <div
              className="pentagon-brain-button pentagon-brain-button--reveal"
              role="img"
              aria-label="Illustrative brain image"
              data-testid="image-whole-brain"
            >
              <BrainImage />
              <span className="pentagon-brain-caption">Choose an area to explore</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeDomain && (
              <motion.section
                className="pentagon-detail"
                ref={detailRef}
                tabIndex={-1}
                aria-labelledby="pentagon-detail-title"
                data-testid="panel-brain-domain-detail"
                initial={{ opacity: 0, y: reducedMotion ? 0 : 34, scale: reducedMotion ? 1 : 0.965 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reducedMotion ? 0 : 12, scale: reducedMotion ? 1 : 0.99 }}
                transition={{
                  delay: reducedMotion ? 0 : 0.56,
                  duration: reducedMotion ? 0 : 0.62,
                  ease: [0.16, 0.84, 0.22, 1],
                }}
              >
                <motion.div
                  className="pentagon-detail__top"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 0.78,
                    duration: reducedMotion ? 0 : 0.42,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  <div>
                    <p className="pentagon-kicker">Domain {String(selectedIndex + 1).padStart(2, '0')}</p>
                    <h3 id="pentagon-detail-title">{activeDomain.title}</h3>
                  </div>
                  <button
                    className="pentagon-action"
                    type="button"
                    onClick={returnToOverview}
                    data-testid="button-back-to-brain"
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> Back to whole brain
                  </button>
                </motion.div>
                <motion.p
                  className="pentagon-detail__summary"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 0.9,
                    duration: reducedMotion ? 0 : 0.4,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  {activeDomain.summary}
                </motion.p>
                <motion.p
                  className="pentagon-detail__body"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 1.02,
                    duration: reducedMotion ? 0 : 0.42,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  {activeDomain.explanation}
                </motion.p>
                <motion.div
                  className="pentagon-detail__columns"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 1.16,
                    duration: reducedMotion ? 0 : 0.46,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  <div className="pentagon-detail__tile">
                    <h4>Everyday life</h4>
                    <p>{activeDomain.everyday}</p>
                  </div>
                  <div
                    className="pentagon-detail__tile"
                    style={{
                      borderColor: `${BRAIN_PALETTE[selectedIndex].color}90`,
                      background: `${BRAIN_PALETTE[selectedIndex].color}35`,
                    }}
                  >
                    <h4>Try this</h4>
                    <p>{activeDomain.tryIt}</p>
                  </div>
                </motion.div>
                <motion.p
                  className="pentagon-detail__body pentagon-detail__context"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: reducedMotion ? 0 : 1.3,
                    duration: reducedMotion ? 0 : 0.38,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  {activeDomain.context}
                </motion.p>
                <motion.footer
                  className="pentagon-detail__footer"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reducedMotion ? 0 : 1.4,
                    duration: reducedMotion ? 0 : 0.42,
                    ease: [0.16, 0.84, 0.22, 1],
                  }}
                >
                  <button
                    className="pentagon-action"
                    type="button"
                    onClick={() => changeDomain(-1)}
                    aria-label="Previous domain"
                    data-testid="button-prev-domain"
                  >
                    <ArrowLeft size={14} aria-hidden="true" /> Previous
                  </button>
                  <nav className="pentagon-detail__nav" aria-label="Navigate between brain domains">
                    {BRAIN_DOMAINS.map((domain, index) => (
                      <button
                        className="pentagon-action"
                        key={domain.id}
                        type="button"
                        aria-label={`Go to ${domain.title}`}
                        aria-pressed={index === selectedIndex}
                        onClick={() => selectDomain(index)}
                        style={{ '--domain-color': BRAIN_PALETTE[index].color } as CSSProperties}
                        data-testid={`button-jump-domain-${domain.id}`}
                      >
                        {domain.title}
                      </button>
                    ))}
                  </nav>
                  <button
                    className="pentagon-action"
                    type="button"
                    onClick={() => changeDomain(1)}
                    aria-label="Next domain"
                    data-testid="button-next-domain"
                  >
                    Next <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </motion.footer>
              </motion.section>
            )}
          </AnimatePresence>
        </section>
      </section>
    </div>
  );
}