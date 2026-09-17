import React from 'react';
import { useLocation, useParams } from 'wouter';
import { DomainKey, useDemoState } from '@/lib/store';
import { ArrowLeft, Activity, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOMAIN_INFO: Record<DomainKey, { name: string; desc: string; tip: string }> = {
  attention: {
    name: 'Attention',
    desc: 'Staying focused on the task at hand and processing information without getting distracted.',
    tip: 'Try taking a short, screen-free pause between activities and notice what helps you settle into the next task.',
  },
  executive: {
    name: 'Executive Function',
    desc: 'Planning ahead, following multi-step instructions, and shifting your thinking when plans change.',
    tip: 'Writing a short list and breaking a larger task into smaller steps can make a busy day feel more manageable.',
  },
  memory: {
    name: 'Memory',
    desc: 'Taking in new information, holding onto it, and recalling it later when you need it.',
    tip: 'When meeting someone new, try repeating their name and connecting it with a detail from the conversation.',
  },
  language: {
    name: 'Language',
    desc: 'Finding words, understanding sentences, and expressing yourself clearly.',
    tip: 'Reading something interesting or sharing a story with a friend can be a pleasant way to practice word finding.',
  },
  motor: {
    name: 'Perpetual Motor',
    desc: 'Translating what you see into precise physical movements, such as drawing or navigating space.',
    tip: 'A familiar activity that combines movement and attention, such as dancing or gardening, may be an enjoyable choice.',
  },
};

export default function DomainDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { state } = useDemoState();

  const domainId: DomainKey = DOMAIN_INFO[id as DomainKey] ? (id as DomainKey) : 'memory';
  const info = DOMAIN_INFO[domainId];
  const score = state.scores.domains[domainId];
  const domainSnapshots = state.scoreHistory
    .filter((snapshot) => snapshot.domains[domainId] !== null)
    .map((snapshot) => ({
      value: snapshot.domains[domainId] as number,
      timestamp: snapshot.timestamp,
    }));
  const trend = domainSnapshots;
  const analysis = score === null
    ? `There is no recorded ${info.name.toLowerCase()} snapshot yet. Complete the baseline or a weekly check-in to see your own history here.`
    : `Your latest recorded ${info.name.toLowerCase()} snapshot is ${score}/20. This is one point in your personal demo history; returning to this area over time lets you notice how your recorded results change.`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 text-navy hover:bg-navy/5 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold text-navy flex-1">{info.name}</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-lg text-navy/70 font-medium leading-relaxed">{info.desc}</p>

        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-cyan/10 rounded-full flex items-center justify-center text-cyan mb-2">
            <Activity />
          </div>
          <h2 className="text-sm font-bold text-navy/50 uppercase tracking-wider">Latest recorded score</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-extrabold text-navy tracking-tighter">{score === null ? '—' : score}</span>
            <span className="text-2xl text-navy/40 font-bold">/20</span>
          </div>
          <div className="w-full max-w-xs mt-4">
            <div className="h-3 w-full bg-navy/10 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-cyan rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${score === null ? 0 : (score / 20) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold text-navy/40">
              <span>0</span>
              <span>20</span>
            </div>
          </div>
          <p className="text-xs text-navy/45 font-medium">Demo result for personal tracking; not a clinical measurement.</p>
        </div>

        <div className="bg-navy rounded-3xl p-6 text-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-cyan font-bold uppercase tracking-wider text-xs">
            <Info size={16} /> A note about this snapshot
          </div>
          <p className="text-white/90 leading-relaxed font-medium">{analysis}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-navy">Recorded trend</h3>
            <p className="text-xs text-navy/50 font-medium mt-1">Only completed snapshots are shown.</p>
          </div>
          {trend.length > 0 ? (
            <div className="h-32 flex items-end gap-2 pt-4">
              {trend.map((point, index) => (
                <div key={`${point.timestamp}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className={`w-full max-w-[40px] rounded-t-lg ${index === trend.length - 1 ? 'bg-cyan' : 'bg-navy/10'}`}
                    style={{ height: `${Math.max(8, (point.value / 20) * 100)}%` }}
                    title={`${point.value}/20`}
                  />
                  <span className="text-xs font-bold text-navy/40">R{index + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy/55 font-medium py-8 text-center">No completed snapshots yet.</p>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
          <h3 className="font-bold text-navy mb-4">Related guidance</h3>
          <div className="p-4 bg-cyan/5 border border-cyan/20 rounded-2xl flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-cyan flex-shrink-0 shadow-sm mt-1">
              <ChevronRight size={16} strokeWidth={3} />
            </div>
            <p className="text-navy font-medium leading-relaxed text-sm">{info.tip}</p>
          </div>
        </div>

        <Button
          onClick={() => setLocation('/dashboard')}
          className="w-full h-14 bg-navy hover:bg-navy/90 text-white rounded-2xl font-bold text-lg"
        >
          Back to dashboard
        </Button>
      </main>
    </div>
  );
}