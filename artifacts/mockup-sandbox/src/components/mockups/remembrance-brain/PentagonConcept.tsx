import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { BRAIN_DOMAINS } from './brain-domains';
import { BRAIN_PALETTE } from './brain-palette';
import './_group.css';
import './PentagonConcept.css';

const BRAIN_POSTERS = ['attention', 'executive', 'memory', 'language', 'motor'] as const;

function BrainImage({ activeIndex }: { activeIndex: number | null }) {
  const poster = activeIndex === null ? 'brain-poster.png' : `brain-focus-${BRAIN_POSTERS[activeIndex]}.png`;
  return (
    <img
      className="pentagon-brain-image"
      src={`/__mockup/images/remembrance-brain/${poster}`}
      alt=""
      aria-hidden="true"
    />
  );
}

export function PentagonConcept() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [immersive, setImmersive] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const brainButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const activeDomain = activeIndex === null ? null : BRAIN_DOMAINS[activeIndex];
  const selectedIndex = activeIndex ?? 0;

  useEffect(() => {
    if (activeDomain && detailRef.current) {
      detailRef.current.focus({ preventScroll: true });
      detailRef.current.scrollIntoView({
        behavior: reducedMotion ? 'instant' : 'smooth',
        block: 'start',
      });
    }
  }, [activeIndex, activeDomain, reducedMotion]);

  const selectDomain = (index: number) => {
    setActiveIndex(index);
    setImmersive(false);
  };

  const changeDomain = (direction: number) => {
    const current = activeIndex ?? 0;
    selectDomain((current + direction + BRAIN_DOMAINS.length) % BRAIN_DOMAINS.length);
  };

  const returnToOverview = () => {
    setActiveIndex(null);
    stageRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    requestAnimationFrame(() => brainButtonRef.current?.focus({ preventScroll: true }));
  };

  return (
    <main className="pentagon-concept">
      <section className="pentagon-shell" aria-labelledby="pentagon-title">
        <header className="pentagon-header">
          <div>
            <p className="pentagon-kicker">Explore the five areas</p>
            <h1 className="pentagon-title" id="pentagon-title">Brain Regions & Wellness</h1>
            <p className="pentagon-intro">
              Select an area to discover how your brain supports your daily activities.
            </p>
            <p className="pentagon-note">The illustrative colors represent functional learning zones, not exact anatomical boundaries.</p>
          </div>
        </header>

        <section ref={stageRef} className={`pentagon-stage ${immersive ? 'is-immersive' : ''}`} aria-label="Brain domain explorer">
          <AnimatePresence>
            {immersive && (
              <motion.p
                className="pentagon-immersive-label"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0 : 0.25 }}
              >
                Immersive brain view · tap to return
              </motion.p>
            )}
          </AnimatePresence>

          {immersive && (
            <button className="pentagon-action pentagon-close" type="button" onClick={() => setImmersive(false)}>
              <RotateCcw size={14} aria-hidden="true" /> Return to domains
            </button>
          )}

          {BRAIN_DOMAINS.map((domain, index) => {
            const palette = BRAIN_PALETTE[index];
            return (
              <button
                className={`pentagon-card pentagon-card--${domain.id}`}
                key={domain.id}
                type="button"
                onClick={() => selectDomain(index)}
                aria-hidden={immersive}
                tabIndex={immersive ? -1 : 0}
                style={{ '--domain-color': palette.color } as React.CSSProperties}
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

          <button
            ref={brainButtonRef}
            className="pentagon-brain-button"
            type="button"
            aria-label={immersive ? 'Return to the domain overview' : 'Enlarge the brain into immersive focus mode'}
            aria-pressed={immersive}
            onClick={() => setImmersive((value) => !value)}
          >
            <BrainImage activeIndex={activeIndex} />
            <span className="pentagon-brain-caption">{immersive ? 'Return to overview' : 'Enter focus mode'}</span>
          </button>
        </section>

        <AnimatePresence mode="wait">
          {activeDomain && (
            <motion.section
              className="pentagon-detail"
              ref={detailRef}
              tabIndex={-1}
              aria-labelledby="pentagon-detail-title"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
            >
              <div className="pentagon-detail__top">
                <div>
                  <p className="pentagon-kicker">Domain {String(selectedIndex + 1).padStart(2, '0')}</p>
                  <h2 id="pentagon-detail-title">{activeDomain.title}</h2>
                </div>
                <button className="pentagon-action" type="button" onClick={returnToOverview}>
                  <ArrowLeft size={14} aria-hidden="true" /> Back to whole brain
                </button>
              </div>
              <p className="pentagon-detail__summary">{activeDomain.summary}</p>
              <p className="pentagon-detail__body">{activeDomain.explanation}</p>
              <div className="pentagon-detail__columns">
                <div className="pentagon-detail__tile">
                  <h3>Everyday life</h3>
                  <p>{activeDomain.everyday}</p>
                </div>
                <div className="pentagon-detail__tile" style={{ borderColor: `${BRAIN_PALETTE[selectedIndex].color}90`, background: `${BRAIN_PALETTE[selectedIndex].color}35` }}>
                  <h3>Try this</h3>
                  <p>{activeDomain.tryIt}</p>
                </div>
              </div>
              <p className="pentagon-detail__body" style={{ fontSize: '0.78rem', fontStyle: 'italic', marginTop: 18 }}>{activeDomain.context}</p>
              <footer className="pentagon-detail__footer">
                <button className="pentagon-action" type="button" onClick={() => changeDomain(-1)} aria-label="Previous domain">
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
                      style={{ '--domain-color': BRAIN_PALETTE[index].color } as React.CSSProperties}
                    >
                      {domain.title}
                    </button>
                  ))}
                </nav>
                <button className="pentagon-action" type="button" onClick={() => changeDomain(1)} aria-label="Next domain">
                  Next <ArrowRight size={14} aria-hidden="true" />
                </button>
              </footer>
            </motion.section>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}