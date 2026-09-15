import React from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { Settings, RefreshCw, User, FastForward, Play, SkipForward, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JUMPS = [
  { path: '/', label: 'Landing / Waitlist' },
  { path: '/welcome', label: 'Onboarding' },
  { path: '/baseline', label: 'Baseline / all areas' },
  { path: '/score-reveal', label: 'Score Reveal' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/check-in', label: 'Daily Check-in' },
  { path: '/plan', label: 'Care Plan' },
  { path: '/progress', label: 'Progress Report' },
  { path: '/domain/attention', label: 'Domain: Attention' },
  { path: '/domain/executive', label: 'Domain: Executive' },
  { path: '/domain/memory', label: 'Domain: Memory' },
  { path: '/domain/language', label: 'Domain: Language' },
  { path: '/domain/motor', label: 'Domain: Coordination' },
  { path: '/assessment/attention', label: 'Test: Attention' },
  { path: '/assessment/executive', label: 'Test: Executive' },
  { path: '/assessment/memory', label: 'Test: Memory' },
  { path: '/assessment/language', label: 'Test: Language' },
  { path: '/assessment/motor', label: 'Test: Coordination' },
  { path: '/voice', label: 'Voice Test (demo)' },
];

export function DemoPanel() {
  const [, setLocation] = useLocation();
  const { state, resetDemo, loadSampleUser, forceCompletedSampleCycle, setDemoSpeed, updateScores } = useDemoState();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-navy/10 text-navy rounded-full hover:bg-navy/20 transition-colors z-50 opacity-20 hover:opacity-100"
        title="Demo Controls"
        aria-label="Open demo controls"
      >
        <Settings size={16} />
      </button>
    );
  }

  const confirmReset = () => {
    if (window.confirm('Reset this demo session? Your sample history, goals, and check-ins will be cleared.')) {
      resetDemo();
      setLocation('/');
      setIsOpen(false);
    }
  };

  const overrideScores = (value: number) => {
    // updateScores derives /100 from these five /20 values, so the display
    // and every snapshot-facing view remain coherent.
    updateScores(value, {
      attention: value,
      executive: value,
      memory: value,
      language: value,
      motor: value,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="font-bold text-navy text-sm">Demo Controls</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-navy text-sm font-medium">Close</button>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">State</h4>
        <button
          onClick={confirmReset}
          className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-navy w-full text-left"
        >
          <RefreshCw size={14} /> Reset State
        </button>
        <button
          onClick={() => { loadSampleUser(); setLocation('/dashboard'); setIsOpen(false); }}
          className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-navy w-full text-left"
        >
          <User size={14} /> Load Sample User + History
        </button>
        <button
          onClick={() => { forceCompletedSampleCycle(); setLocation('/progress'); setIsOpen(false); }}
          className="flex items-center gap-2 text-sm bg-cyan/10 hover:bg-cyan/20 p-2 rounded-lg text-navy w-full text-left"
        >
          <Flag size={14} /> Force Completed Sample Cycle
        </button>
        <p className="text-[11px] text-gray-400 font-medium">
          Active areas: {state.activeCycleDomains.length || 0}/5 · Completed rounds: {state.completedCycles.length}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score Overrides</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => overrideScores(19)}>All domains 19 · 95</Button>
          <Button variant="outline" size="sm" onClick={() => overrideScores(14)}>All domains 14 · 70</Button>
        </div>
        <p className="text-[11px] text-gray-400 font-medium">Composite is always the sum of the five domain values.</p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Processing Speed</h4>
        <div className="flex gap-2">
          {(['full', 'fast', 'skip'] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => setDemoSpeed(speed)}
              className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-xs font-medium border ${
                state.demoSpeed === speed ? 'bg-cyan text-navy border-cyan' : 'bg-transparent text-gray-500 border-gray-200'
              }`}
            >
              {speed === 'full' && <Play size={12} className="mr-1" />}
              {speed === 'fast' && <FastForward size={12} className="mr-1" />}
              {speed === 'skip' && <SkipForward size={12} className="mr-1" />}
              {speed.charAt(0).toUpperCase() + speed.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jump to Screen</h4>
        {JUMPS.map((route) => (
          <button
            key={route.path}
            onClick={() => { setLocation(route.path); setIsOpen(false); }}
            className="text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-navy w-full text-left"
          >
            {route.label}
          </button>
        ))}
      </div>
    </div>
  );
}