// Direction B — "Clarity": Apple Health–style precision, crisp navy, strong
// typographic hierarchy, white cards on cream, left-aligned reading order.
import type { ReactNode } from 'react';
import { COPY, DirectionFrame, useFakeAmplitude, type ScreenKey } from './_shared';
import './directions.css';

const SANS = { fontFamily: "'Inter', system-ui, sans-serif" };

type OrbMode = 'still' | 'speaking' | 'listening';

// A precise orb: solid core plus a thin segmented level ring. The ring maps
// amplitude only, so it looks the same for right, wrong or off-topic speech.
function Orb({ mode, size = 200 }: { mode: OrbMode; size?: number }) {
  const amp = useFakeAmplitude(mode === 'listening');
  const level = mode === 'listening' ? amp : 0;
  const segments = 48;
  const lit = Math.round(level * segments);
  const r = size / 2 - 6;

  return (
    <div aria-hidden className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {Array.from({ length: segments }, (_, i) => {
          const a = (i / segments) * Math.PI * 2 - Math.PI / 2;
          const on = mode === 'listening' && i < lit;
          return (
            <line
              key={i}
              x1={size / 2 + Math.cos(a) * (r - 10)}
              y1={size / 2 + Math.sin(a) * (r - 10)}
              x2={size / 2 + Math.cos(a) * r}
              y2={size / 2 + Math.sin(a) * r}
              stroke={on ? '#1BCEDF' : '#E4E7EC'}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div
        className={`absolute rounded-full ${mode === 'speaking' ? 'ad-breathe' : ''}`}
        style={{
          inset: size * 0.2,
          background: 'linear-gradient(160deg, #3FE0EE 0%, #1BCEDF 55%, #129FAD 100%)',
          transform: mode === 'listening' ? `scale(${1 + level * 0.08})` : undefined,
        }}
      />
    </div>
  );
}

function ProgressRail() {
  const { current, total } = COPY.progress;
  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-[18px] font-medium" style={{ color: 'var(--ad-ink-soft)' }}>
        <span>
          Activity {current} of {total}
        </span>
      </div>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i < current - 1 ? 'var(--ad-navy)' : i === current - 1 ? 'var(--ad-cyan)' : '#DCD6CB',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Page({
  children,
  aside,
  rail = false,
  pause = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  rail?: boolean;
  pause?: boolean;
}) {
  return (
    <div className="ad-root flex min-h-[100dvh] flex-col" style={SANS}>
      <header
        className="flex min-h-[80px] items-center justify-between border-b px-5 md:px-10"
        style={{ borderColor: 'var(--ad-cream-deep)', background: 'var(--ad-white)' }}
      >
        <span className="text-[20px] font-semibold tracking-tight">Remembrance</span>
        {pause && (
          <button
            type="button"
            className="ad-focus min-h-[64px] rounded-2xl px-6 text-[20px] font-medium"
            style={{ background: 'var(--ad-cream)', color: 'var(--ad-navy)' }}
          >
            {COPY.pause}
          </button>
        )}
      </header>
      <main className="mx-auto grid w-full max-w-[1080px] flex-1 content-center gap-8 px-5 py-10 md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-10">
        <div className="flex flex-col justify-center gap-8">
          {rail && <ProgressRail />}
          {children}
        </div>
        {aside && (
          // On phones the card sits above the copy so live status (mic level,
          // orb) is never below the button that depends on it.
          <div
            className="order-first flex items-center justify-center rounded-[28px] p-6 md:order-none md:p-12"
            style={{ background: 'var(--ad-white)', boxShadow: '0 1px 2px rgba(30,58,95,0.06), 0 12px 32px -12px rgba(30,58,95,0.12)' }}
          >
            {aside}
          </div>
        )}
      </main>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[18px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--ad-ink-soft)' }}>
      {children}
    </p>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[72px] w-full rounded-2xl px-8 text-[22px] font-semibold transition-transform duration-200 active:scale-[0.98] md:w-auto md:min-w-[300px]"
      style={{ background: 'var(--ad-navy)', color: 'var(--ad-white)' }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[64px] w-full rounded-2xl border-2 px-8 text-[20px] font-medium md:w-auto"
      style={{ borderColor: 'var(--ad-navy)', color: 'var(--ad-navy)' }}
    >
      {children}
    </button>
  );
}

function Screen({ screen }: { screen: ScreenKey }) {
  switch (screen) {
    case 'welcome':
      return (
        <Page aside={<Orb mode="still" size={180} />}>
          <Eyebrow>Weekly session</Eyebrow>
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight md:text-[52px]">
            {COPY.welcomeTitle}
          </h1>
          <p className="max-w-[32ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
            {COPY.welcomeBody}
          </p>
          <div className="flex flex-col gap-4 md:flex-row">
            <PrimaryButton>{COPY.welcomeCta}</PrimaryButton>
            <SecondaryButton>{COPY.welcomeSecondary}</SecondaryButton>
          </div>
        </Page>
      );
    case 'mic-check':
      return (
        <Page
          aside={
            <div className="flex flex-col items-center gap-6">
              <Orb mode="listening" size={220} />
              <p role="status" className="flex items-center gap-3 text-[22px] font-semibold">
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: 'var(--ad-cyan)' }} />
                {COPY.micStatus}
              </p>
            </div>
          }
        >
          <Eyebrow>Step 1 of 3 · Setup</Eyebrow>
          <h1 className="text-[36px] font-bold leading-tight tracking-tight md:text-[44px]">{COPY.micTitle}</h1>
          <p className="max-w-[32ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
            {COPY.micBody}
          </p>
          <PrimaryButton>{COPY.micCta}</PrimaryButton>
        </Page>
      );
    case 'examiner-speaking':
      return (
        <Page rail pause aside={<Orb mode="speaking" size={220} />}>
          <Eyebrow>{COPY.examinerLabel}</Eyebrow>
          <p className="max-w-[28ch] text-[28px] font-medium leading-snug md:text-[32px]" aria-live="polite">
            {COPY.examinerLine}
          </p>
        </Page>
      );
    case 'listening':
      return (
        <Page rail pause aside={<Orb mode="listening" size={220} />}>
          <Eyebrow>Listening</Eyebrow>
          <p className="max-w-[24ch] text-[28px] font-medium leading-snug md:text-[32px]">{COPY.listeningLabel}</p>
          <PrimaryButton>{COPY.done}</PrimaryButton>
        </Page>
      );
    case 'break':
      return (
        <Page
          aside={
            <div aria-hidden className="relative h-[240px] w-[240px]">
              <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: '#E4E7EC' }} />
              <div className="ad-pacer absolute inset-0 rounded-full" style={{ background: 'var(--ad-cyan)', opacity: 0.9 }} />
            </div>
          }
        >
          <Eyebrow>Break · Next: activity 4 of 7</Eyebrow>
          <h1 className="text-[36px] font-bold leading-tight tracking-tight md:text-[44px]">{COPY.breakTitle}</h1>
          <p className="max-w-[32ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
            {COPY.breakBody}
          </p>
          <PrimaryButton>{COPY.breakCta}</PrimaryButton>
        </Page>
      );
    case 'complete':
      return (
        <Page
          aside={
            <div className="flex w-full flex-col gap-6">
              <Eyebrow>Consistency</Eyebrow>
              <div aria-hidden className="flex gap-3">
                {[1, 2, 3, 4].map((w) => (
                  <div key={w} className="flex flex-1 flex-col items-center gap-2">
                    <span className="h-16 w-full rounded-xl" style={{ background: 'var(--ad-navy)' }} />
                    <span className="text-[18px]" style={{ color: 'var(--ad-ink-soft)' }}>
                      Wk {w}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[28px] font-bold">{COPY.streak}</p>
              <p className="text-[20px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.streakBody}
              </p>
            </div>
          }
        >
          <Eyebrow>Session complete</Eyebrow>
          <h1 className="text-[38px] font-bold leading-[1.1] tracking-tight md:text-[48px]">{COPY.completeTitle}</h1>
          <p className="max-w-[32ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
            {COPY.completeBody}
          </p>
          <PrimaryButton>{COPY.completeCta}</PrimaryButton>
        </Page>
      );
  }
}

export default function Clarity() {
  return (
    <DirectionFrame
      direction="B · Clarity"
      labelClassName="bg-[#1E3A5F] text-white"
      render={(screen) => <Screen screen={screen} />}
    />
  );
}
