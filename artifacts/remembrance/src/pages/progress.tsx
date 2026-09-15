import React from 'react';
import { useLocation } from 'wouter';
import { useDemoState, DomainKey } from '@/lib/store';
import { ArrowLeft, Award, Brain, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOMAINS: { id: DomainKey; name: string }[] = [
  { id: 'attention', name: 'Attention' },
  { id: 'executive', name: 'Executive Function' },
  { id: 'memory', name: 'Memory' },
  { id: 'language', name: 'Language' },
  { id: 'motor', name: 'Coordination' },
];

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

export default function Progress() {
  const [, setLocation] = useLocation();
  const { state } = useDemoState();
  const cycle = state.completedCycles[state.completedCycles.length - 1];
  const currentComposite = state.scores.composite;

  return (
    <div className="min-h-screen bg-navy text-white pb-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => setLocation('/dashboard')} className="p-2 -ml-2 text-white/70 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold flex-1">{cycle ? 'Round Complete' : 'Progress'}</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-10 animate-in fade-in duration-700 relative z-10">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">
            {cycle ? 'Since your last completed round of testing…' : 'Your recorded progress'}
          </h1>
          <p className="text-lg text-white/70 font-medium">
            {cycle
              ? 'You completed all five areas. Here is a comparison of the two recorded snapshots.'
              : 'A full comparison becomes available after each of the five areas has been completed once.'}
          </p>
        </div>

        {cycle ? (
          <>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center text-center">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan to-transparent opacity-50" />
              <h2 className="text-sm font-bold text-cyan uppercase tracking-wider mb-6">Remembrance Score</h2>
              <div className="flex items-center justify-center gap-6 md:gap-12 w-full">
                <div className="space-y-2">
                  <span className="text-white/40 font-bold uppercase text-xs tracking-wider">Previous</span>
                  <div className="text-4xl md:text-5xl font-extrabold text-white/50">{cycle.compositeBefore}</div>
                </div>
                <div className="flex flex-col items-center justify-center -mt-2">
                  <div className="w-12 h-12 rounded-full bg-cyan/20 text-cyan flex items-center justify-center">
                    <ChevronRight />
                  </div>
                  <span className="text-cyan font-bold mt-2">{signed(cycle.compositeAfter - cycle.compositeBefore)}</span>
                </div>
                <div className="space-y-2">
                  <span className="text-cyan font-bold uppercase text-xs tracking-wider">Current</span>
                  <div className="text-5xl md:text-6xl font-extrabold">{cycle.compositeAfter}</div>
                </div>
              </div>
              <p className="text-white/40 text-xs font-medium mt-6">
                Recorded {new Date(cycle.completedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-start gap-4 p-5 bg-cyan/10 border border-cyan/20 rounded-2xl">
              <Award className="text-cyan shrink-0 mt-1" />
              <p className="text-white/90 font-medium leading-relaxed">{cycle.takeaway}</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-xl">Areas in detail</h3>
                <p className="text-white/45 text-sm font-medium mt-1">Each comparison comes directly from a saved snapshot.</p>
              </div>
              <div className="space-y-3">
                {DOMAINS.map((domain) => {
                  const previous = cycle.domainScoresBefore[domain.id];
                  const current = cycle.domainScoresAfter[domain.id];
                  const diff = (current as number) - (previous as number);
                  return (
                    <div key={domain.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                          <Brain size={16} />
                        </div>
                        <span className="font-bold">{domain.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 font-bold">{previous}</span>
                        <span className="text-white/20">→</span>
                        <span className="font-extrabold text-lg">{current}</span>
                        <span className={`w-8 text-right text-xs font-bold ${diff > 0 ? 'text-cyan' : 'text-white/45'}`}>
                          {signed(diff)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-5">
              <Brain className="text-cyan" />
            </div>
            <h2 className="text-xl font-bold">Keep going at your pace.</h2>
            <p className="text-white/65 font-medium mt-3">
              Your latest recorded score is {currentComposite === null ? 'not available yet' : `${currentComposite}/100`}.
              Complete the remaining areas to create your first round comparison.
            </p>
          </div>
        )}

        <p className="text-white/40 text-xs text-center font-medium">
          Demo results are simulated for wellness tracking. This report describes recorded snapshots and does not provide clinical interpretation.
        </p>

        <div className="pt-4 pb-4">
          <Button
            onClick={() => setLocation('/dashboard')}
            className="w-full h-16 text-xl bg-cyan hover:bg-cyan/90 text-navy font-extrabold rounded-2xl shadow-[0_0_30px_rgba(27,206,223,0.2)] hover-elevate transition-all"
          >
            {cycle ? 'Start Next Cycle' : 'Back to dashboard'}
          </Button>
        </div>
      </main>
    </div>
  );
}