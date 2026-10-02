// Domain detail (redesign Phase 3, rollout 2): one area's score, how it
// compares with your usual, a 12-week trend with week buttons, what it means,
// what helps, and which activities measure it. Plain language, calm framing.
// Scores are SAMPLE data until real area scores exist (home/home-data.ts).
import { useParams } from 'wouter';
import {
  AppShell,
  DOMAIN_KEYS,
  DOMAIN_NAMES,
  DomainRing,
  StatusChip,
  StatusIcon,
  ThemeRoot,
  TopBar,
  TrendChart,
  UsualRangeBar,
  type DomainKey,
} from '@workspace/ui';
import { APP_NAV } from '@/pages/dashboard';
import { SAMPLE_DOMAINS, trendSentence, weekLabels } from '@/home/home-data';
import { DOMAIN_CONTENT } from '@/home/domain-content';

const base = import.meta.env.BASE_URL;

export default function DomainDetail() {
  const { id } = useParams<{ id: string }>();
  const key: DomainKey = (DOMAIN_KEYS as readonly string[]).includes(id) ? (id as DomainKey) : 'memory';
  const d = SAMPLE_DOMAINS.find((x) => x.key === key)!;
  const content = DOMAIN_CONTENT[key];
  const name = DOMAIN_NAMES[key];
  const labels = weekLabels(d.weeks.length);
  const recent = d.weeks.slice(-9, -1);
  const usual: [number, number] = [Math.min(...recent), Math.max(...recent)];
  const color = `var(--d-${key})`;

  return (
    <ThemeRoot>
      <AppShell nav={APP_NAV} current="home">
        <div className="flex flex-col gap-6">
          <TopBar backHref={`${base}dashboard`} backLabel="Back to Home" />

          <header className="flex flex-wrap items-center gap-6">
            <DomainRing domain={key} score={d.score} size="8rem" />
            <div className="flex min-w-[min(14rem,100%)] flex-1 flex-col gap-2">
              <h1 className="text-[2rem] font-semibold leading-tight">{name}</h1>
              <span className="self-start">
                <StatusChip status={d.status} />
              </span>
              <p className="text-[1.2rem]">{d.sentence}</p>
            </div>
          </header>
          <p style={{ fontSize: '1rem' }}>Sample scores for now. Yours appear after your first full session.</p>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="usual-title">
            <h2 id="usual-title" className="ds-title">
              Compared with your usual
            </h2>
            <UsualRangeBar value={d.score} usual={usual} color={color} />
          </section>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="trend-title">
            <h2 id="trend-title" className="ds-title">
              The last {d.weeks.length} weeks
            </h2>
            <TrendChart points={d.weeks.map((value, i) => ({ label: labels[i]!, value }))} color={color} summary={trendSentence(d.weeks)} />
          </section>

          {/* After the data, not before it: what happened first, then what to do (rule 15). */}
          {d.status !== 'steady' && (
            <section className="ds-card flex flex-col gap-3" aria-labelledby="watch-title" style={{ borderColor: `var(--${d.status})` }}>
              <h2 id="watch-title" className="ds-title inline-flex items-center gap-3">
                <StatusIcon status={d.status} size={24} /> Worth keeping an eye on
              </h2>
              <p>Scores move up and down for lots of everyday reasons, like sleep, stress, or a busy week. Keep going with your weekly sessions.</p>
              <p>If it stays lower for a month or more, it may be worth mentioning to your doctor. You can share your results with them anytime.</p>
            </section>
          )}

          <section className="ds-card flex flex-col gap-3" aria-labelledby="means-title">
            <h2 id="means-title" className="ds-title">
              What {name.toLowerCase()} means
            </h2>
            <p>{content.means}</p>
            <p className="ds-secondary">{content.example}</p>
          </section>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="helps-title">
            <h2 id="helps-title" className="ds-title">
              What helps
            </h2>
            <ul className="flex flex-col gap-3">
              {content.helps.map((h) => (
                <li key={h} className="flex items-start gap-3">
                  <span aria-hidden className="mt-2 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="min-w-0 break-words [hyphens:auto]">{h}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="ds-card flex flex-col gap-3" aria-labelledby="measured-title">
            <h2 id="measured-title" className="ds-title">
              How it's measured
            </h2>
            <p className="ds-secondary">These activities in your weekly session tell us about {name.toLowerCase()}:</p>
            {/* A plain list: these aren't buttons, so they don't look like them. */}
            <ul className="flex flex-col gap-2">
              {content.measuredBy.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  <span aria-hidden className="mt-2 inline-block h-3 w-3 shrink-0 rounded-full" style={{ border: `3px solid ${color}` }} />
                  <span className="min-w-0 break-words [hyphens:auto]">
                    <span className="font-semibold">{m.title}</span>
                    {!m.available && <span className="ds-secondary"> (not available yet)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}
