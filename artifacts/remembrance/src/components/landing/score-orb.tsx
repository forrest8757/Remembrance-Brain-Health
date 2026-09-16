import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { BrainVisualization } from '@/components/brain-viz';

export function ScoreOrb({ 
  targetScore = 84, 
  size = "large" 
}: { 
  targetScore?: number;
  size?: "small" | "large";
}) {
  const [score, setScore] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setScore(targetScore);
      return;
    }
    
    let startTime: number;
    const duration = 2000;
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      // Easing out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setScore(Math.floor(ease * targetScore));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [inView, targetScore, reducedMotion]);

  const sizeClasses = size === "large" 
    ? "w-64 h-64 md:w-80 md:h-80" 
    : "w-40 h-40 md:w-48 md:h-48";

  const numClasses = size === "large"
    ? "text-6xl md:text-7xl font-sans font-bold text-cream"
    : "text-4xl md:text-5xl font-sans font-bold text-cream";

  return (
    <div ref={ref} className={`relative flex items-center justify-center ${sizeClasses}`}>
      {/* Outer Glow Bloom */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-cyan/20 blur-2xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 0.6, scale: 1.1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      
      {/* Orb Base */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-navy to-[#18536f] shadow-2xl overflow-hidden border border-cyan/10 flex items-center justify-center">
        {/* Faint five sectors orbiting inside */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
          animate={!reducedMotion ? { rotate: 360, scale: [1, 1.05, 1] } : {}}
          transition={{ 
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="w-[120%] h-[120%] text-cyan/20 fill-cyan/10">
             <BrainVisualization activeSector={null} />
          </div>
        </motion.div>
        
        {/* Animated Orbits/Light */}
        {!reducedMotion && (
          <>
            <motion.div 
              className="absolute top-1/4 left-1/4 w-full h-full bg-cyan/10 rounded-full blur-xl"
              animate={{ 
                x: ["-10%", "10%", "-10%"],
                y: ["-10%", "10%", "-10%"],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-1/4 right-1/4 w-full h-full bg-cyan/20 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            {/* Soft inner ring */}
            <div className="absolute inset-2 rounded-full border border-cream/5" />
          </>
        )}
      </div>

      {/* Score */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={!reducedMotion ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={numClasses}
        >
          {score}
        </motion.div>
        <div className="text-cyan/80 text-sm md:text-base font-semibold tracking-widest uppercase mt-1">
          Remembrance
        </div>
        <div className="mt-2 text-xs font-medium text-white/90">
          Sample score · out of 100
        </div>
      </div>
    </div>
  );
}
