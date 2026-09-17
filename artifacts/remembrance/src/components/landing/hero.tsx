import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { ScoreOrb } from './score-orb';
import { WaitlistForm } from './waitlist-form';

export function Hero() {
  const reducedMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center pt-24 pb-12 px-6 overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-cyan/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-navy/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      <div className="container mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-24 items-center flex-1">
        {/* Mobile: Orb on top */}
        <div className="order-1 lg:order-2 flex justify-center lg:justify-end lg:pr-12">
          <motion.div
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <ScoreOrb targetScore={84} size="large" />
          </motion.div>
        </div>

        <motion.div 
          className="order-2 lg:order-1 space-y-8 max-w-2xl z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold text-navy leading-[1.1] tracking-tight"
          >
            Know how your brain is doing. <br className="hidden lg:block" />
            <span className="text-cyan">Before you ever have to wonder.</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-navy/70 leading-relaxed font-medium"
          >
            Remembrance helps you understand, track, and support your brain health — a few minutes a week, from home.
          </motion.p>
          
          <motion.div variants={itemVariants} className="pt-4" id="waitlist-cta">
            <WaitlistForm location="hero" />
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
}
