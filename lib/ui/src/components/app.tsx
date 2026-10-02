// Remembrance app components (redesign, design/DESIGN_LANGUAGE.md). Chosen
// direction: "Oura Calm" Home with mini domain rings as the brand mark.
//
// Rules every component follows: status = word + icon + shape; every number
// has a meaning; tap targets ≥ 56 px (64 px primary); icons always labeled;
// no carousels, no timed UI; all sizes in rem (text scales to 200%).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import '../theme.css';
import { DOMAIN_NAMES, THEME, type DomainKey, type ThemeName } from '../theme';

// ---- Display preferences (theme, text size) -------------------------------------------

export type ThemePreference = 'system' | ThemeName;
export interface DisplayPrefs {
  theme: ThemePreference;
  /** Text size in percent of the default (100–200). */
  textSize: number;
  /** Calmer screens: 'system' follows the device setting. */
  motion: 'system' | 'reduce' | 'full';
  /** Written lines of the examiner's instructions (never of test items). */
  captions: boolean;
}
const PREFS_KEY = 'rm.display';

export function readDisplayPrefs(): DisplayPrefs {
  let prefs: DisplayPrefs = { theme: 'system', textSize: 100, motion: 'system', captions: true };
  try {
    prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    // Defaults.
  }
  // URL overrides for previews and screenshots: ?theme=dark|light&text=100|200.
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const t = q?.get('theme');
  if (t === 'dark' || t === 'light') prefs.theme = t;
  const size = Number(q?.get('text'));
  if (size >= 100 && size <= 200) prefs.textSize = size;
  return prefs;
}

export function saveDisplayPrefs(prefs: DisplayPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Per-device convenience.
  }
}

export function useSystemTheme(): ThemeName {
  const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const [light, setLight] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const on = (e: MediaQueryListEvent) => setLight(e.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, [query]);
  return light ? 'light' : 'dark';
}

/** Applies the theme and text size. Dark is the default unless the system prefers light. */
export function ThemeRoot({ children, prefs }: { children: ReactNode; prefs?: DisplayPrefs }) {
  const p = prefs ?? readDisplayPrefs();
  const system = useSystemTheme();
  const theme = p.theme === 'system' ? system : p.theme;
  useEffect(() => {
    const root = document.documentElement;
    const prev = { fontSize: root.style.fontSize, background: root.style.background };
    root.style.fontSize = `${p.textSize}%`;
    root.style.background = THEME[theme].bg; // behind overscroll, matching the page
    return () => {
      root.style.fontSize = prev.fontSize;
      root.style.background = prev.background;
    };
  }, [p.textSize, theme]);
  const reduce = p.motion === 'reduce';
  return (
    <MotionConfig reducedMotion={p.motion === 'system' ? 'user' : reduce ? 'always' : 'never'}>
      <div
        className="ds-root"
        data-theme={theme}
        data-large-text={p.textSize >= 150 ? '' : undefined}
        data-reduce-motion={reduce ? '' : undefined}
        data-captions={p.captions ? undefined : 'off'}
      >
        {children}
      </div>
    </MotionConfig>
  );
}

// ---- App shell: labeled side rail (web) / tab bar (phone) --------------------------------

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: () => ReactNode;
}

export const NAV_ICONS = { home: HomeIcon, trends: TrendIcon, session: MicIcon, plan: PlanIcon, settings: GearIcon };

