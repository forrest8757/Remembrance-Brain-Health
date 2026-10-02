// Shared kit for the three Home directions (redesign Phase 2). Static screens
// with realistic fake data. ?theme=dark|light and ?text=100|200 pick the variant.
// Every status has a word + icon + shape; every number has a meaning; every
// tap target is ≥ 56px (64px primary); no carousels; nothing timed.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import './home.css';

// ---- Fake data --------------------------------------------------------------------

export type Status = 'steady' | 'watch' | 'attention';
export const STATUS_WORD: Record<Status, string> = { steady: 'Steady', watch: 'Worth watching', attention: 'Needs attention' };

export interface Domain {
  key: 'memory' | 'attention' | 'executive' | 'language' | 'orientation';
  name: string;
  score: number;
  status: Status;
  sentence: string;
  /** Last 10 weekly scores, oldest first. */
  weeks: number[];
}

export const DATA = {
  name: 'Margaret',
  date: 'Thursday, October 2',
  score: 78,
  scoreStatus: 'steady' as Status,
  scoreSentence: 'Your score has been steady for the last 8 weeks.',
  domains: [
    { key: 'memory', name: 'Memory', score: 74, status: 'steady', sentence: 'Your memory has been steady this month.', weeks: [71, 72, 74, 73, 72, 75, 74, 73, 74, 74] },
    { key: 'attention', name: 'Attention', score: 81, status: 'steady', sentence: 'Up 3 points over the last 4 weeks.', weeks: [76, 77, 78, 78, 77, 78, 79, 80, 80, 81] },
    { key: 'executive', name: 'Executive Function', score: 69, status: 'watch', sentence: 'A little lower the last 3 weeks. Sleep may play a part.', weeks: [74, 73, 74, 75, 74, 73, 72, 70, 70, 69] },
    { key: 'language', name: 'Language', score: 85, status: 'steady', sentence: 'Consistently strong.', weeks: [84, 85, 84, 86, 85, 85, 84, 86, 85, 85] },
    { key: 'orientation', name: 'Orientation', score: 92, status: 'steady', sentence: 'Right where it usually is.', weeks: [91, 92, 92, 93, 92, 91, 92, 92, 93, 92] },
  ] as Domain[],
  session: { state: 'due' as const, title: 'Your weekly session', detail: 'Due today · About 25 minutes' },
  checkIn: { title: "Today's check-in", detail: 'About 1 minute', done: false },
  insight: { text: "You slept less than usual before last week's session. Short sleep can lower scores for a day or two." },
  context: [
    { key: 'sleep', label: 'Sleep', value: 'Rested' },
    { key: 'mood', label: 'Mood', value: 'Good' },
    { key: 'energy', label: 'Energy', value: 'Lower than usual' },
  ],
  streak: { done: 4, of: 5 },
};

// ---- Frame (theme, text size, nav) --------------------------------------------------

export function useVariant() {
  const q = new URLSearchParams(window.location.search);
  return { theme: (q.get('theme') === 'light' ? 'light' : 'dark') as 'dark' | 'light', text: q.get('text') === '200' ? 200 : 100 };
}

const TABS = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'trends', label: 'Trends', icon: TrendIcon },
  { key: 'session', label: 'Session', icon: MicIcon },
  { key: 'plan', label: 'Plan', icon: PlanIcon },
  { key: 'settings', label: 'Settings', icon: GearIcon },
];

