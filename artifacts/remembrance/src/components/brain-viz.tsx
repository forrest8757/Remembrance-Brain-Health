import React, {
  Component,
  Suspense,
  lazy,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { BRAIN_PALETTE } from '@/lib/brain-palette';

type BrainVisualizationProps = {
  className?: string;
  /**
   * The selected wellness domain. The uploaded model is one continuous mesh,
   * so this state is represented with a label and halo rather than anatomical
   * regions painted onto the model.
   */
  activeSector?: number | null;
  /**
   * Optional camera focus target that triggers model rotation/zoom.
   */
  focusSector?: number | null;
  /** Whether to show the domain buttons below the visualization */
  showDomainControls?: boolean;
  onSectorClick?: (index: number) => void;
  onSectorHover?: (index: number) => void;
  /** Opt in to an almost-still rotation. The default view is fixed. */
  gentleRotation?: boolean;
};

const DOMAINS = [
  'Attention',
  'Executive function',
  'Memory',
  'Language',
  'Perpetual Motor',
] as const;

function loadBrainModel() {
  return import('./brain-model').then(({ BrainModel }) => ({
    default: BrainModel,
  }));
}

function ModelLoading({ label = 'Loading the interactive brain model…' }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="max-w-[16rem] rounded-2xl bg-cream/85 px-4 py-3 text-sm font-semibold text-navy/70 shadow-sm backdrop-blur-sm">
        {label}
      </p>
    </div>
  );
}

type ViewerBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
};

type ViewerBoundaryState = {
  error: Error | null;
};

class ViewerBoundary extends Component<ViewerBoundaryProps, ViewerBoundaryState> {
  state: ViewerBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ViewerBoundaryState {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Keep this scoped to the lazy viewer. Other Remembrance interactions
    // should remain available when a browser cannot load the viewer chunk.
    if (import.meta.env.DEV) {
      console.warn('The interactive brain viewer failed to load.', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center"
        role="alert"
      >
        <p className="max-w-[19rem] text-sm font-bold leading-relaxed text-navy">
          The interactive brain viewer could not load.
        </p>
        <p className="max-w-[20rem] text-xs font-medium leading-relaxed text-navy/65">
          The rest of the demo is still available. This is a viewer or WebGL
          issue, not a substitute illustration.
        </p>
        <button
          type="button"
          onClick={this.props.onRetry}
          className="min-h-11 rounded-full bg-navy px-5 text-sm font-bold text-white transition-colors hover:bg-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
        >
          Retry viewer
        </button>
      </div>
    );
  }
}

function DomainControls({
  activeSector,
  onSectorClick,
  onSectorHover,
}: Pick<BrainVisualizationProps, 'activeSector' | 'onSectorClick' | 'onSectorHover'>) {
  return (
    <div className="relative z-30 mt-3 w-full" aria-label="Wellness domains">
      <p className="mb-2 text-center text-xs font-medium leading-relaxed text-navy/55">
        Choose a domain to explore. The illustrative colors do not reflect exact anatomical boundaries.
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {DOMAINS.map((domain, index) => {
          const selected = activeSector === index;
          const palette = BRAIN_PALETTE[index];
          return (
            <button
              key={domain}
              type="button"
              aria-label={`Select ${domain} domain`}
              aria-pressed={selected}
              onClick={() => onSectorClick?.(index)}
              onMouseEnter={() => onSectorHover?.(index)}
              onFocus={() => onSectorHover?.(index)}
              style={selected ? { backgroundColor: palette.color } : {}}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center text-[10px] font-bold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 sm:text-[11px] ${
                selected
                  ? 'border-transparent text-navy shadow-sm'
                  : 'border-navy/10 bg-white/70 text-navy/65 hover:border-cyan/35 hover:bg-cyan/5'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  selected ? 'bg-white/40 text-navy' : 'bg-navy/10 text-navy/70'
                }`}
                style={!selected ? { backgroundColor: palette.color } : {}}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span>{domain}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The visual shell intentionally contains no Three.js import. The model
 * renderer lives in a lazy chunk so pages that never show the brain do not pay
 * its download or parse cost during their initial route load.
 */
export function BrainVisualization({
  className = '',
  activeSector = null,
  focusSector = null,
  showDomainControls = true,
  onSectorClick,
  onSectorHover,
  gentleRotation = false,
}: BrainVisualizationProps) {
  const [viewerAttempt, setViewerAttempt] = useState(0);
  const LazyBrainModel = useMemo(
    () => lazy(loadBrainModel),
    [viewerAttempt],
  );
  const activeDomain =
    activeSector !== null && activeSector !== undefined
      ? DOMAINS[activeSector]
      : undefined;
  const hasDomainControls = showDomainControls && Boolean(onSectorClick || onSectorHover);

  return (
    <div className={`relative mx-auto w-full ${className || 'max-w-[400px]'}`}>
      <div className="relative aspect-square w-full" role="group" aria-label="Interactive 3D brain illustration">
        <div
          className={`pointer-events-none absolute inset-[8%] rounded-full border transition-all duration-500`}
          style={
            activeSector !== null && activeSector !== undefined && BRAIN_PALETTE[activeSector]
              ? {
                  borderColor: BRAIN_PALETTE[activeSector].color,
                  boxShadow: `0 0 42px ${BRAIN_PALETTE[activeSector].color}44`,
                }
              : {
                  borderColor: 'rgba(27,206,223,0.2)',
                  boxShadow: '0 0 28px rgba(27,206,223,0.12)',
                }
          }
          aria-hidden="true"
        />
        <ViewerBoundary
          key={viewerAttempt}
          onRetry={() => setViewerAttempt((attempt) => attempt + 1)}
        >
          <Suspense fallback={<ModelLoading />}>
            <LazyBrainModel
              gentleRotation={gentleRotation}
              retryKey={viewerAttempt}
              focusSector={focusSector}
            />
          </Suspense>
        </ViewerBoundary>
        <p className="sr-only">
          {activeDomain
            ? `Selected wellness domain: ${activeDomain}. The 3D model is a shared illustration and does not show anatomical regions.`
            : 'The 3D model is a shared brain illustration. It does not show anatomical regions.'}
        </p>
      </div>
      {hasDomainControls ? (
        <DomainControls
          activeSector={activeSector}
          onSectorClick={onSectorClick}
          onSectorHover={onSectorHover}
        />
      ) : null}
    </div>
  );
}