export function AppShell({ nav, current, children }: { nav: NavItem[]; current: string; children: ReactNode }) {
  return (
    <div className="ds-shell">
      {/* The rail's background runs the full page height; its links stay pinned. */}
      <div className="ds-rail" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
      <nav className="sticky top-0 flex h-dvh w-full flex-col gap-2 p-6" aria-label="Main">
        <Wordmark />
        <ul className="mt-6 flex flex-col gap-2">
          {nav.map((t) => (
            <li key={t.key}>
              <a
                href={t.href}
                className="ds-tap flex items-center gap-3 rounded-2xl px-4"
                aria-current={t.key === current ? 'page' : undefined}
                style={t.key === current ? { background: 'var(--elevated)', fontWeight: 600 } : { color: 'var(--text-2)' }}
              >
                {t.icon()}
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      </div>
      <div className="flex min-h-dvh flex-col">
        <main className="mx-auto w-full flex-1 px-4 pb-10 pt-6 md:px-8" style={{ maxWidth: '44rem' }}>
          {children}
        </main>
        <nav className="ds-tabbar" aria-label="Main">
          {nav.map((t) => (
            <a
              key={t.key}
              href={t.href}
              className="ds-tap flex flex-col items-center justify-center gap-1 py-2"
              aria-current={t.key === current ? 'page' : undefined}
              style={{ fontSize: '1rem', fontWeight: t.key === current ? 700 : 500, color: t.key === current ? 'var(--accent-text)' : 'var(--text-2)', minHeight: '4rem' }}
            >
              {t.icon()}
              {t.label}
              {/* Current tab: color AND a bar, never color alone. */}
              <span aria-hidden style={{ height: 4, width: 28, borderRadius: 4, background: t.key === current ? 'var(--accent-text)' : 'transparent' }} />
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-3 text-[1.25rem] font-semibold">
      <span aria-hidden className="inline-block h-6 w-6 rounded-full" style={{ background: 'var(--orb)' }} />
      Remembrance
    </span>
  );
}

// ---- Status: word + icon + shape -------------------------------------------------------------

export type Status = 'steady' | 'watch' | 'attention';
export const STATUS_WORD: Record<Status, string> = { steady: 'Steady', watch: 'Worth watching', attention: 'Needs attention' };

export function StatusIcon({ status, size = 20 }: { status: Status; size?: number }) {
  const c = `var(--${status})`;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 20 20">
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

// ---- Rings ------------------------------------------------------------------------------------

function Arc({ r, stroke, value, color, cx }: { r: number; stroke: number; value: number; color: string; cx: number }) {
  const circ = 2 * Math.PI * r;
  return (
    <>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle
        className="ds-ring-fill"
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(100, value)) / 100)}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ '--circ': circ } as CSSProperties}
      />
    </>
  );
}

/** The hero score: the number sits on a solid disc, never over the glow. */
export function ScoreRing({ score, status, size = 'hero' }: { score: number; status: Status; size?: 'hero' | 'compact' }) {
  const hero = size === 'hero';
  return (
    <figure className="relative mx-auto" style={{ width: hero ? 'min(100%, 17.5rem)' : 'min(100%, 7.5rem)' }} aria-label={`Remembrance Score ${score} out of 100, ${STATUS_WORD[status]}`}>
      {hero && <div aria-hidden className="ds-glow ds-glow-breathe" />}
      <svg viewBox="0 0 300 300" className="relative block w-full" aria-hidden>
        <circle cx={150} cy={150} r={115} fill="var(--bg)" />
        <Arc cx={150} r={128} stroke={hero ? 20 : 26} value={score} color="var(--ring-arc)" />
        <text x={150} y={hero ? 172 : 180} textAnchor="middle" fill="var(--text)" style={{ fontSize: hero ? 96 : 104, fontWeight: 600, fontFamily: 'Inter, system-ui' }}>
          {score}
        </text>
        {hero && (
          <text x={150} y={212} textAnchor="middle" fill="var(--text-2)" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.08em' }}>
            OF 100
          </text>
        )}
      </svg>
    </figure>
  );
}

/** A domain's mini ring: the brand mark (from the "Watch Rings" direction). */
export function DomainRing({ domain, score, size = '4.5rem' }: { domain: DomainKey; score: number; size?: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} aria-hidden>
      <Arc cx={50} r={40} stroke={12} value={score} color={`var(--d-${domain})`} />
      <text x={50} y={60} textAnchor="middle" fill="var(--text)" style={{ fontSize: 30, fontWeight: 600 }}>
        {score}
      </text>
    </svg>
  );
}

// ---- Trends ---------------------------------------------------------------------------------------

export function Sparkline({ values, color, height = '3.5rem' }: { values: number[]; color: string; height?: string }) {
  if (values.length < 2) return null;
  const w = 200;
  const h = 60;
  const lo = Math.min(...values) - 3;
  const hi = Math.max(...values) + 3;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 12) + 6, h - 6 - ((v - lo) / (hi - lo)) * (h - 12)] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `spark-${color.replace(/\W/g, '')}`;
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