export function Frame({ children, direction }: { children: ReactNode; direction: string }) {
  const { theme, text } = useVariant();
  // Simulates the OS text size: every size is in rem.
  useEffect(() => {
    document.documentElement.style.fontSize = `${text}%`;
    document.documentElement.style.background = theme === 'dark' ? '#0B1426' : '#F5F1EA';
    document.title = `Remembrance Home · ${direction}`;
  }, [text, theme, direction]);
  return (
    <div className="hd-root" data-theme={theme} data-large-text={text >= 150 ? '' : undefined} lang="en">
      <div className="hd-shell">
        <nav className="hd-rail sticky top-0 h-dvh flex-col gap-2 p-6" aria-label="Main" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Wordmark />
          <ul className="mt-6 flex flex-col gap-2">
            {TABS.map((t) => (
              <li key={t.key}>
                <a
                  href="#"
                  className="hd-tap flex items-center gap-3 rounded-2xl px-4"
                  aria-current={t.key === 'home' ? 'page' : undefined}
                  style={t.key === 'home' ? { background: 'var(--elevated)', fontWeight: 600 } : { color: 'var(--text-2)' }}
                >
                  <t.icon />
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-h-dvh flex-col">
          <main className="mx-auto w-full flex-1 px-4 pb-10 pt-6 md:px-8" style={{ maxWidth: '62rem' }}>
            {children}
          </main>
          <nav className="hd-tabbar" aria-label="Main">
            {TABS.map((t) => (
              <a
                key={t.key}
                href="#"
                className="hd-tap flex flex-col items-center justify-center gap-1 py-2"
                aria-current={t.key === 'home' ? 'page' : undefined}
                style={{ fontSize: '1rem', fontWeight: t.key === 'home' ? 700 : 500, color: t.key === 'home' ? 'var(--accent-text)' : 'var(--text-2)', minHeight: '4rem' }}
              >
                <t.icon />
                {t.label}
                {/* Active tab: color AND a bar, never color alone. */}
                <span aria-hidden style={{ height: 4, width: 28, borderRadius: 4, background: t.key === 'home' ? 'var(--accent-text)' : 'transparent' }} />
              </a>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-3 text-[1.25rem] font-semibold">
      <span aria-hidden className="inline-block h-6 w-6 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #8ff1fa, var(--accent) 60%, #0b6b75)' }} />
      Remembrance
    </span>
  );
}

export function Greeting() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="hd-label">{DATA.date}</p>
        <h1 className="mt-1 text-[2rem] font-semibold leading-tight">Good morning, {DATA.name}.</h1>
      </div>
    </header>
  );
}

// ---- Status chip: word + icon + shape -------------------------------------------------

export function StatusIcon({ status, size = 20 }: { status: Status; size?: number }) {
  const c = `var(--${status})`;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
      {status === 'steady' && (
        <>
          <circle cx="10" cy="10" r="9" fill={c} />
          <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="var(--surface)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === 'watch' && (
        <>
          <circle cx="10" cy="10" r="8" fill="none" stroke={c} strokeWidth="2.5" />
          <path d="M10 2a8 8 0 0 1 0 16z" fill={c} />
        </>
      )}
      {status === 'attention' && <path d="M10 1.5l8.5 8.5-8.5 8.5L1.5 10z" fill={c} />}
    </svg>
  );
}

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ border: `2px solid var(--${status})`, fontSize: '1rem', fontWeight: 600 }}>
      <StatusIcon status={status} size={18} />
      {STATUS_WORD[status]}
    </span>
  );
}

// ---- Rings ------------------------------------------------------------------------------

/** One arc. `value` 0–100. Track is decorative; the arc is the information (≥ 3:1). */
function Arc({ r, stroke, value, color, cx }: { r: number; stroke: number; value: number; color: string; cx: number }) {
  const circ = 2 * Math.PI * r;
  return (
    <>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle
        className="hd-ring-fill"
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - value / 100)}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ '--circ': circ } as CSSProperties}
      />
    </>
  );
}

