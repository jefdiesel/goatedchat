// Deterministic corruption engine for entropy channels
// Uses seeded PRNG to ensure all clients see identical decay

// Glitch characters for visual corruption
const GLITCH_CHARS = {
  // Box drawing characters
  box: ['░', '▒', '▓', '█', '▄', '▀', '▌', '▐', '│', '─', '┼', '├', '┤', '┬', '┴'],
  // Block elements
  block: ['▪', '▫', '◊', '◦', '•', '○', '●', '◌', '◍', '◎'],
  // Zalgo-style combining characters (subtle)
  zalgo: ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307'],
  // Replacement chars
  replace: ['_', '.', '·', '×', '÷', '±', '∞', '∅', '∆', '∂'],
};

// Mulberry32 PRNG - deterministic, seedable random number generator
export function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate a numeric seed from a string (message ID + corruption pass)
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Calculate corruption probability for a character
function calculateCorruptionChance(
  messageAge: number, // in minutes
  globalPressure: number, // 0-1 based on message count
  corruptionPass: number,
  baseRate: number = 0.005
): number {
  // Formula: base_rate + age_factor + pass_factor
  // Age factor: older messages corrupt faster
  const ageFactor = Math.pow(Math.max(0, messageAge), 1.2) * 0.01;
  // Pass factor: each corruption pass increases chance
  const passFactor = corruptionPass * 0.005;
  // Pressure factor: more messages = faster corruption
  const pressureFactor = globalPressure * 0.1;

  return Math.min(0.95, baseRate + ageFactor + passFactor + pressureFactor);
}

// Apply corruption to a single character
function corruptChar(
  char: string,
  random: () => number,
  intensity: number
): string {
  const roll = random();

  // Higher intensity = more aggressive corruption
  if (roll > intensity) {
    return char;
  }

  const corruptionType = random();

  if (corruptionType < 0.3) {
    // Block redaction
    const blocks = GLITCH_CHARS.block;
    return blocks[Math.floor(random() * blocks.length)];
  } else if (corruptionType < 0.5) {
    // Box drawing replacement
    const boxes = GLITCH_CHARS.box;
    return boxes[Math.floor(random() * boxes.length)];
  } else if (corruptionType < 0.65) {
    // Character replacement
    const replacements = GLITCH_CHARS.replace;
    return replacements[Math.floor(random() * replacements.length)];
  } else if (corruptionType < 0.75) {
    // Deletion (return empty)
    return '';
  } else if (corruptionType < 0.85) {
    // Add zalgo modifier
    const zalgo = GLITCH_CHARS.zalgo;
    return char + zalgo[Math.floor(random() * zalgo.length)];
  } else {
    // Keep original (some chars survive)
    return char;
  }
}

export interface CorruptionResult {
  text: string;
  corruptedIndices: number[]; // For visual styling
  corruptionLevel: number; // 0-1, percentage corrupted
}

// Main corruption function
export function applyCorruption(
  text: string,
  messageId: string,
  corruptionPass: number,
  messageAgeMinutes: number,
  globalPressure: number
): CorruptionResult {
  // Generate deterministic seed from message ID and corruption pass
  const seed = stringToSeed(`${messageId}:${corruptionPass}`);
  const random = seededRandom(seed);

  // Calculate base corruption chance
  const baseChance = calculateCorruptionChance(
    messageAgeMinutes,
    globalPressure,
    corruptionPass
  );

  const chars = [...text]; // Handle unicode properly
  const corruptedIndices: number[] = [];
  let corruptedCount = 0;

  const result = chars.map((char, index) => {
    // Skip whitespace
    if (/\s/.test(char)) {
      return char;
    }

    // Each character has its own roll
    const charRoll = random();

    if (charRoll < baseChance) {
      const corrupted = corruptChar(char, random, baseChance);
      if (corrupted !== char) {
        corruptedIndices.push(index);
        corruptedCount++;
      }
      return corrupted;
    }

    return char;
  }).join('');

  return {
    text: result,
    corruptedIndices,
    corruptionLevel: text.length > 0 ? corruptedCount / text.length : 0,
  };
}

// Normalize message age from created_at timestamp to minutes
export function normalizeAge(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.max(0, (now - created) / 60000); // Convert ms to minutes
}

// Check if a message should be considered "destroyed" (fully corrupted)
export function isMessageDestroyed(corruptionLevel: number): boolean {
  return corruptionLevel >= 0.9;
}
