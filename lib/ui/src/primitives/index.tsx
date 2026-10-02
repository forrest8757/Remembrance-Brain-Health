// Primitives. Every color, size and radius comes from tokens (rm-*
// utilities); no hard-coded values in components.
import type { ButtonHTMLAttributes, ElementType, HTMLAttributes, ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ---- Button -----------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Stretch to the container on every breakpoint (default: full on phones only). */
  block?: boolean;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'min-h-[72px] bg-rm-navy text-rm-surface font-semibold text-rm-lead hover:bg-rm-navy-deep',
  secondary: 'min-h-16 border-2 border-rm-navy text-rm-navy font-medium text-rm-label bg-transparent hover:bg-rm-cream-deep',
  quiet: 'min-h-16 bg-rm-cream text-rm-navy font-medium text-rm-label hover:bg-rm-cream-deep',
};

export function Button({ variant = 'primary', block, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'rm-focus inline-flex min-w-16 items-center justify-center gap-3 rounded-rm-md px-8 transition-[transform,background-color] duration-150 ease-rm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        block ? 'w-full' : 'w-full md:w-auto md:min-w-[300px]',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

// ---- Card -------------------------------------------------------------------

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-rm-lg bg-rm-surface p-6 shadow-rm-card md:p-12', className)} {...rest} />;
}

// ---- Stack ------------------------------------------------------------------

const GAPS = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8', 10: 'gap-10' } as const;

export function Stack({
  gap = 6,
  direction = 'column',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { gap?: keyof typeof GAPS; direction?: 'column' | 'row' | 'responsive' }) {
  const dir = direction === 'row' ? 'flex-row flex-wrap' : direction === 'responsive' ? 'flex-col md:flex-row md:flex-wrap' : 'flex-col';
  return <div className={cx('flex', dir, GAPS[gap], className)} {...rest} />;
}

// ---- Text -------------------------------------------------------------------

export type TextVariant = 'eyebrow' | 'label' | 'body' | 'lead' | 'instruction' | 'title' | 'display';

const TEXT_VARIANTS: Record<TextVariant, { cls: string; as: ElementType }> = {
  eyebrow: { cls: 'text-rm-eyebrow font-semibold uppercase tracking-[0.08em] text-rm-ink-soft', as: 'p' },
  label: { cls: 'text-rm-label font-medium text-rm-ink', as: 'span' },
  body: { cls: 'text-rm-body text-rm-ink', as: 'p' },
  lead: { cls: 'text-rm-lead text-rm-ink-soft max-w-[32ch]', as: 'p' },
  instruction: { cls: 'text-rm-instruction font-medium text-rm-ink max-w-[28ch] md:text-[32px]', as: 'p' },
  title: { cls: 'text-rm-title font-bold tracking-tight text-rm-ink md:text-rm-display', as: 'h1' },
  display: { cls: 'text-rm-display font-bold tracking-tight text-rm-ink md:text-[52px]', as: 'h1' },
};

export function Text({
  variant = 'body',
  as,
  className,
  ...rest
}: HTMLAttributes<HTMLElement> & { variant?: TextVariant; as?: ElementType }) {
  const v = TEXT_VARIANTS[variant];
  const Tag = as ?? v.as;
  return <Tag className={cx(v.cls, className)} {...rest} />;
}

// ---- IconLabel (no icons without text, CLAUDE.md §9) -------------------------

export function IconLabel({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-3', className)}>
      <span aria-hidden className="inline-flex shrink-0">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}