/** Hero score ring: the number sits on a solid disc (no text over the glow). */
export function ScoreRing({ size = 'hero', withDomains = false }: { size?: 'hero' | 'compact'; withDomains?: boolean }) {
  const vb = 300;
  const c = vb / 2;
  const main = withDomains ? { r: 70, stroke: 18 } : { r: 128, stroke: size === 'hero' ? 20 : 26 };
  const width = size === 'hero' ? (withDomains ? 'min(100%, 22rem)' : 'min(100%, 17.5rem)') : 'min(100%, 7.5rem)';
  return (
    <figure className="relative mx-auto" style={{ width }} aria-label={`Remembrance Score ${DATA.score} out of 100, ${STATUS_WORD[DATA.scoreStatus]}`}>
      {size === 'hero' && <div aria-hidden className="hd-glow hd-glow-breathe" />}
      <svg viewBox={`0 0 ${vb} ${vb}`} className="relative block w-full" aria-hidden>
        {withDomains &&
          DATA.domains.map((d, i) => <Arc key={d.key} cx={c} r={140 - i * 14} stroke={10} value={d.score} color={`var(--d-${d.key})`} />)}
        <circle cx={c} cy={c} r={main.r - main.stroke / 2 - 2} fill="var(--bg)" />
        <Arc cx={c} r={main.r} stroke={main.stroke} value={DATA.score} color="var(--ring-arc)" />
        <text x={c} y={c + (withDomains ? 16 : size === 'hero' ? 22 : 30)} textAnchor="middle" fill="var(--text)" style={{ fontSize: withDomains ? 52 : size === 'hero' ? 96 : 104, fontWeight: 600, fontFamily: 'Inter, system-ui' }}>
          {DATA.score}
        </text>
        {size === 'hero' && !withDomains && (
          <text x={c} y={c + 62} textAnchor="middle" fill="var(--text-2)" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.08em' }}>
            OF 100
          </text>
        )}
      </svg>
    </figure>
  );
}

/** A small domain ring (row variant). */
export function MiniRing({ d, size = '4.5rem' }: { d: Domain; size?: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, flexShrink: 0 }} aria-hidden>
      <Arc cx={50} r={40} stroke={12} value={d.score} color={`var(--d-${d.key})`} />
      <text x={50} y={60} textAnchor="middle" fill="var(--text)" style={{ fontSize: 30, fontWeight: 600 }}>
        {d.score}
      </text>
    </svg>
  );
}

// ---- Sparkline / trend -----------------------------------------------------------------

