import React from 'react';
import { useLocation, Link } from 'wouter';
import { useDemoState } from '@/lib/store';
import { BrainVisualization } from '@/components/brain-viz';
import { CheckCircle2, ChevronRight, Activity, TrendingUp, Mic, ClipboardEdit, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { state } = useDemoState();
  const { profile, scores, goals, checkIns } = state;
  const firstName = profile.firstName || "friend";

  const activeGoals = goals.filter(g => g.accepted && !g.declined);
  const completedGoals = activeGoals.filter(g => false); // for demo, none are complete initially or maybe some are?
  const todayCheckIn = checkIns.length > 0; // simplistic for demo

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
            Remembrance
          </span>
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
            {firstName.charAt(0)}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-navy mb-2">Good morning, {firstName}.</h1>

        {/* Hero Score Card */}
        <div className="bg-navy rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/20 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div className="space-y-1">
              <h2 className="text-white/70 font-bold uppercase tracking-wider text-xs">Remembrance Score</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-extrabold tracking-tighter">{scores.composite || '--'}</span>
                <span className="text-xl text-white/50 font-bold">/100</span>
              </div>
              <div className="inline-flex items-center gap-1 text-cyan text-sm font-bold bg-cyan/10 px-2 py-1 rounded-md mt-2">
                <TrendingUp size={14} /> +3 since last cycle
              </div>
            </div>
            
            <div className="w-32 h-32 relative flex items-center justify-center -mr-4">
              <BrainVisualization className="absolute inset-0 scale-75" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Check-in Card */}
          <button 
            onClick={() => setLocation('/check-in')}
            className={`text-left rounded-2xl p-5 border transition-all ${todayCheckIn ? 'bg-cyan/5 border-cyan/20' : 'bg-white border-border hover:border-navy/20 hover:bg-navy/5 shadow-sm'}`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white shadow-sm">
              {todayCheckIn ? <CheckCircle2 className="text-cyan" /> : <ClipboardEdit className="text-navy" />}
            </div>
            <h3 className="font-bold text-navy">{todayCheckIn ? 'Checked in ✓' : 'Daily check-in'}</h3>
            <p className="text-sm text-navy/60 mt-1 font-medium">{todayCheckIn ? 'Done for today' : 'Take 10 seconds'}</p>
          </button>

          {/* Next Test Card */}
          <button 
            onClick={() => setLocation(`/assessment/${state.currentWeekDomain || 'memory'}`)}
            className="text-left bg-white rounded-2xl p-5 border border-border hover:border-navy/20 hover:bg-navy/5 shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-cyan/10 text-cyan">
              <Activity />
            </div>
            <h3 className="font-bold text-navy">Next test</h3>
            <p className="text-sm text-navy/60 mt-1 font-medium capitalize">{state.currentWeekDomain || 'memory'} • 4 min</p>
          </button>
        </div>

        {/* Goals Card */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-navy text-lg">Today's Goals</h3>
            <button onClick={() => setLocation('/plan')} className="text-cyan font-bold text-sm hover:text-cyan/80">View Plan</button>
          </div>
          
          {activeGoals.length > 0 ? (
            <div className="space-y-3">
              {activeGoals.map(goal => (
                <div key={goal.id} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border/50">
                  <button className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0 flex items-center justify-center mt-0.5 hover:border-cyan transition-colors">
                    {/* Tick icon would go here if completed */}
                  </button>
                  <div>
                    <p className="font-bold text-navy text-sm">{goal.title}</p>
                    <p className="text-xs text-navy/50 font-medium">{goal.category}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-background rounded-xl border border-dashed border-border">
              <p className="text-navy/60 font-medium text-sm mb-3">No active goals yet.</p>
              <Button variant="outline" onClick={() => setLocation('/plan')} className="rounded-full">Review Care Plan</Button>
            </div>
          )}
        </div>

        {/* Explore Areas (Domains) */}
        <div>
          <h3 className="font-bold text-navy text-lg mb-4">Explore your areas</h3>
          <div className="space-y-3">
            {[
              { id: 'attention', name: 'Attention', status: 'Stable' },
              { id: 'executive', name: 'Executive Function', status: 'Needs focus' },
              { id: 'memory', name: 'Memory', status: 'Strong' },
              { id: 'language', name: 'Language', status: 'Stable' },
              { id: 'motor', name: 'Coordination', status: 'Stable' }
            ].map(domain => (
              <button 
                key={domain.id}
                onClick={() => setLocation(`/domain/${domain.id}`)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-border hover:border-navy/20 hover:bg-navy/5 transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center">
                    <Brain className="text-navy/50" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-navy">{domain.name}</p>
                    <p className="text-xs text-navy/50 font-medium">{domain.status}</p>
                  </div>
                </div>
                <ChevronRight className="text-border" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