// ---- Cards -------------------------------------------------------------------------------------------

export interface DomainSummary {
  key: DomainKey;
  score: number;
  status: Status;
  sentence: string;
  weeks: number[];
}

/** One area: mini ring + name + one sentence + status. The whole row is the tap target. */
export function DomainRow({ d, href }: { d: DomainSummary; href: string }) {
  const name = DOMAIN_NAMES[d.key];
  return (
    <a href={href} className="ds-tap flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl py-2" aria-label={`${name}, ${d.score}, ${STATUS_WORD[d.status]}. ${d.sentence} See details`}>
      <DomainRing domain={d.key} score={d.score} />
      <span className="flex min-w-[min(11rem,100%)] flex-1 flex-col gap-1">
        <span className="font-semibold">{name}</span>
        <span className="ds-secondary">{d.sentence}</span>
      </span>
      <StatusChip status={d.status} />
    </a>
  );
}

export function SessionCard({ state, minutes, href, prominent = true }: { state: 'due' | 'upcoming' | 'done'; minutes: number; href: string; prominent?: boolean }) {
  const tag = state === 'due' ? 'Due today' : state === 'done' ? 'Done this week' : 'Coming up';
  return (
    <section className="ds-card ds-rise flex flex-col gap-4" aria-labelledby="session-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="session-title" className="ds-title">
          Your weekly session
        </h2>
        <span className="ds-label inline-flex items-center gap-2" style={{ color: state === 'done' ? 'var(--steady)' : 'var(--accent-text)' }}>
          {state === 'done' && <StatusIcon status="steady" size={18} />}
          {tag}
        </span>
      </div>
      {state === 'done' ? (
        <p className="ds-secondary">Thank you. Your next session opens next week.</p>
      ) : (
        <>
          <p className="ds-secondary">About {minutes} minutes. Find a quiet spot and we'll go at your pace.</p>
          <a href={href} className={`ds-button ${prominent ? 'ds-button-primary' : 'ds-button-secondary'}`}>
            <MicIcon /> Start your session
          </a>
        </>
      )}
    </section>
  );
}

export function CheckInCard({ done, href }: { done: boolean; href: string }) {
  return (
    <section className="ds-card ds-rise flex flex-col gap-4" aria-labelledby="checkin-title">
      <div>
        <h2 id="checkin-title" className="ds-title">
          Today's check-in
        </h2>
        <p className="ds-secondary">{done ? 'Done for today. Thank you.' : 'Optional · About 1 minute'}</p>
      </div>
      {done ? (
        <p className="inline-flex items-center gap-2 font-semibold">
          <StatusIcon status="steady" /> Checked in
        </p>
      ) : (
        <a href={href} className="ds-button ds-button-secondary">
          Start check-in
        </a>
      )}
    </section>
  );
}

export function InsightCard({ text, href }: { text: string; href?: string }) {
  return (
    <section className="ds-card ds-rise flex flex-col gap-3" aria-labelledby="insight-title">
      <p id="insight-title" className="ds-label">
        Something to know
      </p>
      <p>{text}</p>
      {href && (
        <a href={href} className="ds-tap inline-flex items-center gap-2 self-start font-semibold" style={{ color: 'var(--accent-text)' }}>
          Learn more <ChevronIcon />
        </a>
      )}
    </section>
  );
}

