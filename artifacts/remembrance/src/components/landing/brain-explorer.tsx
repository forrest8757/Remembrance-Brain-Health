import React, { useState } from 'react';
import { BrainVisualization } from '@/components/brain-viz';
import { motion, AnimatePresence } from 'framer-motion';

const DOMAINS = [
  {
    title: "Attention",
    desc: "Staying focused and thinking quickly.",
  },
  {
    title: "Executive Function",
    desc: "Planning, organizing, and solving problems.",
  },
  {
    title: "Memory",
    desc: "Learning and recalling new things.",
  },
  {
    title: "Language",
    desc: "Finding words and understanding.",
  },
  {
    title: "Coordination",
    desc: "Visual and spatial awareness. (Perceptual-Motor, in plain terms.)",
  }
];

export function BrainExplorer() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-border">
      {/* Interactive Visualization */}
      <div className="relative">
        <BrainVisualization 
          activeSector={activeIdx} 
          onSectorClick={setActiveIdx}
          onSectorHover={setActiveIdx}
          className="max-w-[400px] w-full mx-auto" 
        />
        <p className="text-center text-sm text-navy/50 font-medium mt-6 lg:hidden">
          Tap an area to explore
        </p>
      </div>

      {/* Content Panel */}
      <div className="flex flex-col gap-4">
        {DOMAINS.map((domain, i) => {
          const isActive = activeIdx === i;
          return (
            <button
              key={domain.title}
              onClick={() => setActiveIdx(i)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`text-left p-6 rounded-2xl transition-all duration-300 relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-cyan ${
                isActive 
                  ? 'bg-cyan/10 border-cyan/20 border shadow-inner' 
                  : 'bg-cream/30 border-transparent border hover:bg-cream/60'
              }`}
              aria-pressed={isActive}
            >
              <h3 className={`text-xl font-bold font-display transition-colors ${isActive ? 'text-navy' : 'text-navy/60'}`}>
                {domain.title}
              </h3>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-navy/80 mt-2 font-medium text-lg">
                      {domain.desc}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Subtle active indicator line */}
              {isActive && (
                <motion.div 
                  layoutId="activeDomainLine"
                  className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
