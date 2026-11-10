// Default budgets for every Gaute game. The app host enforces this same contract.
// Combined code leaves headroom below Convex's document limit for its metadata.
export const GAME_LIMITS = Object.freeze({
  logicBytes: 384 * 1024,
  clientBytes: 768 * 1024,
  codeBytes: 960 * 1024,
  stateBytes: 512 * 1024,
  viewBytes: 256 * 1024,
  payloadBytes: 16 * 1024,
  resultBytes: 4 * 1024,
  memoryBytes: 32 * 1024 * 1024,
  stackBytes: 512 * 1024,
  interrupts: 800,
  maxPlayers: 16,
});