export function ContextRow({ items }: { items: { key: string; label: string; value: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="ds-card ds-rise flex flex-col gap-3" aria-labelledby="context-title">
      <p id="context-title" className="ds-label">
        From your check-ins
      </p>
      {/* Wraps instead of scrolling sideways. */}
      <ul className="flex flex-wrap gap-3">
        {items.map((c) => (
          <li key={c.key} className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: 'var(--elevated)', minHeight: '3.5rem' }}>
            <span className="font-semibold">{c.label}:</span> {c.value}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Consistency, never perfection: no broken-streak language. */
export function StreakMeter({ done, of }: { done: number; of: number }) {
  return (
    <section className="ds-card ds-rise flex flex-col gap-3" aria-label={`Consistency: ${done} of the last ${of} weeks`}>
      <p className="ds-label">Consistency</p>
      <div className="flex flex-wrap items-center gap-3">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} aria-hidden className="inline-flex h-10 w-10 items-center justify-center rounded-full" style={{ border: '3px solid var(--ring-arc)', background: i < done ? 'var(--ring-arc)' : 'transparent' }}>
            {i < done && <CheckIcon color="var(--surface)" />}
          </span>
        ))}
      </div>
      {done === 0 ? (
        <p>Your first session starts your weekly rhythm.</p>
      ) : (
        <p>
          <span className="font-semibold">
            {done} of the last {of} weeks.
          </span>{' '}
          <span className="ds-secondary">Showing up is what counts.</span>
        </p>
      )}
    </section>
  );
}

// ---- Icons (always shown with a visible label) ---------------------------------------------------

