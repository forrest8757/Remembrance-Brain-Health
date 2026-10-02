// Direction C — "Warm Companion": softer shapes, gentle gradients, friendly
// illustration. Chrome screens carry the warmth; protocol screens stay plain.
import type { ReactNode } from 'react';
import { COPY, DirectionFrame, useFakeAmplitude, type ScreenKey } from './_shared';
import './directions.css';

const SANS = { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" };

type OrbMode = 'still' | 'speaking' | 'listening';

// Organic blob. Amplitude softly deforms the outline; it never changes
// colour, so there is nothing to read as right or wrong.
function Orb({ mode, size = 260 }: { mode: OrbMode; size?: number }) {
  const amp = useFakeAmplitude(mode === 'listening');
  const level = mode === 'listening' ? amp : 0;
  const w = (n: number) => `${50 + Math.round(level * n)}%`;
  const radius = `${w(8)} ${w(-6)} ${w(10)} ${w(-8)} / ${w(-7)} ${w(9)} ${w(-5)} ${w(7)}`;

  return (
    <div aria-hidden className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full blur-2xl"
        style={{ inset: -size * 0.08, background: 'radial-gradient(circle, rgba(27,206,223,0.35), rgba(246,217,196,0.25) 60%, transparent 75%)' }}
      />
      <div className={`absolute inset-0 ${mode === 'speaking' ? 'ad-breathe' : ''}`}>
        <div
          className="absolute inset-0"
          style={{
            borderRadius: radius,
            transform: `scale(${1 + level * 0.1})`,
            background: 'linear-gradient(145deg, #D9F7FA 0%, #7FE3EC 45%, #1BCEDF 100%)',
            transition: 'border-radius 90ms linear',
          }}
        />
      </div>
    </div>
  );
}

// Cozy kitchen-table illustration: mug and plant. Chrome zone only.
function TableScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="A mug of tea and a small plant on a table" className={className}>
      <ellipse cx="160" cy="166" rx="150" ry="10" fill="#EBE4D8" />
      <rect x="196" y="110" width="44" height="52" rx="10" fill="#F6D9C4" />
      <path d="M204 110 C200 80 214 62 218 50 C222 62 236 80 232 110 Z" fill="#7FBF9A" />
      <path d="M218 110 C206 92 190 88 184 74 C200 76 214 86 222 104 Z" fill="#5FA67F" />
      <path d="M218 110 C230 92 246 90 254 78 C238 78 224 88 216 104 Z" fill="#8ACBA6" />
      <rect x="90" y="104" width="62" height="58" rx="14" fill="#1E3A5F" />
      <path d="M152 118 h10 a14 14 0 0 1 0 28 h-10" fill="none" stroke="#1E3A5F" strokeWidth="8" />
      <path d="M108 92 c-6 -10 6 -14 0 -24 M126 92 c-6 -10 6 -14 0 -24" stroke="#A8B4C2" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Page({ children, top, warm = true }: { children: ReactNode; top?: ReactNode; warm?: boolean }) {
  return (
    <div
      className="ad-root flex min-h-[100dvh] flex-col"
      style={{
        ...SANS,
        background: warm
          ? 'radial-gradient(120% 70% at 50% 0%, #FBEFE4 0%, var(--ad-cream) 55%)'
          : 'var(--ad-cream)',
      }}
    >
      <header className="flex min-h-[80px] items-center justify-between px-6 md:px-12">
        <span className="flex items-center gap-2 text-[20px] font-bold">
          <span aria-hidden className="h-4 w-4 rounded-full" style={{ background: 'var(--ad-cyan)' }} />
          Remembrance
        </span>
        {top}
      </header>
      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center px-6 pb-12 md:px-0">
        {children}
      </main>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[36px] px-7 py-9 md:px-12 md:py-12"
      style={{ background: 'var(--ad-white)', boxShadow: '0 24px 60px -28px rgba(30,58,95,0.25)' }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[72px] w-full rounded-[24px] px-8 text-[22px] font-bold transition-transform duration-200 active:scale-[0.98]"
      style={{ background: 'var(--ad-navy)', color: 'var(--ad-white)', boxShadow: '0 10px 24px -12px rgba(30,58,95,0.6)' }}
    >
      {children}
    </button>
  );
}

function SoftButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[64px] w-full rounded-[24px] px-8 text-[20px] font-semibold"
      style={{ background: 'var(--ad-cream)', color: 'var(--ad-navy)' }}
    >
      {children}
    </button>
  );
}

function Progress() {
  const { current, total } = COPY.progress;
  return (
    <div className="mx-auto flex items-center gap-3 rounded-full px-5 py-2 text-[18px] font-semibold" style={{ background: 'var(--ad-white)', color: 'var(--ad-ink-soft)' }}>
      <span aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="block h-2.5 rounded-full"
            style={{ width: i === current - 1 ? 22 : 10, background: i < current ? 'var(--ad-navy)' : 'var(--ad-cream-deep)' }}
          />
        ))}
      </span>
      Activity {current} of {total}
    </div>
  );
}

