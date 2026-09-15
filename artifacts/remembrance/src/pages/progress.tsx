import React from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { ArrowLeft, TrendingUp, Award, Brain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Progress() {
  const [, setLocation] = useLocation();
  const { state } = useDemoState();
  
  // For demo purposes, mock a "previous" score to show the delta
  const currentComposite = state.scores.composite || 84;
  const previousComposite = currentComposite - 3;
  
  const currentDomains = state.scores.domains;
  const previousDomains = {
    attention: (currentDomains.attention || 16) - 1,
    executive: (currentDomains.executive || 15),
    memory: (currentDomains.memory || 17) + 1,
    language: (currentDomains.language || 18),
    motor: (currentDomains.motor || 15) - 2,
  };

  const delta = currentComposite - previousComposite;

  return (
    <div className="min-h-screen bg-navy text-white pb-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => setLocation('/dashboard')} className="p-2 -ml-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold flex-1">Cycle Complete</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-10 animate-in fade-in duration-700 relative z-10">
        
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Since your last round of testing...</h1>
          <p className="text-lg text-white/70 font-medium">You've completed all five areas. Here is how your Remembrance Score has moved.</p>
        </div>

        {/* Hero Score Delta */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan to-transparent opacity-50" />
          
          <h2 className="text-sm font-bold text-cyan uppercase tracking-wider mb-6">Remembrance Score</h2>
          
          <div className="flex items-center justify-center gap-6 md:gap-12 w-full">
            <div className="space-y-2">
              <span className="text-white/40 font-bold uppercase text-xs tracking-wider">Previous</span>
              <div className="text-4xl md:text-5xl font-extrabold text-white/50">{previousComposite}</div>
            </div>
            
            <div className="flex flex-col items-center justify-center -mt-2">
              <div className="w-12 h-12 rounded-full bg-cyan/20 text-cyan flex items-center justify-center shadow-[0_0_20px_rgba(27,206,223,0.3)]">
                {delta > 0 ? <TrendingUp /> : <ChevronRight />}
              </div>
              <span className="text-cyan font-bold mt-2">+{delta}</span>
            </div>

            <div className="space-y-2">
              <span className="text-cyan font-bold uppercase text-xs tracking-wider">Current</span>
              <div className="text-5xl md:text-6xl font-extrabold">{currentComposite}</div>
            </div>
          </div>
        </div>

        {/* Encouraging summary line */}
        <div className="flex items-start gap-4 p-5 bg-cyan/10 border border-cyan/20 rounded-2xl">
          <Award className="text-cyan shrink-0 mt-1" />
          <p className="text-white/90 font-medium leading-relaxed">
            Beautiful progress. Your consistency with your aerobic and sleep goals over the last 5 weeks appears to be paying off, particularly in your coordination scores.
          </p>
        </div>

        {/* Domain Comparison */}
        <div className="space-y-6">
          <h3 className="font-bold text-xl">Areas in detail</h3>
          
          <div className="space-y-3">
            {[
              { id: 'attention', name: 'Attention' },
              { id: 'executive', name: 'Executive Function' },
              { id: 'memory', name: 'Memory' },
              { id: 'language', name: 'Language' },
              { id: 'motor', name: 'Coordination' },
            ].map(domain => {
              const current = currentDomains[domain.id as keyof typeof currentDomains] || 16;
              const prev = previousDomains[domain.id as keyof typeof previousDomains] || 16;
              const diff = current - prev;
              
              return (
                <div key={domain.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                      <Brain size={16} />
                    </div>
                    <span className="font-bold">{domain.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 font-bold">{prev}</span>
                    <span className="text-white/20">→</span>
                    <span className="font-extrabold text-lg">{current}</span>
                    <span className={`w-8 text-right text-xs font-bold ${diff > 0 ? 'text-cyan' : diff < 0 ? 'text-white/50' : 'text-white/20'}`}>
                      {diff > 0 ? `+${diff}` : diff < 0 ? diff : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 pb-4">
          <Button 
            onClick={() => setLocation('/dashboard')}
            className="w-full h-16 text-xl bg-cyan hover:bg-cyan/90 text-navy font-extrabold rounded-2xl shadow-[0_0_30px_rgba(27,206,223,0.2)] hover-elevate transition-all"
          >
            Start Next Cycle
          </Button>
        </div>
      </main>
    </div>
  );
}
