// Direction A — "Sanctuary": maximal calm, lots of cream space, the orb as
// hero, serif display type.
import type { ReactNode } from 'react';
import { COPY, DirectionFrame, useFakeAmplitude, type ScreenKey } from './_shared';
import './directions.css';

const SERIF = { fontFamily: "'Source Serif 4', Georgia, serif" };
const SANS = { fontFamily: "'DM Sans', system-ui, sans-serif" };

type OrbMode = 'still' | 'speaking' | 'listening';

function Orb({ mode, size = 330 }: { mode: OrbMode; size?: number }) {
  const amp = useFakeAmplitude(mode === 'listening');
  const level = mode === 'listening' ? amp : 0;
  const coreScale = 1 + level * 0.14;

  // Everything is drawn inside the `size` box (core ≈ 64%, rings ≤ 100%) so
  // the ripples never spill onto neighbouring text.
  return (
    <div aria-hidden className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Ripple rings: react to amplitude only, identical for any answer. */}
      {[0.8, 0.97].map((r, i) => (
        <div
          key={r}
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid var(--ad-cyan)',
            opacity: mode === 'listening' ? 0.12 + level * (0.5 - i * 0.18) : 0.1,
            transform: `scale(${r + level * 0.015 * (i + 1)})`,
            transition: 'opacity 120ms linear',
          }}
        />
      ))}
      <div
        className={mode === 'speaking' ? 'ad-breathe absolute' : 'absolute'}
        style={{ inset: size * 0.18 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: `scale(${coreScale})`,
            background:
              'radial-gradient(circle at 38% 34%, #E9FBFD 0%, var(--ad-cyan-soft) 34%, var(--ad-cyan) 72%, #17B3C2 100%)',
            boxShadow: '0 24px 60px -20px rgba(27, 206, 223, 0.55)',
          }}
        />
      </div>
    </div>
  );
}

function Page({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <div className="ad-root flex min-h-[100dvh] flex-col" style={SANS}>
      <header className="flex min-h-[80px] items-center justify-between px-6 md:px-12">
        <span className="text-[20px] tracking-wide" style={SERIF}>
          Remembrance
        </span>
        {top}
      </header>
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center px-6 pb-12 md:px-0">
        {children}
      </main>
    </div>
  );
}

function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[72px] w-full rounded-full px-8 text-[22px] font-medium transition-transform duration-200 active:scale-[0.98] md:w-auto md:min-w-[320px]"
      style={{ background: 'var(--ad-navy)', color: 'var(--ad-cream)' }}
    >
      {children}
    </button>
  );
}

function QuietButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="ad-focus min-h-[64px] w-full rounded-full px-8 text-[20px] underline-offset-4 hover:underline md:w-auto"
      style={{ color: 'var(--ad-navy)' }}
    >
      {children}
    </button>
  );
}

function Progress() {
  const { current, total } = COPY.progress;
  return (
    <div className="flex items-center gap-3 text-[18px]" style={{ color: 'var(--ad-ink-soft)' }}>
      <div aria-hidden className="flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="block h-2 w-2 rounded-full"
            style={{
              background: i < current ? 'var(--ad-navy)' : 'var(--ad-cream-deep)',
              outline: i === current - 1 ? '3px solid var(--ad-cyan-soft)' : 'none',
            }}
          />
        ))}
      </div>
      <span>
        Activity {current} of {total}
      </span>
    </div>
  );
}

