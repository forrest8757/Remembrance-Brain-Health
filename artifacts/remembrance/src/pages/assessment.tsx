import React, { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useDemoState } from '@/lib/store';
import { FocusField, ConnectPath, RecallChain, NameMatch, DrawCopy, ProcessingSequence } from '@/components/tasks';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock } from 'lucide-react';

const DOMAIN_TASKS: Record<string, { component: any, name: string, desc: string, time: string }> = {
  attention: { component: FocusField, name: "Attention", desc: "Staying focused and processing quickly.", time: "2 min" },
  executive: { component: ConnectPath, name: "Executive Function", desc: "Planning and mental flexibility.", time: "3 min" },
  memory: { component: RecallChain, name: "Memory", desc: "Encoding and recalling information.", time: "4 min" },
  language: { component: NameMatch, name: "Language", desc: "Word finding and comprehension.", time: "2 min" },
  motor: { component: DrawCopy, name: "Coordination", desc: "Visuospatial processing and drawing.", time: "3 min" },
};

export default function Assessment() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { updateDomainScore } = useDemoState();
  
  const domainId = (id || 'memory') as keyof typeof DOMAIN_TASKS;
  const taskInfo = DOMAIN_TASKS[domainId] || DOMAIN_TASKS.memory;
  const CurrentTask = taskInfo.component;

  const [phase, setPhase] = useState<'intro' | 'warmup' | 'task' | 'processing'>('intro');

  const handleWarmupComplete = () => {
    setPhase('task');
  };

  const handleTaskComplete = () => {
    setPhase('processing');
  };

  const handleProcessingComplete = () => {
    // Generate a random slight variation in score for demo purposes (14-19)
    const newScore = Math.floor(Math.random() * 6) + 14; 
    updateDomainScore(domainId as any, newScore);
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Intro Phase */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full justify-center space-y-8 animate-in fade-in duration-500">
          <button onClick={() => window.history.back()} className="absolute top-6 left-6 p-2 text-navy hover:bg-navy/5 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          
          <div className="space-y-4 text-center">
            <span className="text-cyan font-bold tracking-widest uppercase text-sm">Weekly Check-in</span>
            <h1 className="text-4xl font-extrabold text-navy tracking-tight">{taskInfo.name}</h1>
            <p className="text-xl text-navy/70 font-medium">{taskInfo.desc}</p>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-border shadow-sm flex items-center justify-center gap-3">
            <Clock className="text-cyan" />
            <span className="font-bold text-navy text-lg">Est. time: {taskInfo.time}</span>
          </div>

          <div className="pt-8">
            <Button 
              onClick={() => setPhase('warmup')}
              className="w-full h-16 text-xl bg-navy hover:bg-navy/90 text-white font-bold rounded-2xl shadow-md hover-elevate transition-all"
            >
              Begin
            </Button>
          </div>
        </div>
      )}

      {/* Task Phase (Warmup + Core) */}
      {(phase === 'warmup' || phase === 'task') && (
        <div className="flex-1 pt-8 pb-6 animate-in fade-in zoom-in-95 duration-500">
          <CurrentTask 
            key={phase} 
            isWarmup={phase === 'warmup'} 
            onComplete={phase === 'warmup' ? handleWarmupComplete : handleTaskComplete} 
          />
        </div>
      )}

      {/* Processing Phase */}
      {phase === 'processing' && (
        <ProcessingSequence onComplete={handleProcessingComplete} />
      )}
    </div>
  );
}
