import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useDemoState, Goal } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, RefreshCw, Apple, Heart, Stethoscope, Moon, Users, Brain } from 'lucide-react';

const CATEGORIES = [
  { id: 'diet', name: 'Diet', icon: Apple, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'aerobic', name: 'Aerobic & Exercise', icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'checkups', name: 'Health Checkups', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'sleep', name: 'Sleep', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'social', name: 'Social Engagement', icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'cognitive', name: 'Cognitive Training', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

const MOCK_GOALS: Record<string, { primary: string, alt: string }> = {
  diet: { primary: "Drink one extra glass of water before noon.", alt: "Swap one sugary snack for a handful of nuts." },
  aerobic: { primary: "Take a 15-minute brisk walk after lunch.", alt: "Do 5 minutes of gentle stretching before bed." },
  checkups: { primary: "Schedule your annual physical this month.", alt: "Check your blood pressure at the pharmacy this week." },
  sleep: { primary: "No screens 30 minutes before bed.", alt: "Keep the bedroom temp under 70 degrees tonight." },
  social: { primary: "Call a friend or family member for 10 minutes.", alt: "Say hello to one neighbor while out today." },
  cognitive: { primary: "Read 10 pages of a new book.", alt: "Do a crossword or sudoku puzzle." },
};

export default function CarePlan() {
  const [, setLocation] = useLocation();
  const { state, addGoal, updateGoal } = useDemoState();
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});

  const handleAccept = (categoryId: string, title: string) => {
    // Check if already in active goals
    if (!state.goals.find(g => g.category === categoryId && g.accepted)) {
      addGoal({
        id: Date.now().toString() + '-' + categoryId,
        category: CATEGORIES.find(c => c.id === categoryId)?.name || categoryId,
        title,
        accepted: true,
        declined: false
      });
    }
  };

  const handleDecline = (categoryId: string, isAlt: boolean) => {
    if (!isAlt) {
      // Show alternative
      setSwapped(prev => ({ ...prev, [categoryId]: true }));
    } else {
      // Add as declined
      addGoal({
        id: Date.now().toString() + '-' + categoryId,
        category: CATEGORIES.find(c => c.id === categoryId)?.name || categoryId,
        title: MOCK_GOALS[categoryId].alt,
        accepted: false,
        declined: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => setLocation('/dashboard')} className="p-2 -ml-2 text-navy hover:bg-navy/5 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold text-navy flex-1">Your Care Plan</span>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-6 py-8 space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-navy tracking-tight">Personalized guidance.</h1>
          <p className="text-lg text-navy/70 font-medium">
            Based on your baseline and health context, we've generated some starting goals across the six pillars of brain health.
          </p>
        </div>

        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const isSwapped = swapped[cat.id];
            const currentGoalText = isSwapped ? MOCK_GOALS[cat.id].alt : MOCK_GOALS[cat.id].primary;
            
            // Check if there is an accepted/declined goal for this category in the store
            const existingGoal = state.goals.find(g => g.category === cat.name);
            const isAccepted = existingGoal?.accepted;
            const isDeclined = existingGoal?.declined;

            return (
              <div key={cat.id} className="bg-white rounded-3xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color}`}>
                    <cat.icon size={20} strokeWidth={2.5} />
                  </div>
                  <h2 className="font-bold text-navy text-lg">{cat.name}</h2>
                </div>

                {isAccepted ? (
                  <div className="bg-cyan/10 border border-cyan/20 rounded-2xl p-4 flex gap-3">
                    <Check className="text-cyan shrink-0 mt-0.5" />
                    <p className="font-bold text-navy">{existingGoal.title}</p>
                  </div>
                ) : isDeclined ? (
                  <div className="bg-navy/5 border border-border rounded-2xl p-4">
                    <p className="text-navy/50 font-medium text-sm">We'll suggest a different goal next cycle.</p>
                  </div>
                ) : (
                  <div className="bg-background rounded-2xl p-5 border border-border animate-in fade-in">
                    {isSwapped && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-cyan mb-2">
                        <RefreshCw size={12} /> Alternative goal
                      </span>
                    )}
                    <p className="text-navy font-bold text-lg leading-snug mb-6">{currentGoalText}</p>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 border-border text-navy hover:bg-navy/5 rounded-xl font-bold"
                        onClick={() => handleDecline(cat.id, isSwapped)}
                      >
                        <X className="mr-1 h-4 w-4" /> Decline
                      </Button>
                      <Button 
                        className="flex-1 h-12 bg-navy hover:bg-navy/90 text-white rounded-xl font-bold shadow-md"
                        onClick={() => handleAccept(cat.id, currentGoalText)}
                      >
                        <Check className="mr-1 h-4 w-4 text-cyan" /> Accept
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="pt-8 text-xs text-navy/40 text-center font-medium max-w-sm mx-auto">
          General wellness guidance, not medical advice. Always consult your physician before starting a new exercise or diet regimen.
        </div>
      </main>
    </div>
  );
}
