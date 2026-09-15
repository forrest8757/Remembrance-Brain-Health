import React from 'react';
import { useLocation } from 'wouter';
import { localDateKey, useDemoState, DomainKey } from '@/lib/store';
import { BrainVisualization } from '@/components/brain-viz';
import { CheckCircle2, ChevronRight, Activity, ClipboardEdit, Brain, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOMAINS: { id: DomainKey; name: string; duration: string }[] = [
  { id: 'attention', name: 'Attention', duration: '2 min' },
  { id: 'executive', name: 'Executive Function', duration: '3 min' },
  { id: 'memory', name: 'Memory', duration: '4 min' },
  { id: 'language', name: 'Language', duration: '2 min' },
  { id: 'motor', name: 'Coordination', duration: '3 min' },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { state, toggleGoalCompletion } = useDemoState();
  const { profile, scores, goals, checkIns } = state;
  const firstName = profile.firstName || 'friend';
  const today = localDateKey();

  const activeGoals = goals.filter((goal) => goal.accepted && !goal.declined && !goal.resolved);
  const todayCheckIn = checkIns.some((checkIn) => checkIn.date === today);
  const completedGoalCount = activeGoals.filter((goal) => goal.completedDates?.includes(today)).length;
  const nextDomain = DOMAINS.find((domain) => domain.id === state.currentWeekDomain) || DOMAINS[0];
  const snapshots = state.scoreHistory.filter((snapshot) => snapshot.composite !== null);
  const latestSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];
  const snapshotDelta = latestSnapshot && previousSnapshot && latestSnapshot.composite === scores.composite
    ? (latestSnapshot.composite as number) - (previousSnapshot.composite as number)
    : null;

  const statusFor = (domain: DomainKey) => {
    if (scores.domains[domain] === null) return 'Not recorded yet';
    const domainSnapshots = state.scoreHistory.filter((snapshot) => snapshot.domains[domain] !== null);
    return domainSnapshots.length > 1 ? 'Updated recently' : 'Baseline recorded';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
            Remembrance
          </span>
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-navy mb-2">Good morning, {firstName}.</h1>

        <div className="bg-navy rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <div className="space-y-1">
              <h2 className="text-white/70 font-bold uppercase tracking-wider text-xs">Remembrance Score</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-extrabold tracking-tighter">
                  {scores.composite === null ? '--' : scores.composite}
                </span>
                <span className="text-xl text-white/50 font-bold">/100</span>
              </div>
              <div className="inline-flex items-center gap-1 text-white/65 text-xs font-medium bg-white/10 px-2 py-1 rounded-md mt-2">
                {snapshotDelta === null
                  ? 'Your first recorded snapshot'
                  : `Since previous saved result: ${snapshotDelta > 0 ? '+' : ''}${snapshotDelta}`}
              </div>
            </div>
            <div className="w-32 h-32 relative flex items-center justify-center -mr-4">
              <BrainVisualization className="absolute inset-0 scale-75" />
            </div>
          </div>
          <p className="relative z-10 text-white/50 text-xs mt-5">
            Demo scores are simulated snapshots for wellness tracking, not clinical measurements.
          </p>
        </div>

        {state.lastCompletion && (
          <div className="bg-cyan/10 border border-cyan/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-cyan shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-navy">Nice work completing your {state.lastCompletion.domain} check-in.</p>
                <p className="text-sm text-navy/70 font-medium mt-1">{state.lastCompletion.takeaway}</p>
                {state.lastCompletion.cycleCompleted && (
                  <button
                    onClick={() => setLocation('/progress')}
                    className="text-sm text-cyan font-bold mt-3 hover:text-cyan/80"
                  >
                    View your completed-round report →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setLocation('/check-in')}
            className={`text-left rounded-2xl p-5 border transition-all ${
              todayCheckIn
                ? 'bg-cyan/5 border-cyan/20'
                : 'bg-white border-border hover:border-navy/20 hover:bg-navy/5 shadow-sm'
            }`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-white shadow-sm">
              {todayCheckIn ? <CheckCircle2 className="text-cyan" /> : <ClipboardEdit className="text-navy" />}
            </div>
            <h3 className="font-bold text-navy">{todayCheckIn ? 'Checked in ✓' : 'Daily check-in'}</h3>
            <p className="text-sm text-navy/60 mt-1 font-medium">
              {todayCheckIn ? 'Update today’s note' : 'Take 10 seconds'}
            </p>
          </button>

          <button
            onClick={() => setLocation(`/assessment/${nextDomain.id}`)}
            className="text-left bg-white rounded-2xl p-5 border border-border hover:border-navy/20 hover:bg-navy/5 shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-cyan/10 text-cyan">
              <Activity />
            </div>
            <h3 className="font-bold text-navy">Next test</h3>
            <p className="text-sm text-navy/60 mt-1 font-medium">{nextDomain.name} • {nextDomain.duration}</p>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-navy text-lg">Today’s Goals</h3>
              {activeGoals.length > 0 && (
                <p className="text-xs text-navy/50 font-medium mt-1">
                  {completedGoalCount} of {activeGoals.length} checked off today
                </p>
              )}
            </div>
            <button onClick={() => setLocation('/plan')} className="text-cyan font-bold text-sm hover:text-cyan/80">
              View Plan
            </button>
          </div>

          {activeGoals.length > 0 ? (
            <div className="space-y-3">
              {activeGoals.map((goal) => {
                const isComplete = goal.completedDates?.includes(today) || false;
                return (
                  <div
                    key={goal.id}
                    className={`flex items-start gap-3 p-3 rounded-xl bg-background border border-border/50 ${
                      isComplete ? 'opacity-70' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleGoalCompletion(goal.id, today)}
                      aria-label={isComplete ? `Uncheck ${goal.title}` : `Complete ${goal.title}`}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                        isComplete ? 'border-cyan bg-cyan text-navy' : 'border-border hover:border-cyan'
                      }`}
                    >
                      {isComplete && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div>
                      <p className={`font-bold text-navy text-sm ${isComplete ? 'line-through' : ''}`}>{goal.title}</p>
                      <p className="text-xs text-navy/50 font-medium">{goal.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-background rounded-xl border border-dashed border-border">
              <p className="text-navy/60 font-medium text-sm mb-3">No active goals yet.</p>
              <Button variant="outline" onClick={() => setLocation('/plan')} className="rounded-full">Review Care Plan</Button>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold text-navy text-lg mb-4">Explore your areas</h3>
          <div className="space-y-3">
            {DOMAINS.map((domain) => (
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
                    <p className="text-xs text-navy/50 font-medium">{statusFor(domain.id)}</p>
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