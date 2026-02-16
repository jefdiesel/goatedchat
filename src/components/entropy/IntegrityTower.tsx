'use client';

import { useMemo } from 'react';
import { getTowerColor } from '@/lib/entropy';

interface IntegrityTowerProps {
  percent: number;
  isDestroyed?: boolean;
}

export function IntegrityTower({ percent, isDestroyed }: IntegrityTowerProps) {
  const color = useMemo(() => getTowerColor(percent), [percent]);

  // Calculate opacity decay effect - lower integrity = more flickering
  const flickerIntensity = useMemo(() => {
    if (percent > 50) return 0;
    return (50 - percent) / 50; // 0 at 50%, 1 at 0%
  }, [percent]);

  if (isDestroyed) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs font-mono">
        <span className="animate-pulse">COLLAPSED</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors"
      style={{
        backgroundColor: `${color}15`,
        color: color,
        animation: flickerIntensity > 0 ? `entropy-flicker ${2 - flickerIntensity}s ease-in-out infinite` : undefined,
      }}
    >
      {/* Tower icon */}
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{
          animation: flickerIntensity > 0.5 ? 'entropy-shake 0.5s ease-in-out infinite' : undefined,
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>

      {/* Percentage display */}
      <span className="tabular-nums">{percent}%</span>

      {/* Subtle decay indicator bar */}
      <div className="w-8 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
