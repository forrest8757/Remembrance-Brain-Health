import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';

const steps = [
  {
    num: "01",
    title: "Take your baseline",
    desc: "One easy assessment across five key areas of brain health gives you your starting point: your Remembrance Score."
  },
  {
    num: "02",
    title: "Check in weekly",
    desc: "A few minutes a week. Each week focuses on one area of your brain, through quick, interactive activities and a short voice check."
  },
  {
    num: "03",
    title: "Get your plan & track progress",
    desc: "Personalized guidance built around you — and a full re-score every five weeks so you can actually see your progress."
  }
];

export function Stepper() {
  const reducedMotion = useReducedMotion();
  
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="relative grid md:grid-cols-3 gap-8 md:gap-12"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Connecting line on desktop */}
      <div className="hidden md:block absolute top-8 left-12 right-12 h-px bg-border z-0">
        <motion.div 
          className="h-full bg-cyan"
          initial={{ width: "0%" }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
        />
      </div>

      {steps.map((step, i) => (
        <motion.div 
          key={step.num} 
          variants={itemVariants}
          className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group"
        >
          <div className="w-16 h-16 rounded-full bg-white border-2 border-border flex items-center justify-center mb-6 group-hover:border-cyan group-hover:shadow-[0_0_20px_rgba(27,206,223,0.3)] transition-all duration-500 relative">
            <span className="text-xl font-bold text-navy">{step.num}</span>
            <div className="absolute inset-0 rounded-full bg-cyan scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-10 transition-transform duration-500 ease-out" />
          </div>
          
          <h3 className="text-2xl font-semibold text-navy mb-4 font-display">{step.title}</h3>
          <p className="text-lg text-navy/70 leading-relaxed font-medium">{step.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
