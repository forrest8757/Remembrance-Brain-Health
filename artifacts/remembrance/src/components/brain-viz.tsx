import React from 'react';
import { Brain } from 'lucide-react';

export function BrainVisualization({ className = "", activeSector = null }: { className?: string, activeSector?: number | null }) {
  const sectors = [0, 1, 2, 3, 4];
  
  return (
    <div className={`relative aspect-square w-full max-w-[400px] mx-auto flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 rounded-full border border-cyan/20 animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute inset-4 rounded-full border border-cyan/40 animate-[pulse_4s_ease-in-out_infinite_1s]" />
      <div className="absolute inset-8 rounded-full bg-navy/5 backdrop-blur-sm shadow-xl border border-white/50 flex items-center justify-center overflow-hidden">
        
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90">
          {sectors.map(i => {
            const startAngle = (i * 72) * Math.PI / 180;
            const endAngle = ((i + 1) * 72) * Math.PI / 180;
            const x1 = 50 + 50 * Math.cos(startAngle);
            const y1 = 50 + 50 * Math.sin(startAngle);
            const x2 = 50 + 50 * Math.cos(endAngle);
            const y2 = 50 + 50 * Math.sin(endAngle);
            
            const isActive = activeSector === i || activeSector === null;
            
            return (
              <path 
                key={i}
                d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                fill={isActive ? '#1BCEDF' : 'transparent'}
                stroke="#1BCEDF"
                strokeWidth="0.5"
                className={`transition-all duration-1000 ${isActive ? 'opacity-30' : 'opacity-10'}`}
              />
            );
          })}
        </svg>

        <Brain className="w-24 h-24 text-cyan drop-shadow-md relative z-10 animate-[pulse_3s_ease-in-out_infinite]" strokeWidth={1} />
      </div>
    </div>
  );
}