function PauseLink() {
  return (
    <button
      type="button"
      className="ad-focus min-h-[64px] min-w-[96px] rounded-full px-5 text-[20px]"
      style={{ color: 'var(--ad-navy)', border: '2px solid var(--ad-cream-deep)' }}
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
          <div className="ad-rise flex flex-col items-center gap-10 text-center">
            <Orb mode="still" size={260} />
            <div className="space-y-5">
              <h1 className="text-[40px] leading-[1.15] md:text-[52px]" style={SERIF}>
                {COPY.welcomeTitle}
              </h1>
              <p className="mx-auto max-w-[30ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.welcomeBody}
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-4">
              <PrimaryButton>{COPY.welcomeCta}</PrimaryButton>
              <QuietButton>{COPY.welcomeSecondary}</QuietButton>
            </div>
          </div>
        </Page>
      );
    case 'mic-check':
      return (
        <Page>
          <div className="flex flex-col items-center gap-10 text-center">
            <div className="space-y-4">
              <h1 className="text-[36px] leading-tight md:text-[44px]" style={SERIF}>
                {COPY.micTitle}
              </h1>
              <p className="mx-auto max-w-[28ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.micBody}
              </p>
            </div>
            <Orb mode="listening" size={280} />
            <p className="text-[22px] font-medium" role="status">
              {COPY.micStatus}
            </p>
            <PrimaryButton>{COPY.micCta}</PrimaryButton>
          </div>
        </Page>
      );
    case 'examiner-speaking':
      return (
        <Page top={<PauseLink />}>
          <div className="flex flex-col items-center gap-12 text-center">
            <Progress />
            <Orb mode="speaking" />
            <p
              className="mx-auto max-w-[26ch] text-[26px] leading-snug md:text-[30px]"
              style={SERIF}
              aria-live="polite"
            >
              {COPY.examinerLine}
            </p>
          </div>
        </Page>
      );
    case 'listening':
      return (
        <Page top={<PauseLink />}>
          <div className="flex flex-col items-center gap-12 text-center">
            <Progress />
            <Orb mode="listening" />
            <p className="text-[26px] md:text-[30px]" style={SERIF}>
              {COPY.listeningLabel}
            </p>
            <PrimaryButton>{COPY.done}</PrimaryButton>
          </div>
        </Page>
      );
    case 'break':
      return (
        <Page>
          <div className="flex flex-col items-center gap-10 text-center">
            <h1 className="text-[36px] leading-tight md:text-[44px]" style={SERIF}>
              {COPY.breakTitle}
            </h1>
            <div
              aria-hidden
              className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full"
              style={{ background: 'var(--ad-cream-deep)' }}
            >
              <div
                className="ad-pacer h-full w-full rounded-full"
                style={{ background: 'radial-gradient(circle, var(--ad-cyan-soft), var(--ad-cyan))', opacity: 0.85 }}
              />
            </div>
            <p className="mx-auto max-w-[28ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
              {COPY.breakBody}
            </p>
            <PrimaryButton>{COPY.breakCta}</PrimaryButton>
          </div>
        </Page>
      );
    case 'complete':
      return (
        <Page>
          <div className="ad-rise flex flex-col items-center gap-10 text-center">
            <Orb mode="still" size={230} />
            <div className="space-y-5">
              <h1 className="text-[38px] leading-[1.15] md:text-[48px]" style={SERIF}>
                {COPY.completeTitle}
              </h1>
              <p className="mx-auto max-w-[30ch] text-[24px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.completeBody}
              </p>
            </div>
            <div
              className="w-full rounded-[28px] px-8 py-6 text-left"
              style={{ background: 'var(--ad-white)', border: '1px solid var(--ad-cream-deep)' }}
            >
              <p className="text-[26px]" style={SERIF}>
                {COPY.streak}
              </p>
              <p className="text-[20px]" style={{ color: 'var(--ad-ink-soft)' }}>
                {COPY.streakBody}
              </p>
            </div>
            <PrimaryButton>{COPY.completeCta}</PrimaryButton>
          </div>
        </Page>
      );
  }
}

export default function Sanctuary() {
  return (
    <DirectionFrame
      direction="A · Sanctuary"
      labelClassName="bg-[#1E3A5F] text-[#F5F1EA]"
      render={(screen) => <Screen screen={screen} />}
    />
  );
}
