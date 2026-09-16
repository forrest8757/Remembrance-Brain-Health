import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToWaitlist = () => {
    const el = document.getElementById('waitlist-cta');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (el) {
      el.scrollIntoView({ behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-cream/80 backdrop-blur-lg border-b border-navy/5 py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
          <button 
            onClick={() => {
              const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded"
          >
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
              Remembrance
            </span>
          </button>
          
          <div className="hidden md:flex items-center gap-10">
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-semibold text-navy/70 hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded px-2 py-1">
              How it works
            </button>
            <button onClick={() => scrollToSection('science')} className="text-sm font-semibold text-navy/70 hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded px-2 py-1">
              The Science
            </button>
            <button onClick={() => scrollToSection('areas')} className="text-sm font-semibold text-navy/70 hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded px-2 py-1">
              The 5 Areas
            </button>
            
            <AnimatePresence>
              {(
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                >
                  <Button 
                    onClick={scrollToWaitlist} 
                    className="bg-cyan hover:bg-cyan/90 text-navy font-bold rounded-full px-6 shadow-md transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan"
                  >
                    Join the waitlist
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <AnimatePresence>
              {(
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button 
                    onClick={scrollToWaitlist} 
                    size="sm"
                    className="bg-cyan hover:bg-cyan/90 text-navy font-bold rounded-full px-4 min-h-11 shadow-md"
                  >
                    Join
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              className="text-navy p-2 -mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded relative z-50" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-cream/95 backdrop-blur-xl pt-28 px-6 flex flex-col gap-6"
          >
            <button onClick={() => scrollToSection('how-it-works')} className="text-2xl font-display font-semibold text-navy py-4 border-b border-navy/10 text-left">
              How it works
            </button>
            <button onClick={() => scrollToSection('science')} className="text-2xl font-display font-semibold text-navy py-4 border-b border-navy/10 text-left">
              The Science
            </button>
            <button onClick={() => scrollToSection('areas')} className="text-2xl font-display font-semibold text-navy py-4 border-b border-navy/10 text-left">
              The 5 Areas
            </button>
            <div className="mt-8">
              <Button 
                onClick={scrollToWaitlist} 
                className="w-full py-8 text-xl bg-cyan hover:bg-cyan/90 text-navy font-bold rounded-2xl shadow-lg"
              >
                Join the waitlist
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
