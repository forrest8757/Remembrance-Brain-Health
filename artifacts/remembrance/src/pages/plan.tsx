// Plan (redesign Phase 3, rollout 6): small everyday steps. Accepted steps
// first, each with a one-tap "Done today"; then ideas to try, where "Not for
// me" offers one alternative and a second "Not for me" retires the idea for
// this cycle (decision logic unchanged from the original page). General
// wellness ideas, never medical advice.
import { AppShell, CheckIcon, ThemeRoot } from '@workspace/ui';
import { localDateKey, useDemoState } from '@/lib/store';
import { APP_NAV } from '@/pages/dashboard';

const CATEGORIES = [
  { id: 'diet', name: 'Food and drink' },
  { id: 'aerobic', name: 'Moving more' },
  { id: 'checkups', name: 'Health checkups' },
  { id: 'sleep', name: 'Sleep' },
  { id: 'social', name: 'Time with people' },
  { id: 'cognitive', name: 'Keeping your mind busy' },
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
  const { state, addGoal, updateGoal, toggleGoalCompletion } = useDemoState();
  const today = localDateKey();

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

  const rows = CATEGORIES.map((cat) => {
    const goal = goalFor(cat.id, cat.name);
    return {
      cat,
      goal,
      accepted: Boolean(goal?.accepted && !goal.declined && !goal.resolved),
      resolved: Boolean(goal?.resolved),
      alternative: Boolean(goal?.swapUsed && goal.declined && !goal.accepted && !goal.resolved),
      text: goal?.title || MOCK_GOALS[cat.id]!.primary,
    };
  });
  const active = rows.filter((r) => r.accepted);
  const ideas = rows.filter((r) => !r.accepted && !r.resolved);
  const later = rows.filter((r) => r.resolved);
  const doneToday = active.filter((r) => r.goal?.completedDates?.includes(today)).length;

  return (
    <ThemeRoot>
      <AppShell nav={APP_NAV} current="plan">
        <div className="flex flex-col gap-6">
          <header>
            <p className="ds-label">Small everyday steps</p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight">Your plan</h1>
            <p className="mt-2 text-[1.2rem]">Pick the steps that suit you. You can change them anytime.</p>
          </header>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="today-title">
            <h2 id="today-title" className="ds-title">
              Your steps
            </h2>
            {active.length ? (
              <>
                <p className="ds-secondary">
                  {doneToday === 0 ? 'Tap a step when you have done it today.' : `${doneToday} of ${active.length} done today. Nicely done.`}
                </p>
                <ul className="flex flex-col gap-3">
                  {active.map(({ cat, goal, text }) => {
                    const done = Boolean(goal?.completedDates?.includes(today));
                    return (
                      <li key={cat.id}>
                        <button
                          type="button"
                          aria-pressed={done}
                          onClick={() => goal && toggleGoalCompletion(goal.id)}
                          className="ds-tap flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left"
                          style={{ border: `${done ? 3 : 2}px solid ${done ? 'var(--steady)' : 'var(--track)'}`, background: done ? 'var(--elevated)' : 'transparent' }}
                        >
                          <span
                            aria-hidden
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ border: `2.5px solid ${done ? 'var(--steady)' : 'var(--text-2)'}`, background: done ? 'var(--steady)' : 'transparent' }}
                          >
                            {done && <CheckIcon color="var(--surface)" />}
                          </span>
                          <span className="flex min-w-0 flex-col break-words">
                            <span className="ds-label" style={{ letterSpacing: '0.04em' }}>
                              {cat.name}
                            </span>
                            <span className="font-semibold">{text}</span>
                            <span className="ds-secondary" style={{ fontSize: '1rem' }}>
                              {done ? 'Done today' : 'Not done yet today'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="ds-secondary">No steps yet. Choose one or two from the ideas below. Small steps add up.</p>
            )}
          </section>

          {ideas.length > 0 && (
            <section className="flex flex-col gap-4" aria-labelledby="ideas-title">
              <h2 id="ideas-title" className="ds-title">
                Ideas to try
              </h2>
              {ideas.map(({ cat, alternative, text }) => (
                <article key={cat.id} className="ds-card flex flex-col gap-3" aria-label={cat.name}>
                  <p className="ds-label">{cat.name}</p>
                  {alternative && <p className="ds-secondary">Here's another idea instead:</p>}
                  <p className="text-[1.2rem] font-semibold">{text}</p>
                  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(12rem,100%),1fr))]">
                    <button type="button" className="ds-button ds-button-secondary" style={{ borderColor: 'var(--accent-text)', color: 'var(--accent-text)' }} onClick={() => handleAccept(cat.id, cat.name, text)}>
                      Add to my plan
                    </button>
                    {/* The quieter choice: no box, same size target. */}
                    <button type="button" className="ds-tap rounded-2xl px-4 font-semibold underline underline-offset-4" style={{ color: 'var(--text-2)' }} onClick={() => handleDecline(cat.id, cat.name)}>
                      {alternative ? 'Not this one either' : 'Not for me'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          {later.length > 0 && (
            <p className="ds-secondary">
              Set aside for now: {later.map((r) => r.cat.name.toLowerCase()).join(', ')}. We'll suggest something different next time.
            </p>
          )}

          <p style={{ fontSize: '1rem' }}>General wellness ideas, not medical advice. Check with your doctor before changing your exercise, diet or medicines.</p>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
