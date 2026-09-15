import React from 'react';

type BrainVisualizationProps = {
  className?: string;
  /** Five sectors map to attention, executive function, memory, language, and coordination. */
  activeSector?: number | null;
};

const SECTORS = [
  {
    label: 'Attention',
    // Upper and front left lobe
    path: 'M50 12C39 8 24 12 17 22C10 31 13 43 20 48L45 51L50 37Z',
  },
  {
    label: 'Executive function',
    path: 'M20 48C11 54 12 69 19 78C26 88 38 92 50 88L50 55L45 51Z',
  },
  {
    label: 'Memory',
    path: 'M50 12L50 37L45 51L50 55L50 88C54 91 58 91 62 88L62 55L57 51L62 37L62 15C58 12 54 11 50 12Z',
  },
  {
    label: 'Language',
    path: 'M62 15C75 10 89 16 96 27C101 36 97 45 92 50L62 37Z',
  },
  {
    label: 'Coordination',
    path: 'M92 50C101 58 99 70 93 79C86 89 74 93 62 88L62 55L57 51Z',
  },
];

export function BrainVisualization({ className = '', activeSector = null }: BrainVisualizationProps) {
  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[400px] ${className}`} role="img" aria-label="Five-sector brain visualization">
      <div className="absolute inset-0 rounded-full border border-cyan/15 animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute inset-3 rounded-full border border-cyan/20 animate-[pulse_4s_ease-in-out_infinite_1s]" />
      <svg viewBox="0 0 110 110" className="absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)] overflow-visible" aria-hidden="true">
        <defs>
          <filter id="brain-sector-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform="translate(5 5)">
          {SECTORS.map((sector, index) => {
            const active = activeSector === null || activeSector === index;
            return (
              <path
                key={sector.label}
                d={sector.path}
                fill={active ? '#1BCEDF' : '#1E3A5F'}
                fillOpacity={active ? 0.56 : 0.08}
                stroke="#1E3A5F"
                strokeOpacity={active ? 0.52 : 0.22}
                strokeWidth="1.2"
                filter={activeSector === index ? 'url(#brain-sector-glow)' : undefined}
                className={`transition-all duration-700 ${activeSector === index ? 'animate-pulse' : ''}`}
              >
                <title>{sector.label}</title>
              </path>
            );
          })}
          <path
            d="M50 12C38 7 23 12 16 23C10 32 12 44 19 50C10 57 12 71 19 80C28 91 42 94 50 89C58 94 72 91 91 80C98 71 100 57 91 50C98 44 100 32 94 23C87 12 72 7 62 12C58 10 54 10 50 12Z"
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M50 12V89M62 15V88M50 51h12" fill="none" stroke="#1E3A5F" strokeOpacity="0.4" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}
