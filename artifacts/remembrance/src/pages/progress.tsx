// Trends (redesign Phase 3, rollout 5): one large weekly chart at a time,
// switched with one-tap choices (no carousel, no small multiples), each area's
// page a tap away, and the activities actually finished in this browser. Scores are
// SAMPLE data until real area scores exist (home/home-data.ts).
import { useState } from 'react';
import { CATALOG } from '@workspace/battery';
import { AppShell, ChoiceGroup, DOMAIN_KEYS, DOMAIN_NAMES, ThemeRoot, TrendChart, type Choice } from '@workspace/ui';
import { readHistory } from '@/assess/history';
import { APP_NAV } from '@/pages/dashboard';
import { SAMPLE_DOMAINS, SAMPLE_SCORE, trendSentence, weekLabels } from '@/home/home-data';

const base = import.meta.env.BASE_URL;

type Series = 'score' | (typeof DOMAIN_KEYS)[number];
const SERIES: Choice<Series>[] = [{ value: 'score', label: 'Remembrance Score' }, ...DOMAIN_KEYS.map((k) => ({ value: k, label: DOMAIN_NAMES[k] }))];

/** Finished activities by day, newest first (dev: this browser's history). */
function activityDays(): { day: string; titles: string[] }[] {
  const entries = Object.values(CATALOG)
    .flatMap((c) => readHistory(c.testId).map((h) => ({ at: h.at, title: c.title })))
    .filter((e): e is { at: number; title: string } => typeof e.at === 'number')
    .sort((a, b) => b.at - a.at);
  const days = new Map<string, string[]>();
  for (const e of entries) {
    const day = new Date(e.at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const titles = days.get(day) ?? [];
    if (!titles.includes(e.title)) titles.unshift(e.title); // within a day, in the order they happened
    days.set(day, titles);
  }
  return [...days].slice(0, 8).map(([day, titles]) => ({ day, titles }));
}

export default function Trends() {
  const [series, setSeries] = useState<Series>('score');
  const domain = SAMPLE_DOMAINS.find((d) => d.key === series);
  const weeks = domain?.weeks ?? SAMPLE_SCORE.weeks;
  const labels = weekLabels(weeks.length);
  const color = domain ? `var(--d-${domain.key})` : 'var(--ring-arc)';
  const name = series === 'score' ? 'Remembrance Score' : DOMAIN_NAMES[series];
  const days = activityDays();

  return (
    <ThemeRoot>
      <AppShell nav={APP_NAV} current="trends">
        <div className="flex flex-col gap-6">
          <header>
            <p className="ds-label">The last {weeks.length} weeks</p>
            <h1 className="mt-1 text-[2rem] font-semibold leading-tight">Trends</h1>
            <p className="mt-2" style={{ fontSize: '1rem' }}>
              Sample scores for now. Yours appear after your first full session. A wellness measure, not a medical test.
            </p>
          </header>

          <section className="ds-card">
            <ChoiceGroup name="series" legend="Show the trend for" options={SERIES} value={series} onChange={setSeries} layout="wrap" />
          </section>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="chart-title" aria-live="polite">
            <h2 id="chart-title" className="ds-title">
              {name}
            </h2>
            {/* key: a new series starts on its latest week. */}
            <TrendChart key={series} points={weeks.map((value, i) => ({ label: labels[i]!, value }))} color={color} summary={trendSentence(weeks)} />
            {domain && (
              <a href={`${base}domain/${domain.key}`} className="ds-tap inline-flex items-center self-start font-semibold" style={{ color: 'var(--accent-text)' }}>
                More about {name.toLowerCase()}
              </a>
            )}
          </section>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="history-title">
            <h2 id="history-title" className="ds-title">
              Activities you've finished
            </h2>
            {days.length ? (
              <ol className="flex flex-col">
                {days.map((d) => (
                  <li key={d.day} className="flex flex-col gap-1 border-t py-3 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: 'var(--elevated)' }}>
                    <span className="font-semibold">{d.day}</span>
                    <span className="ds-secondary">{d.titles.join(', ')}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="ds-secondary">Nothing yet. Activities you finish will be listed here, newest first.</p>
            )}
          </section>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