function PauseButton() {
  return (
    <button
      type="button"
      className="ad-focus min-h-[64px] rounded-[20px] px-6 text-[20px] font-semibold"
      style={{ background: 'var(--ad-white)', color: 'var(--ad-navy)' }}
    >
      {COPY.pause}
    </button>
  );
}

function Screen({ screen }: { screen: ScreenKey }) {
  switch (screen) {
    case 'welcome':
      return (
        <Page>
          <div className="ad-rise">
            <Card>
              <TableScene className="mx-auto mb-6 w-full max-w-[280px]" />
              <h1 className="text-[36px] font-extrabold leading-[1.15] md:text-[44px]">{COPY.welcomeTitle}</h1>
              <p className="mt-4 text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.welcomeBody}
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <PrimaryButton>{COPY.welcomeCta}</PrimaryButton>
                <SoftButton>{COPY.welcomeSecondary}</SoftButton>
              </div>
            </Card>
          </div>
        </Page>
      );
    case 'mic-check':
      return (
        <Page>
          <Card>
            <h1 className="text-center text-[32px] font-extrabold leading-tight md:text-[40px]">{COPY.micTitle}</h1>
            <p className="mt-4 text-center text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
              {COPY.micBody}
            </p>
            <div className="my-10">
              <Orb mode="listening" size={200} />
            </div>
            <p role="status" className="mb-8 text-center text-[22px] font-bold">
              {COPY.micStatus}
            </p>
            <PrimaryButton>{COPY.micCta}</PrimaryButton>
          </Card>
        </Page>
      );
    case 'examiner-speaking':
      return (
        <Page warm={false} top={<PauseButton />}>
          <div className="flex flex-col items-center gap-12 text-center">
            <Progress />
            <Orb mode="speaking" />
            <p className="mx-auto max-w-[26ch] text-[26px] font-semibold leading-snug md:text-[30px]" aria-live="polite">
              {COPY.examinerLine}
            </p>
          </div>
        </Page>
      );
    case 'listening':
      return (
        <Page warm={false} top={<PauseButton />}>
          <div className="flex flex-col items-center gap-12 text-center">
            <Progress />
            <Orb mode="listening" />
            <p className="text-[26px] font-semibold md:text-[30px]">{COPY.listeningLabel}</p>
            <div className="w-full max-w-[360px]">
              <PrimaryButton>{COPY.done}</PrimaryButton>
            </div>
          </div>
        </Page>
      );
    case 'break':
      return (
        <Page>
          <Card>
            <h1 className="text-center text-[32px] font-extrabold leading-tight md:text-[40px]">{COPY.breakTitle}</h1>
            <div aria-hidden className="relative mx-auto my-10 h-[220px] w-[220px]">
              <div className="absolute inset-0 rounded-full" style={{ background: '#FBEFE4' }} />
              <div
                className="ad-pacer absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle at 40% 35%, #D9F7FA, #1BCEDF)' }}
              />
            </div>
            <p className="mb-8 text-center text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
              {COPY.breakBody}
            </p>
            <PrimaryButton>{COPY.breakCta}</PrimaryButton>
          </Card>
        </Page>
      );
    case 'complete':
      return (
        <Page>
          <div className="ad-rise">
            <Card>
              <svg viewBox="0 0 120 120" aria-hidden className="mx-auto mb-6 h-24 w-24">
                <circle cx="60" cy="60" r="30" fill="#F6D9C4" />
                {Array.from({ length: 8 }, (_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  return (
                    <line key={i} x1={60 + Math.cos(a) * 40} y1={60 + Math.sin(a) * 40} x2={60 + Math.cos(a) * 52} y2={60 + Math.sin(a) * 52} stroke="#1BCEDF" strokeWidth="6" strokeLinecap="round" />
                  );
                })}
              </svg>
              <h1 className="text-center text-[34px] font-extrabold leading-[1.15] md:text-[42px]">{COPY.completeTitle}</h1>
              <p className="mt-4 text-center text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.completeBody}
              </p>
              <div className="my-8 flex items-center gap-5 rounded-[28px] p-6" style={{ background: 'var(--ad-cream)' }}>
                <div aria-hidden className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="block h-10 w-3 rounded-full" style={{ background: 'var(--ad-navy)' }} />
                  ))}
                </div>
                <div>
                  <p className="text-[24px] font-extrabold">{COPY.streak}</p>
                  <p className="text-[20px]" style={{ color: 'var(--ad-ink-soft)' }}>
                    {COPY.streakBody}
                  </p>
                </div>
              </div>
              <PrimaryButton>{COPY.completeCta}</PrimaryButton>
            </Card>
          </div>
        </Page>
      );
  }
}

export default function Companion() {
  return (
    <DirectionFrame
      direction="C · Warm Companion"
      labelClassName="bg-[#1E3A5F] text-white"
      render={(screen) => <Screen screen={screen} />}
    />
  );
}