export function Sparkline({ values, color, height = '3.5rem' }: { values: number[]; color: string; height?: string }) {
  const w = 200;
  const h = 60;
  const lo = Math.min(...values) - 3;
  const hi = Math.max(...values) + 3;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 12) + 6, h - 6 - ((v - lo) / (hi - lo)) * (h - 12)] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `g${color.replace(/\W/g, '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${pts.at(-1)![0]},${h} L${pts[0]![0]},${h} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="5.5" fill={color} />
    </svg>
  );
}

// ---- Cards --------------------------------------------------------------------------------

export function WeeklySessionCard({ prominent = true }: { prominent?: boolean }) {
  return (
    <section className="hd-card hd-rise flex flex-col gap-4" aria-labelledby="session-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="session-title" className="hd-title">
          {DATA.session.title}
        </h2>
        <span className="hd-label" style={{ color: 'var(--accent-text)' }}>
          Due today
        </span>
      </div>
      <p className="hd-secondary">About 25 minutes. Find a quiet spot and we'll go at your pace.</p>
      <button type="button" className={`hd-button ${prominent ? 'hd-button-primary' : 'hd-button-secondary'}`}>
        <MicIcon /> Start your session
      </button>
    </section>
  );
}

export function CheckInCard() {
  return (
    <section className="hd-card hd-rise flex flex-col gap-4" aria-labelledby="checkin-title">
      <div>
        <h2 id="checkin-title" className="hd-title">
          {DATA.checkIn.title}
        </h2>
        <p className="hd-secondary">Optional · {DATA.checkIn.detail}</p>
      </div>
      <button type="button" className="hd-button hd-button-secondary">
        Start check-in
      </button>
    </section>
  );
}

export function InsightCard() {
  return (
    <section className="hd-card hd-rise flex flex-col gap-3" aria-labelledby="insight-title">
      <p id="insight-title" className="hd-label">
        Something to know
      </p>
      <p>{DATA.insight.text}</p>
      <a href="#" className="hd-tap inline-flex items-center gap-2 self-start font-semibold" style={{ color: 'var(--accent-text)' }}>
        Learn more <ChevronIcon />
      </a>
    </section>
  );
}

export function ContextRow() {
  return (
    <section className="hd-card hd-rise flex flex-col gap-3" aria-labelledby="context-title">
      <p id="context-title" className="hd-label">
        From your check-ins
      </p>
      {/* Wraps instead of scrolling sideways. */}
      <ul className="flex flex-wrap gap-3">
        {DATA.context.map((c) => (
          <li key={c.key} className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: 'var(--elevated)', minHeight: '3.5rem' }}>
            <span className="font-semibold">{c.label}:</span> {c.value}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StreakMeter() {
  const { done, of } = DATA.streak;
  return (
    <section className="hd-card hd-rise flex flex-col gap-3" aria-label={`Consistency: ${done} of the last ${of} weeks`}>
      <p className="hd-label">Consistency</p>
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ border: '3px solid var(--ring-arc)', background: i < done ? 'var(--ring-arc)' : 'transparent' }}>
            {i < done && <CheckIcon color="var(--surface)" />}
          </span>
        ))}
      </div>
      <p>
        <span className="font-semibold">{done} of the last {of} weeks.</span> <span className="hd-secondary">Showing up is what counts.</span>
      </p>
    </section>
  );
}

/** One domain as a full row: mini ring (or swatch) + name + status + sentence. */
export function DomainRow({ d, ring = true }: { d: Domain; ring?: boolean }) {
  return (
    <a href="#" className="hd-tap flex flex-wrap items-center gap-4 rounded-2xl py-2" aria-label={`${d.name}, ${d.score}, ${STATUS_WORD[d.status]}. See details`}>
      {ring ? <MiniRing d={d} /> : <span aria-hidden className="h-4 w-4 shrink-0 rounded-full" style={{ background: `var(--d-${d.key})` }} />}
      <span className="min-w-[min(10rem,100%)] flex-1">
        <span className="block font-semibold">
          {d.name}
          {!ring && <span className="ml-2 font-semibold">{d.score}</span>}
        </span>
        <span className="hd-secondary block">{d.sentence}</span>
      </span>
      <StatusChip status={d.status} />
    </a>
  );
}

export function DomainCard({ d }: { d: Domain }) {
  return (
    <a href="#" className="hd-card hd-rise flex flex-col gap-3" aria-label={`${d.name}, ${d.score}, ${STATUS_WORD[d.status]}. See details`}>
      <div className="flex items-center justify-between gap-2">
        <span className="hd-label" style={{ color: 'var(--text)' }}>
          <span aria-hidden className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: `var(--d-${d.key})` }} />
          {d.name}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-[2.5rem] font-semibold leading-none">{d.score}</span>
        <StatusChip status={d.status} />
      </div>
      <p className="hd-secondary">{d.sentence}</p>
      <Sparkline values={d.weeks} color={`var(--d-${d.key})`} />
      <span className="inline-flex items-center gap-2 font-semibold" style={{ color: 'var(--accent-text)' }}>
        See details <ChevronIcon />
      </span>
    </a>
  );
}

// ---- Icons (always paired with a visible label) ----------------------------------------------

const ic = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
export function HomeIcon() {
  return (
    <svg {...ic}>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
export function TrendIcon() {
  return (
    <svg {...ic}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
export function MicIcon() {
  return (
    <svg {...ic}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
export function PlanIcon() {
  return (
    <svg {...ic}>
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}
export function GearIcon() {
  return (
    <svg {...ic}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
export function ChevronIcon() {
  return (
    <svg {...ic} width={20} height={20}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
export function CheckIcon({ color }: { color: string }) {
  return (
    <svg {...ic} width={20} height={20} stroke={color} strokeWidth={3}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
