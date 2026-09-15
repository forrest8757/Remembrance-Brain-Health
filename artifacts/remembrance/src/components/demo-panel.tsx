import React from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { Settings, RefreshCw, User, FastForward, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoPanel() {
  const [location, setLocation] = useLocation();
  const { state, resetDemo, loadSampleUser, setDemoSpeed, updateScores } = useDemoState();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-navy/10 text-navy rounded-full hover:bg-navy/20 transition-colors z-50 opacity-20 hover:opacity-100"
        title="Demo Controls"
      >
        <Settings size={16} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="font-bold text-navy text-sm">Demo Controls</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-navy text-sm font-medium">Close</button>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">State</h4>
        <button 
          onClick={() => { resetDemo(); setLocation('/'); setIsOpen(false); }}
          className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-navy w-full text-left"
        >
          <RefreshCw size={14} /> Reset State
        </button>
        <button 
          onClick={() => { loadSampleUser(); setLocation('/dashboard'); setIsOpen(false); }}
          className="flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-navy w-full text-left"
        >
          <User size={14} /> Load Sample User
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score Overrides</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => updateScores(95, { attention: 19, executive: 19, memory: 19, language: 19, motor: 19 })}
          >
            High (95)
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => updateScores(72, { attention: 14, executive: 15, memory: 14, language: 15, motor: 14 })}
          >
            Low (72)
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Processing Speed</h4>
        <div className="flex gap-2">
          {(['full', 'fast', 'skip'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setDemoSpeed(s)}
              className={`flex-1 flex justify-center items-center py-1.5 rounded-md text-xs font-medium border ${state.demoSpeed === s ? 'bg-cyan text-navy border-cyan' : 'bg-transparent text-gray-500 border-gray-200'}`}
            >
              {s === 'full' && <Play size={12} className="mr-1" />}
              {s === 'fast' && <FastForward size={12} className="mr-1" />}
              {s === 'skip' && <SkipForward size={12} className="mr-1" />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jump to Screen</h4>
        {[
          { path: '/', label: 'Landing / Waitlist' },
          { path: '/welcome', label: 'Onboarding' },
          { path: '/baseline', label: 'Baseline Test' },
          { path: '/score-reveal', label: 'Score Reveal' },
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/domain/attention', label: 'Domain: Attention' },
          { path: '/assessment/memory', label: 'Test: Memory' },
          { path: '/assessment/executive', label: 'Test: Executive' },
          { path: '/assessment/language', label: 'Test: Language' },
          { path: '/assessment/motor', label: 'Test: Motor' },
          { path: '/voice', label: 'Test: Voice' },
          { path: '/plan', label: 'Care Plan' },
          { path: '/progress', label: 'Progress Report' }
        ].map(route => (
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
