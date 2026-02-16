'use client';

import { useMemo } from 'react';
import { seededRandom } from '@/lib/entropy';

interface DecayedTextProps {
  text: string;
  corruptionLevel: number; // 0-1
  messageId: string;
}

// Check if a character is a "glitch" character
function isGlitchChar(char: string): boolean {
  const code = char.charCodeAt(0);
  // Box drawing, block elements, special symbols
  return (
    (code >= 0x2500 && code <= 0x257F) || // Box drawing
    (code >= 0x2580 && code <= 0x259F) || // Block elements
    (code >= 0x25A0 && code <= 0x25FF) || // Geometric shapes
    (code >= 0x0300 && code <= 0x036F) || // Combining diacritical marks (zalgo)
    char === '×' || char === '÷' || char === '±' || char === '∞' || char === '∅' || char === '∆' || char === '∂'
  );
}

export function DecayedText({ text, corruptionLevel, messageId }: DecayedTextProps) {
  // Generate deterministic styling based on message ID
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash = ((hash << 5) - hash) + messageId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }, [messageId]);

  const random = useMemo(() => seededRandom(seed), [seed]);

  // Split text into characters for styling
  const styledChars = useMemo(() => {
    const chars = [...text];
    return chars.map((char, index) => {
      const isGlitch = isGlitchChar(char);

      if (!isGlitch) {
        return { char, isGlitch: false, hue: 0, delay: 0 };
      }

      // Deterministic styling for glitch chars
      const hue = Math.floor(random() * 60) + 90; // Green to yellow range
      const delay = random() * 2;

      return { char, isGlitch: true, hue, delay };
    });
  }, [text, random]);

  // High corruption = scanline overlay
  const showScanlines = corruptionLevel > 0.3;
  const scanlineOpacity = Math.min(0.3, corruptionLevel * 0.5);

  // Critical corruption = vignette effect
  const showVignette = corruptionLevel > 0.6;
  const vignetteOpacity = (corruptionLevel - 0.6) * 0.5;

  return (
    <span className="relative inline">
      {styledChars.map((item, index) => (
        <span
          key={index}
          className={item.isGlitch ? 'entropy-glitch-char' : undefined}
          style={item.isGlitch ? {
            color: `hsl(${item.hue}, 70%, 60%)`,
            animationDelay: `${item.delay}s`,
          } : undefined}
        >
          {item.char}
        </span>
      ))}

      {/* Scanline overlay */}
      {showScanlines && (
        <span
          className="pointer-events-none absolute inset-0 entropy-scanlines"
          style={{ opacity: scanlineOpacity }}
        />
      )}

      {/* Vignette overlay */}
      {showVignette && (
        <span
          className="pointer-events-none absolute inset-0 rounded"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(239, 68, 68, ${vignetteOpacity}) 100%)`,
          }}
        />
      )}
    </span>
  );
}
