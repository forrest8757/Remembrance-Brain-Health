// Home data (redesign Phase 3). Real where the app has it: name, today's
// check-in, sleep and mood from check-ins, whether this week's session is done.
// The Remembrance Score and the five domain scores don't exist yet (no
// composite is computed from the tests), so they're SAMPLE data, labeled as
// such on screen, until the scoring decision is made.
import type { DomainSummary, Status } from '@workspace/ui';
import type { DemoState } from '@/lib/store';
import { localDateKey } from '@/lib/store';

export const SAMPLE_SCORE: { score: number; status: Status; sentence: string; weeks: number[] } = {
  score: 78,
  status: 'steady',
  sentence: 'Your score has been steady for the last 8 weeks.',
  weeks: [76, 77, 76, 77, 78, 77, 78, 78, 77, 78, 79, 78],
};

/** "Up 3 points over the last 4 weeks." / "About the same…" / "2 points lower…" */
export function trendSentence(weeks: number[]): string {
  const diff = weeks.at(-1)! - weeks.at(-5)!;
  if (Math.abs(diff) <= 1) return 'About the same over the last 4 weeks.';
  return diff > 0 ? `Up ${diff} points over the last 4 weeks.` : `${-diff} points lower over the last 4 weeks.`;
}

export const SAMPLE_DOMAINS: DomainSummary[] = [
  { key: 'memory', score: 74, status: 'steady', sentence: 'Steady this month.', weeks: [72, 73, 71, 72, 74, 73, 72, 75, 74, 73, 74, 74] },
  { key: 'attention', score: 81, status: 'steady', sentence: 'Up 3 points over the last 4 weeks.', weeks: [77, 76, 76, 77, 78, 78, 77, 78, 79, 80, 80, 81] },
  { key: 'executive', score: 69, status: 'watch', sentence: 'A little lower than your usual lately.', weeks: [73, 74, 74, 73, 74, 75, 74, 73, 72, 70, 70, 69] },
  { key: 'language', score: 85, status: 'steady', sentence: 'Consistently strong.', weeks: [85, 84, 84, 85, 84, 86, 85, 85, 84, 86, 85, 85] },
  { key: 'orientation', score: 92, status: 'steady', sentence: 'Right where it usually is.', weeks: [92, 91, 91, 92, 92, 93, 92, 91, 92, 92, 93, 92] },
];

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function homeData(state: DemoState, now = new Date()) {
  const today = localDateKey(now);
  const latest = [...state.checkIns].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const read = <T,>(key: string, fallback: T): T => {
    try {
      return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const sessionDoneAt = read<number | null>('rm.shell.completedAt', null);
  // Weekly check-ins actually completed (dev: this browser), for consistency.
  const sessionDates = read<number[]>('rm.session.completions', sessionDoneAt ? [sessionDoneAt] : []);
  const weeksAgo = (t: number) => Math.floor((now.getTime() - t) / WEEK);
  const doneWeeks = new Set(sessionDates.map(weeksAgo).filter((w) => w >= 0 && w < 5)).size;
  const profileName = read<{ firstName?: string }>('rm.profile', {}).firstName;
  const hour = now.getHours();
  const context = latest
    ? [
        { key: 'sleep', label: 'Sleep', value: latest.sleep >= 7 ? 'Rested' : latest.sleep >= 6 ? 'A little short' : 'Short night' },
        { key: 'mood', label: 'Mood', value: ['Low', 'A bit low', 'Okay', 'Good', 'Great'][Math.max(0, Math.min(4, latest.mood - 1))]! },
      ]
    : [];
  return {
    name: profileName || state.profile.firstName || '',
    greeting: hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening',
    date: now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    checkedInToday: state.checkIns.some((c) => c.date === today),
    session: sessionDoneAt !== null && now.getTime() - sessionDoneAt < WEEK ? ('done' as const) : ('due' as const),
    context,
    insight:
      latest && latest.sleep < 6
        ? 'You slept less than usual recently. Short sleep can lower scores for a day or two, so a rested day is a good day for your session.'
        : 'Your trends are most reliable when sessions happen around the same time each week.',
    streak: { done: doneWeeks, of: 5 },
  };
}

/** Week labels for the last `n` weeks, oldest first ("Jul 14"), each the Monday of that week. */
export function weekLabels(n: number, now = new Date()): string[] {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() - (n - 1 - i) * 7);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
}
