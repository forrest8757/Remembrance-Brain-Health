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
  const { updateScores } = useDemoState();
  const [taskIndex, setTaskIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWarmup, setIsWarmup] = useState(true);

  const CurrentTask = BASELINE_TASKS[taskIndex].component;
  const currentLabel = BASELINE_TASKS[taskIndex].label;

  const handleTaskComplete = () => {
    if (isWarmup) {
      setIsWarmup(false);
    } else {
      if (taskIndex < BASELINE_TASKS.length - 1) {
        setTaskIndex(i => i + 1);
        setIsWarmup(true);
      } else {
        setIsProcessing(true);
      }
    }
  };

  const handleProcessingComplete = () => {
    // Generate baseline scores
    updateScores(81, {
      attention: 16,
      executive: 15,
      memory: 17,
      language: 18,
      motor: 15,
    });
    setLocation('/score-reveal');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header with progress */}
      {!isProcessing && (
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
        </header>
      )}

      {/* Task Content */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-6">
        {!isProcessing ? (
          <CurrentTask key={`${taskIndex}-${isWarmup}`} onComplete={handleTaskComplete} isWarmup={isWarmup} />
        ) : (
          <ProcessingSequence onComplete={handleProcessingComplete} />
        )}
      </div>
    </div>
  );
}
