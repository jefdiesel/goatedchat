// Integrity tower calculations for entropy channels
// The tower always falls eventually

// Tower starts at 54 (displayed as 100%)
export const TOWER_MAX = 54;
export const TOWER_MIN = 0;

// Calculate global pressure based on message count
// More messages = faster decay
export function calculateGlobalPressure(messageCount: number): number {
  // Pressure scales logarithmically with message count
  // Base pressure at 0 messages: 0.05
  // 10 messages: ~0.1
  // 100 messages: ~0.15
  // 1000 messages: ~0.2
  const basePressure = 0.05;
  const scaleFactor = 0.05;
  return Math.min(0.5, basePressure + (Math.log10(Math.max(1, messageCount)) * scaleFactor));
}

// Calculate how much the tower should decay this tick
// Returns the amount to subtract from integrity_tower
export function calculateDecayRate(
  messageCount: number,
  elapsedMinutes: number,
  currentIntegrity: number
): number {
  // Base decay: 1 point per 60 minutes (1 hour per point = ~2.25 days to collapse)
  const baseDecayPerMinute = 1 / 60;

  // Pressure multiplier (very subtle)
  const pressure = calculateGlobalPressure(messageCount);

  // Calculate total decay
  const decay = baseDecayPerMinute * elapsedMinutes * (0.5 + pressure * 0.5);

  return Math.max(0, decay);
}

// Convert tower value (0-54) to percentage (0-100)
export function towerToPercent(tower: number): number {
  return Math.round((tower / TOWER_MAX) * 100);
}

// Get tower color based on percentage
export function getTowerColor(percent: number): string {
  if (percent > 66) {
    return '#22c55e'; // Green
  } else if (percent > 33) {
    return '#eab308'; // Yellow
  } else if (percent > 10) {
    return '#f97316'; // Orange
  } else {
    return '#ef4444'; // Red
  }
}

// Check if tower has fallen
export function isTowerFallen(integrity: number): boolean {
  return integrity <= TOWER_MIN;
}

// Get decay amount from sending a message (hidden mechanic)
// Each message sent accelerates the tower's fall
export function getMessageSendDecay(): number {
  return 0.1; // Each message costs 0.1 integrity point (10 messages = 1 point)
}

// Get corruption pass increment from sending a message (hidden mechanic)
export function getMessageSendCorruptionIncrement(): number {
  return 1; // Each message advances corruption by 1 pass
}
