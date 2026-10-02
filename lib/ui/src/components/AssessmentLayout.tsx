// Clarity page frame: white header (wordmark + optional Pause), then a
// two-column grid on desktop (copy left, visual card right). On phones the
// visual card stacks FIRST so live status is never below the action. At large
// text (≥150%) every screen uses the phone layout (theme.css, rm-assess-*):
// breakpoints don't know about the text size, and two columns of doubled
// text don't fit.
import type { ReactNode } from 'react';
import { Button, cx } from '../primitives';

export interface AssessmentLayoutProps {
  children: ReactNode;
  /** Visual card (orb, pacer, meter). */
  aside?: ReactNode;
  /** Shown above the copy, e.g. <ProgressRail/>. */
  rail?: ReactNode;
  onPause?: () => void;
  className?: string;
}

export function AssessmentLayout({ children, aside, rail, onPause, className }: AssessmentLayoutProps) {
  return (
    <div className={cx('flex min-h-[100dvh] flex-col bg-rm-cream font-rm text-rm-body text-rm-ink antialiased', className)}>
      <header className="flex min-h-20 items-center justify-between border-b border-rm-cream-deep bg-rm-surface px-4 md:px-10">
        <span className="text-rm-label font-semibold tracking-tight">Remembrance</span>
        {onPause && (
          <Button variant="quiet" block={false} className="!w-auto !min-w-0 px-6" onClick={onPause}>
            Pause
          </Button>
        )}
      </header>
      {/* minmax(0, …) columns and word wrapping keep large text (up to 200%) on screen. */}
      <main className="rm-assess-main mx-auto grid w-full max-w-[1080px] flex-1 grid-cols-[minmax(0,1fr)] content-center gap-8 break-words px-4 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-16 md:px-10 md:py-10">
        <div className="flex flex-col justify-center gap-8">
          {rail}
          {children}
        </div>
        {aside && (
          <div className="rm-assess-aside order-first flex items-center justify-center rounded-rm-lg bg-rm-surface p-6 shadow-rm-card md:order-none md:p-12">
            {aside}
          </div>
        )}
      </main>
    </div>
  );
}
