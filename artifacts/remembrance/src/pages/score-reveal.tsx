import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { BrainVisualization } from '@/components/brain-viz';

export default function ScoreReveal() {
  const [, setLocation] = useLocation();
  const { state } = useDemoState();
  const targetScore = state.scores.composite || 81;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    const increment = targetScore / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setDisplayScore(targetScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetScore]);

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan/20 blur-[150px] rounded-full pointer-events-none" />

      <div className="z-10 text-center space-y-12 max-w-md w-full animate-in fade-in duration-1000 slide-in-from-bottom-8">
        
        <div className="space-y-4">
          <p className="text-cyan font-bold tracking-widest uppercase text-sm">Your Baseline is Set</p>
          <h1 className="text-4xl font-bold tracking-tight">Remembrance Score</h1>
        </div>

        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          <BrainVisualization activeSector={null} className="absolute inset-0 scale-150" />
          <div className="absolute inset-8 rounded-full bg-cyan/10 backdrop-blur-sm border border-cyan/50 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(27,206,223,0.3)] z-20">
            <span className="text-7xl font-extrabold text-white tracking-tighter">
              {displayScore}
            </span>
            <span className="text-xl font-bold text-white/50">/100</span>
          </div>
        </div>

        <div className="space-y-8 animate-in fade-in duration-1000 delay-500 fill-mode-both">
          <p className="text-2xl text-white/90 font-medium">
            You're off to a strong start.
          </p>
          <p className="text-white/60">
            A great baseline to build from. Now let's see what you can do to support it.
          </p>
          
          <Button 
            onClick={() => setLocation('/dashboard')}
            className="w-full h-16 text-xl bg-cyan hover:bg-cyan/90 text-navy font-extrabold rounded-2xl shadow-[0_0_30px_rgba(27,206,223,0.4)] hover-elevate transition-all group mt-8"
          >
            See my dashboard
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

      </div>
    </div>
  );
}
