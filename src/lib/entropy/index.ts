export {
  seededRandom,
  applyCorruption,
  normalizeAge,
  isMessageDestroyed,
  type CorruptionResult,
} from './corruption';

export {
  TOWER_MAX,
  TOWER_MIN,
  calculateGlobalPressure,
  calculateDecayRate,
  towerToPercent,
  getTowerColor,
  isTowerFallen,
  getMessageSendDecay,
  getMessageSendCorruptionIncrement,
} from './tower';
