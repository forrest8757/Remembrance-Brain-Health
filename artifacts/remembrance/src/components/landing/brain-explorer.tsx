import React, { useState, useRef, useEffect } from 'react';
import { BrainVisualization } from '@/components/brain-viz';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BRAIN_DOMAINS } from '@/lib/brain-domains';
import { ArrowLeft, ArrowRight, Sparkles, Sun } from 'lucide-react';

export function BrainExplorer() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [justSelected, setJustSelected] = useState(false);
  
  const reducedMotion = useReducedMotion();
  const activeDomain = activeIdx !== null ? BRAIN_DOMAINS[activeIdx] : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<'overview' | 'detail' | null>(null);

  const handleSelect = (idx: number | null) => {
    if ((activeIdx === null) !== (idx === null)) {
      pendingFocus.current = idx === null ? 'overview' : 'detail';
    }
    setActiveIdx(idx);
    setJustSelected(true);
  };

  useEffect(() => {
    if (justSelected) {
      setJustSelected(false);
      
      // Scroll management
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offset = 80; // approximate sticky header offset
        
        // Only scroll if top is above viewport (scrolled past it) or on mobile where content reflows heavily
        if (rect.top < offset || (window.innerWidth < 1024 && rect.bottom > window.innerHeight)) {
          window.scrollTo({
            top: window.scrollY + rect.top - offset,
            behavior: reducedMotion ? 'auto' : 'smooth'
          });
        }
      }
    }
  }, [justSelected, activeIdx, reducedMotion]);

  const transitionProps = {
    duration: reducedMotion ? 0 : 0.3
  };

  return (
    <div ref={containerRef} className="grid lg:grid-cols-2 gap-12 items-start bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border">
      {/* Interactive Visualization */}
      <div className="relative lg:sticky lg:top-24">
        <BrainVisualization
          activeSector={activeIdx}
          focusSector={activeIdx}
          showDomainControls={false}
          className="max-w-[400px] w-full mx-auto lg:mx-0 lg:ml-auto"
        />
        {activeIdx === null && (
          <p className="text-center text-sm text-navy/50 font-medium mt-6 lg:hidden">
            Select an area below to explore
          </p>
        )}
      </div>

      {/* Content Panel */}
      <div className="flex flex-col min-h-[550px]">
        <AnimatePresence mode="wait">
          {activeIdx === null || !activeDomain ? (
            <motion.div
              key="overview"
              ref={(node) => {
                overviewRef.current = node;
                // AnimatePresence mounts this after the outgoing panel exits.
                if (node && pendingFocus.current === 'overview') {
                  node.focus({ preventScroll: true });
                  pendingFocus.current = null;
                }
              }}
              tabIndex={-1}
              initial={{ opacity: 0, x: reducedMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reducedMotion ? 0 : -20 }}
              transition={transitionProps}
              className="flex flex-col gap-3 h-full justify-center outline-none"
            >
              <div className="mb-4">
                <h3 className="text-2xl font-display font-bold text-navy mb-2">Brain Regions & Wellness</h3>
                <p className="text-navy/70">Select an area to discover how your brain supports your daily activities.</p>
              </div>

              {BRAIN_DOMAINS.map((domain, i) => (
                <button
                  key={domain.id}
                  onClick={() => handleSelect(i)}
                  className="group text-left p-5 rounded-2xl transition-all duration-300 bg-cream/40 hover:bg-cyan/5 border border-transparent hover:border-cyan/20 focus-visible:ring-2 focus-visible:ring-cyan outline-none w-full"
                  data-testid={`button-domain-overview-${domain.id}`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h4 className="text-lg font-bold font-display text-navy mb-1 group-hover:text-cyan transition-colors">
                        {domain.title}
                      </h4>
                      <p className="text-sm text-navy/70 font-medium">
                        {domain.summary}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
                      <ArrowRight className="w-4 h-4 text-cyan" />
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reducedMotion ? 0 : 20 }}
              transition={transitionProps}
              className="flex flex-col h-full outline-none"
            >
              <button
                ref={(node) => {
                  backButtonRef.current = node;
                  if (node && pendingFocus.current === 'detail') {
                    node.focus({ preventScroll: true });
                    pendingFocus.current = null;
                  }
                }}
                onClick={() => handleSelect(null)}
                className="self-start text-sm font-bold text-navy/50 hover:text-navy flex items-center gap-2 mb-6 transition-colors focus-visible:ring-2 focus-visible:ring-cyan outline-none rounded-lg min-h-[44px] min-w-[44px] py-1 px-2 -ml-2"
                data-testid="button-back-to-brain"
              >
                <ArrowLeft className="w-4 h-4" /> Back to whole brain
              </button>

              <div className="flex-1">
                <div className="mb-6">
                  <h3 className="text-3xl md:text-4xl font-display font-bold text-navy mb-2">
                    {activeDomain.title}
                  </h3>
                  <p className="text-sm font-bold text-cyan uppercase tracking-widest">
                    {activeDomain.region}
                  </p>
                </div>

                <div className="space-y-6">
                  <p className="text-xl text-navy/90 font-medium leading-relaxed">
                    {activeDomain.summary}
                  </p>
                  <p className="text-navy/70 leading-relaxed">
                    {activeDomain.explanation}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div className="bg-white rounded-2xl p-5 border border-navy/5 shadow-sm">
                      <h4 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
                        <Sun className="w-4 h-4 text-cyan" /> Everyday life
                      </h4>
                      <p className="text-sm text-navy/70 leading-relaxed">{activeDomain.everyday}</p>
                    </div>

                    <div className="bg-cyan/10 rounded-2xl p-5 border border-cyan/10">
                      <h4 className="font-bold text-navy text-sm mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan" /> Try this
                      </h4>
                      <p className="text-sm text-navy/70 leading-relaxed">{activeDomain.tryIt}</p>
                    </div>
                  </div>

                  <p className="text-xs text-navy/50 italic leading-relaxed pt-2">
                    {activeDomain.context}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5 mt-8 pt-6 border-t border-navy/5">
                <div className="flex flex-wrap gap-2 justify-center">
                  {BRAIN_DOMAINS.map((domain, i) => (
                    <button
                      key={domain.id}
                      onClick={() => handleSelect(i)}
                      className={`flex items-center justify-center min-h-[44px] px-3 md:px-4 rounded-xl text-[11px] md:text-xs font-bold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan outline-none border ${
                        i === activeIdx 
                          ? 'bg-cyan text-navy shadow-sm border-cyan/50' 
                          : 'bg-navy/5 text-navy/70 hover:bg-navy/15 border-transparent hover:border-navy/10'
                      }`}
                      aria-label={`Go to ${domain.title}`}
                      aria-pressed={i === activeIdx}
                      data-testid={`button-jump-domain-${domain.id}`}
                    >
                      {domain.title}
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleSelect((activeIdx - 1 + BRAIN_DOMAINS.length) % BRAIN_DOMAINS.length)}
                    className="flex items-center justify-center gap-2 min-h-[44px] px-3 md:px-4 rounded-full hover:bg-navy/5 text-navy/60 hover:text-navy transition-colors focus-visible:ring-2 focus-visible:ring-cyan outline-none text-sm font-bold"
                    aria-label="Previous domain"
                    data-testid="button-prev-domain"
                  >
                    <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
                  </button>

                  <button
                    onClick={() => handleSelect((activeIdx + 1) % BRAIN_DOMAINS.length)}
                    className="flex items-center justify-center gap-2 min-h-[44px] px-3 md:px-4 rounded-full hover:bg-navy/5 text-navy/60 hover:text-navy transition-colors focus-visible:ring-2 focus-visible:ring-cyan outline-none text-sm font-bold"
                    aria-label="Next domain"
                    data-testid="button-next-domain"
                  >
                    <span className="hidden sm:inline">Next</span> <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
