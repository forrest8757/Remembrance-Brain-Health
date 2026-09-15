import React from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
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

const MOCK_GOALS: Record<string, { primary: string; alt: string }> = {
  diet: { primary: 'Drink one extra glass of water before noon.', alt: 'Swap one sugary snack for a handful of nuts.' },
  aerobic: { primary: 'Take a 15-minute brisk walk after lunch.', alt: 'Do 5 minutes of gentle stretching before bed.' },
  checkups: { primary: 'Schedule your annual physical this month.', alt: 'Check your blood pressure at the pharmacy this week.' },
  sleep: { primary: 'No screens 30 minutes before bed.', alt: 'Keep the bedroom temperature comfortable tonight.' },
  social: { primary: 'Call a friend or family member for 10 minutes.', alt: 'Say hello to one neighbor while out today.' },
  cognitive: { primary: 'Read 10 pages of a new book.', alt: 'Do a crossword or sudoku puzzle.' },
};

export default function CarePlan() {
  const [, setLocation] = useLocation();
  const { state, addGoal, updateGoal } = useDemoState();

  const goalFor = (categoryId: string, categoryName: string) =>
    state.goals.find((goal) => goal.categoryId === categoryId || goal.category === categoryName);

  const handleAccept = (categoryId: string, categoryName: string, title: string) => {
    const existing = goalFor(categoryId, categoryName);
    if (existing) {
      updateGoal(existing.id, {
        title,
        accepted: true,
        declined: false,
        resolved: false,
        swapUsed: existing.swapUsed || title === MOCK_GOALS[categoryId].alt,
      });
      return;
    }
    addGoal({
      id: `${Date.now()}-${categoryId}`,
      category: categoryName,
      categoryId,
      title,
      accepted: true,
      declined: false,
      resolved: false,
      swapUsed: false,
    });
  };

  const handleDecline = (categoryId: string, categoryName: string) => {
    const existing = goalFor(categoryId, categoryName);
    if (!existing) {
      // Persist the first decline and the one allowed alternative together.
      // This makes a refresh or a later visit resume at the same decision.
      addGoal({
        id: `${Date.now()}-${categoryId}`,
        category: categoryName,
        categoryId,
        title: MOCK_GOALS[categoryId].alt,
        originalTitle: MOCK_GOALS[categoryId].primary,
        accepted: false,
        declined: true,
        resolved: false,
        swapUsed: true,
      });
      return;
    }

    if (existing.declined && existing.swapUsed && !existing.accepted) {
      updateGoal(existing.id, { declined: true, resolved: true, swapUsed: true });
    } else {
      updateGoal(existing.id, {
        title: MOCK_GOALS[categoryId].alt,
        originalTitle: existing.originalTitle || MOCK_GOALS[categoryId].primary,
        accepted: false,
        declined: true,
        resolved: false,
        swapUsed: true,
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
            Here are a few gentle starting points across six everyday wellness categories. Choose what feels useful to you.
          </p>
        </div>

        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const recommendation = MOCK_GOALS[cat.id];
            const existingGoal = goalFor(cat.id, cat.name);
            const isAccepted = existingGoal?.accepted && !existingGoal.declined && !existingGoal.resolved;
            const isResolved = existingGoal?.resolved;
            const isAlternative = Boolean(existingGoal?.swapUsed && existingGoal.declined && !existingGoal.accepted && !existingGoal.resolved);
            const currentGoalText = existingGoal?.title || recommendation.primary;

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
                    <div>
                      <p className="font-bold text-navy">{existingGoal.title}</p>
                      <p className="text-xs text-navy/55 font-medium mt-1">Active in your daily plan</p>
                    </div>
                  </div>
                ) : isResolved ? (
                  <div className="bg-navy/5 border border-border rounded-2xl p-4 flex gap-3">
                    <Check className="text-navy/40 shrink-0 mt-0.5" />
                    <p className="text-navy/55 font-medium text-sm">Thanks for the feedback. We’ll suggest a different option next cycle.</p>
                  </div>
                ) : (
                  <div className="bg-background rounded-2xl p-5 border border-border animate-in fade-in">
                    {isAlternative && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-cyan mb-2">
                        <RefreshCw size={12} /> One alternative
                      </span>
                    )}
                    <p className="text-navy font-bold text-lg leading-snug mb-6">{currentGoalText}</p>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 border-border text-navy hover:bg-navy/5 rounded-xl font-bold"
                        onClick={() => handleDecline(cat.id, cat.name)}
                      >
                        <X className="mr-1 h-4 w-4" /> {isAlternative ? 'Decline' : 'Not for me'}
                      </Button>
                      <Button
                        className="flex-1 h-12 bg-navy hover:bg-navy/90 text-white rounded-xl font-bold shadow-md"
                        onClick={() => handleAccept(cat.id, cat.name, currentGoalText)}
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
          General wellness guidance, not medical advice. These demo recommendations are simulated and are not a substitute for professional care.
        </div>
      </main>
    </div>
  );
}