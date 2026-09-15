import React from 'react';
import { useLocation, useParams } from 'wouter';
import { useDemoState } from '@/lib/store';
import { ArrowLeft, Activity, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOMAIN_INFO: Record<string, { name: string, desc: string, tip: string }> = {
  attention: { 
    name: "Attention", 
    desc: "Staying focused on the task at hand and processing information quickly without getting distracted.",
    tip: "Taking short, focused breaks without screens can help rebuild your attention reserves throughout the day."
  },
  executive: { 
    name: "Executive Function", 
    desc: "Planning ahead, following multi-step instructions, and shifting your thinking when rules change.",
    tip: "Playing strategy games or organizing complex tasks into smaller steps strengthens these networks."
  },
  memory: { 
    name: "Memory", 
    desc: "Encoding new information, holding onto it, and recalling it later when you need it.",
    tip: "Repeating new names out loud and connecting them to a visual image improves encoding."
  },
  language: { 
    name: "Language", 
    desc: "Finding the right words quickly, understanding complex sentences, and expressing yourself clearly.",
    tip: "Reading challenging material or discussing complex topics with friends helps maintain verbal fluency."
  },
  motor: { 
    name: "Coordination", 
    desc: "Translating what you see into precise physical movements, like drawing, building, or navigating space.",
    tip: "Activities that combine physical movement with mental focus, like dancing or table tennis, are great here."
  }
};

export default function DomainDetail() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { state } = useDemoState();
  
  const domainId = id as keyof typeof DOMAIN_INFO;
  const info = DOMAIN_INFO[domainId] || DOMAIN_INFO.memory;
  const score = state.scores.domains[domainId as keyof typeof state.scores.domains] || 16;
  
  // Scripted analysis based on score band for demo
  let analysis = "";
  if (score >= 17) analysis = `Your ${info.name.toLowerCase()} is looking very strong. You're processing information efficiently and accurately in this area. Keep up your current habits, as they seem to be serving you well.`;
  else if (score >= 14) analysis = `You're showing solid capability in ${info.name.toLowerCase()}, right in the expected range. There's slight room for optimization, which your care plan goals will address.`;
  else analysis = `We've noticed a little extra effort needed for ${info.name.toLowerCase()} tasks recently. This is a great area to focus your attention on in the coming weeks. We've updated your plan with some specific strategies.`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 text-navy hover:bg-navy/5 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold text-navy flex-1">{info.name}</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Description */}
        <div>
          <p className="text-lg text-navy/70 font-medium leading-relaxed">
            {info.desc}
          </p>
        </div>

        {/* Score Card /20 */}
        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-cyan/10 rounded-full flex items-center justify-center text-cyan mb-2">
            <Activity />
          </div>
          <h2 className="text-sm font-bold text-navy/50 uppercase tracking-wider">Current Score</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-extrabold text-navy tracking-tighter">{score}</span>
            <span className="text-2xl text-navy/40 font-bold">/20</span>
          </div>
          
          {/* Simple Gauge */}
          <div className="w-full max-w-xs mt-4">
            <div className="h-3 w-full bg-navy/10 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-cyan rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(score / 20) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold text-navy/40">
              <span>0</span>
              <span>20</span>
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="bg-navy rounded-3xl p-6 text-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-cyan font-bold uppercase tracking-wider text-xs">
            <Info size={16} /> Analysis
          </div>
          <p className="text-white/90 leading-relaxed font-medium">
            {analysis}
          </p>
        </div>

        {/* Trend (Mocked) */}
        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm space-y-6">
          <h3 className="font-bold text-navy">Recent Trend</h3>
          <div className="h-32 flex items-end gap-2 pt-4">
            {/* Mock bar chart trend */}
            {[15, 14, 15, score - 1, score].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <div 
                  className={`w-full max-w-[40px] rounded-t-lg transition-all ${i === 4 ? 'bg-cyan' : 'bg-navy/10 group-hover:bg-navy/20'}`}
                  style={{ height: `${(val / 20) * 100}%` }}
                />
                <span className="text-xs font-bold text-navy/40">W{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Guidance */}
        <div className="bg-white rounded-3xl p-6 border border-border shadow-sm">
          <h3 className="font-bold text-navy mb-4">Related Guidance</h3>
          <div className="p-4 bg-cyan/5 border border-cyan/20 rounded-2xl flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-cyan flex-shrink-0 shadow-sm mt-1">
              <ChevronRight size={16} strokeWidth={3} />
            </div>
            <p className="text-navy font-medium leading-relaxed text-sm">
              {info.tip}
            </p>
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
