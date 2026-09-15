import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { FocusField, ConnectPath, RecallChain, NameMatch, DrawCopy, ProcessingSequence } from '@/components/tasks';

const BASELINE_TASKS = [
  { id: 'attention', component: FocusField, label: "Area 1 of 5: Attention" },
  { id: 'executive', component: ConnectPath, label: "Area 2 of 5: Executive Function" },
  { id: 'memory', component: RecallChain, label: "Area 3 of 5: Memory" },
  { id: 'language', component: NameMatch, label: "Area 4 of 5: Language" },
  { id: 'motor', component: DrawCopy, label: "Area 5 of 5: Coordination" },
];

export default function Baseline() {
  const [, setLocation] = useLocation();
  const { setBaselineScores } = useDemoState();
  const [taskIndex, setTaskIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWarmup, setIsWarmup] = useState(true);
  const [showTransition, setShowTransition] = useState(false);

  const CurrentTask = BASELINE_TASKS[taskIndex].component as React.ComponentType<{
    onComplete: () => void;
    isWarmup?: boolean;
    allowSkipWarmup?: boolean;
  }>;
  const currentLabel = BASELINE_TASKS[taskIndex].label;

  const handleTaskComplete = () => {
    if (isWarmup) {
      setIsWarmup(false);
    } else {
      if (taskIndex < BASELINE_TASKS.length - 1) {
        // Give each area a calm handoff so the user knows the baseline is
        // one guided journey, not five unrelated tests.
        setShowTransition(true);
      } else {
        setIsProcessing(true);
      }
    }
  };

  React.useEffect(() => {
    if (!showTransition) return;
    const timer = window.setTimeout(() => {
      setTaskIndex(i => i + 1);
      setIsWarmup(true);
      setShowTransition(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [showTransition]);

  const handleProcessingComplete = () => {
    // Baseline is the only all-domain write. It records one snapshot and
    // deliberately does not advance the weekly rotation.
    setBaselineScores({
      attention: 16,
      executive: 15,
      memory: 17,
      language: 18,
      motor: 16,
    });
    setLocation('/score-reveal');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header with progress */}
      {!isProcessing && !showTransition && (
        <header className="absolute top-0 w-full p-6 flex flex-col items-center gap-4 z-20">
          <div className="w-full max-w-md h-2 bg-navy/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan transition-all duration-500 ease-out"
              style={{ width: `${((taskIndex + (isWarmup ? 0 : 0.5)) / BASELINE_TASKS.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-navy/60 uppercase tracking-wider">
            {currentLabel}
          </span>
           <span className="text-[11px] text-navy/40 font-medium">
             Guided wellness activity · demo results are simulated
           </span>
        </header>
      )}

      {/* Task Content */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-6">
        {showTransition ? (
          <div className="flex flex-col items-center justify-center text-center px-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-cyan/10 flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full bg-cyan/30 animate-pulse" />
            </div>
            <p className="text-cyan font-bold uppercase tracking-widest text-xs mb-3">Nice work</p>
            <h2 className="text-3xl font-extrabold text-navy tracking-tight">
              Next up: {BASELINE_TASKS[taskIndex + 1].id === 'executive'
                ? 'executive function'
                : BASELINE_TASKS[taskIndex + 1].id}.
            </h2>
            <p className="text-navy/60 font-medium mt-3">Take a breath. We’ll guide you through the next area.</p>
          </div>
        ) : !isProcessing ? (
          <CurrentTask
            key={`${taskIndex}-${isWarmup}`}
            onComplete={handleTaskComplete}
            isWarmup={isWarmup}
            allowSkipWarmup={false}
          />
        ) : (
          <ProcessingSequence onComplete={handleProcessingComplete} />
        )}
      </div>
    </div>
  );
}
