/** Tunable game settings. Order 7 gives 8 symbols per card and 57 cards/symbols. */
export const CONFIG = {
  order: 7,
  penaltyMs: 1500,
  maxPlayers: 8,
  roomCodeLength: 4,
  reconnectGraceMs: 30_000,
  /** Rooms older than this can be deleted by anyone (abandoned-room sweep). */
  roomMaxAgeMs: 6 * 60 * 60 * 1000,
} as const;
