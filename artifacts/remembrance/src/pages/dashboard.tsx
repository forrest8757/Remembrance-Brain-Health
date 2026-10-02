// Home (redesign Phase 3, design/DESIGN_LANGUAGE.md; direction "Oura Calm" with
// mini domain rings). One hero number, one primary action (Start your session),
// a calm vertical feed. Scores are SAMPLE data until the Remembrance Score is
// computed from real sessions (home/home-data.ts).
import { useDemoState } from '@/lib/store';
import {
  AppShell,
  CheckInCard,
  ContextRow,
  DomainRow,
  InsightCard,
  NAV_ICONS,
  ScoreRing,
  SessionCard,
  StatusChip,
  StreakMeter,
  ThemeRoot,
  type NavItem,
} from '@workspace/ui';
import { homeData, SAMPLE_DOMAINS, SAMPLE_SCORE } from '@/home/home-data';

const base = import.meta.env.BASE_URL;
const to = (path: string) => `${base}${path.replace(/^\//, '')}`;

export const APP_NAV: NavItem[] = [
  { key: 'home', label: 'Home', href: to('/dashboard'), icon: NAV_ICONS.home },
  { key: 'trends', label: 'Trends', href: to('/progress'), icon: NAV_ICONS.trends },
  { key: 'session', label: 'Session', href: to('/assess/session'), icon: NAV_ICONS.session },
  { key: 'plan', label: 'Plan', href: to('/plan'), icon: NAV_ICONS.plan },
  { key: 'settings', label: 'Settings', href: to('/settings'), icon: NAV_ICONS.settings },
];

/** Temporary: every test, one tap away, while the suite is being built. */
const PREVIEW_LINKS = [
  { href: '/assess/session', name: 'Weekly check-in (all tests in a row)' },
  { href: '/assess/story-immediate', name: 'A Short Story' },
  { href: '/assess/story-delayed', name: 'The Story Again' },
  { href: '/assess/phonemic-fluency', name: 'Words by Letter' },
  { href: '/assess/oral-trails', name: 'Counting Quickly' },
  { href: '/assess/category-fluency', name: 'Naming Things' },
  { href: '/assess/number-span', name: 'Number Span' },
  { href: '/assess/toy-colors', name: 'Say three colors' },
];

function lastResult(href: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(`rm.${href.split('/').pop()}.lastResult`) ?? 'null') as { summary?: string } | null)?.summary ?? null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { state } = useDemoState();
  const h = homeData(state);
  return (
    <ThemeRoot>
      <AppShell nav={APP_NAV} current="home">
        <div className="flex flex-col gap-6">
          <header>
            <p className="ds-label">{h.date}</p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight">
              {h.greeting}
              {h.name ? `, ${h.name}` : ''}.
            </h1>
          </header>

          <section className="flex flex-col items-center gap-4 py-4 text-center" aria-labelledby="score-label">
            <ScoreRing score={SAMPLE_SCORE.score} status={SAMPLE_SCORE.status} />
            <p id="score-label" className="ds-label">
              Remembrance Score
            </p>
            <StatusChip status={SAMPLE_SCORE.status} />
            <p className="text-[1.4rem] font-medium" style={{ maxWidth: '26rem' }}>
              {SAMPLE_SCORE.sentence}
            </p>
            <p style={{ fontSize: '1rem' }}>
              Sample scores for now. Yours appear after your first full session. A wellness measure, not a medical test.
            </p>
          </section>

          <SessionCard state={h.session} minutes={25} href={to('/assess/session')} />

          <section className="ds-card ds-rise flex flex-col gap-2" aria-labelledby="areas-title">
            <h2 id="areas-title" className="ds-title">
              Your five areas
            </h2>
            {SAMPLE_DOMAINS.map((d) => (
              <DomainRow key={d.key} d={d} href={to(`/domain/${d.key}`)} />
            ))}
          </section>

          <CheckInCard done={h.checkedInToday} href={to('/check-in')} />
          <InsightCard text={h.insight} />
          <ContextRow items={h.context} />
          <StreakMeter done={h.streak.done} of={h.streak.of} />

          <details className="ds-card">
            <summary className="ds-tap flex cursor-pointer items-center font-semibold">Preview tools (testing only)</summary>
            <ul className="mt-3 flex flex-col gap-2">
              {PREVIEW_LINKS.map((l) => {
                const last = lastResult(l.href);
                return (
                  <li key={l.href}>
                    <a href={to(l.href)} className="ds-tap flex flex-col justify-center rounded-2xl px-4 py-2" style={{ background: 'var(--elevated)' }}>
                      <span className="font-semibold">{l.name}</span>
                      {last && <span className="ds-secondary" style={{ fontSize: '1rem' }}>Last result: {last}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