const ic = { width: '1.2em', height: '1.2em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
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

// ---- Choices: one tap, real radio buttons ---------------------------------------------------------

export interface Choice<V extends string | number> {
  value: V;
  label: string;
  detail?: string;
}

/**
 * A question with one-tap answers (rule 9: no sliders, drags or long-press).
 * Real radio inputs, so arrow keys and screen readers work; the chosen answer
 * shows a filled indicator and a heavier border, never color alone (rule 2).
 */
export function ChoiceGroup<V extends string | number>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  layout = 'list',
  legendClassName = 'ds-title',
}: {
  name: string;
  legend: ReactNode;
  hint?: string;
  options: Choice<V>[];
  value: NoInfer<V> | null;
  onChange: (v: NoInfer<V>) => void;
  layout?: 'list' | 'wrap';
  legendClassName?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={`${legendClassName} mb-3`}>{legend}</legend>
      {hint && <p className="ds-secondary -mt-1">{hint}</p>}
      <div className={layout === 'wrap' ? 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(13rem,100%),1fr))]' : 'flex flex-col gap-3'}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={String(o.value)}
              className="ds-tap ds-choice flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-2"
              style={{ border: `${on ? 3 : 2}px solid ${on ? 'var(--accent-text)' : 'var(--track)'}`, background: on ? 'var(--elevated)' : 'transparent' }}
            >
              <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onChange(o.value)} />
              <svg aria-hidden viewBox="0 0 24 24" width="1.25em" height="1.25em" className="shrink-0">
                <circle cx="12" cy="12" r="10" fill="none" stroke={on ? 'var(--accent-text)' : 'var(--text-2)'} strokeWidth="2.5" />
                {on && <circle cx="12" cy="12" r="5.5" fill="var(--accent-text)" />}
              </svg>
              <span className="flex min-w-0 flex-col break-words">
                <span className="font-semibold">{o.label}</span>
                {o.detail && (
                  <span className="ds-secondary" style={{ fontSize: '1rem' }}>
                    {o.detail}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Choose any number: real checkboxes, a square box with a check when chosen. */
export function CheckList({
  legend,
  hint,
  options,
  values,
  onChange,
}: {
  legend: ReactNode;
  hint?: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="ds-title mb-3">{legend}</legend>
      {hint && <p className="ds-secondary -mt-1">{hint}</p>}
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <label
            key={o}
            className="ds-tap ds-choice flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-2"
            style={{ border: `${on ? 3 : 2}px solid ${on ? 'var(--accent-text)' : 'var(--track)'}`, background: on ? 'var(--elevated)' : 'transparent' }}
          >
            <input type="checkbox" className="sr-only" checked={on} onChange={() => onChange(on ? values.filter((v) => v !== o) : [...values, o])} />
            {/* Square, so "choose any" never looks like a one-answer radio circle. */}
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center"
              style={{
                width: '1.25em',
                height: '1.25em',
                borderRadius: '0.25em',
                border: `2.5px solid ${on ? 'var(--accent-text)' : 'var(--text-2)'}`,
                background: on ? 'var(--accent-text)' : 'transparent',
              }}
            >
              {on && <CheckIcon color="var(--surface)" />}
            </span>
            <span className="min-w-0 break-words font-semibold">{o}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

// ---- Detail screens: top bar, trend chart, usual-range bar ---------------------------------------

/** Back is always top-left, always labeled (rule 12). */
export function TopBar({ backHref, backLabel, title }: { backHref: string; backLabel: string; title?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <a href={backHref} className="ds-tap -ml-2 inline-flex items-center gap-2 rounded-2xl px-2 font-semibold" style={{ color: 'var(--accent-text)' }}>
        {/* Sized in em so the arrow grows with the text. */}
        <svg {...ic} width="1.2em" height="1.2em">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {backLabel}
      </a>
      {title && <span className="ds-label">{title}</span>}
    </div>
  );
}

export interface WeekPoint {
  /** Short label, e.g. "Jul 14". */
  label: string;
  value: number;
}

/**
 * Weekly trend: a plain-language summary above, a calm line (≥ 3 px, points
 * ≥ 10 px, no gridlines), and week buttons to read any value (no scrub-only).
 */
export function TrendChart({ points, color, summary, unitLabel = 'score' }: { points: WeekPoint[]; color: string; summary: string; unitLabel?: string }) {
  const [selected, setSelected] = useState(points.length - 1);
  if (points.length < 2) return null;
  const w = 600;
  const h = 200;
  const pad = 22;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values) - 4;
  const hi = Math.max(...values) + 4;
  const xy = points.map((p, i) => [pad + (i / (points.length - 1)) * (w - pad * 2), pad + (1 - (p.value - lo) / (hi - lo)) * (h - pad * 2)] as const);
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `trend-${color.replace(/\W/g, '')}`;
  const sel = points[selected]!;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[1.2rem] font-medium">{summary}</p>
      <figure className="flex flex-col gap-2" aria-label={`${points.length}-week trend. ${summary}`}>
        {/* Fixed proportions, so points stay round: radius 10 → ≥ 12 px across even on a phone. */}
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.25" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${xy.at(-1)![0]},${h} L${xy[0]![0]},${h} Z`} fill={`url(#${id})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {xy.map(([x, y], i) =>
            i === selected ? (
              <circle key={i} cx={x} cy={y} r={14} fill="var(--surface)" stroke={color} strokeWidth={7} />
            ) : (
              <circle key={i} cx={x} cy={y} r={10} fill={color} />
            ),
          )}
        </svg>
        <div className="flex justify-between gap-4 pt-2" style={{ fontSize: '1rem' }}>
          <span className="ds-secondary">{points[0]!.label}</span>
          <span className="ds-secondary">This week</span>
        </div>
      </figure>
      <p className="font-semibold" aria-live="polite">
        Week of {sel.label}: {sel.value} {unitLabel === 'score' ? '' : unitLabel}
      </p>
      <fieldset>
        <legend className="ds-label mb-2">Choose a week</legend>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))' }}>
          {points.map((p, i) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              className="ds-tap rounded-2xl px-2 font-semibold"
              style={{ fontSize: '1rem', border: `2px solid ${i === selected ? color : 'var(--track)'}`, background: i === selected ? 'var(--elevated)' : 'transparent' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** "Your usual" band with this week's marker (Oura Vitals). No axes to read. */
export function UsualRangeBar({ value, usual, color }: { value: number; usual: [number, number]; color: string }) {
  const lo = Math.min(usual[0], value) - 6;
  const hi = Math.max(usual[1], value) + 6;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const inside = value >= usual[0] && value <= usual[1];
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ background: 'var(--track)' }} />
        <div className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full" style={{ left: pct(usual[0]), width: `calc(${pct(usual[1])} - ${pct(usual[0])})`, background: color, opacity: 0.45 }} />
        {/* Marker: a ring with a contrasting outline, so it stands apart from the band it may touch. */}
        <div className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: pct(value), background: 'var(--surface)', border: `6px solid ${color}`, boxShadow: '0 0 0 3px var(--surface)' }} />
      </div>
      <p>
        <span className="font-semibold">This week: {value}.</span> <span className="ds-secondary">Your usual: {usual[0]}–{usual[1]}.</span>{' '}
        {inside ? 'Right in your usual range.' : value < usual[0] ? 'A little below your usual range.' : 'Above your usual range.'}
      </p>
    </div>
  );
}
