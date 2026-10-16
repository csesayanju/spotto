/** Tunable game settings. Order 7 gives 8 symbols per card and 57 cards/symbols. */
export const CONFIG = {
  order: 7,
  penaltyMs: 1500,
  /** Penalty choices the host can pick in the lobby. */
  penaltyChoices: [1000, 1500, 3000],
  /** 3-2-1 countdown before the first round. */
  countdownMs: 3000,
  /** Matches in a solo practice run. */
  practiceCards: 20,
  /** Matches in the daily challenge. */
  dailyCards: 15,
  /** Hot Potato: most cards each player starts with, and the timer per game length. */
  potatoPile: 5,
  potatoSeconds: { quick: 45, normal: 75, full: 105 },
  maxPlayers: 8,
  maxSpectators: 8,
  /** Reactions a player can send, and the shortest gap between two of them. */
  reactions: ["😂", "🔥", "😮", "😤", "👏"],
  reactionGapMs: 800,
  roomCodeLength: 4,
  /** Cards used per game length; "full" is the whole deck. */
  lengthCards: { quick: 21, normal: 35, full: 57 },
  reconnectGraceMs: 30_000,
  /** Rooms older than this can be deleted by anyone (abandoned-room sweep). */
  roomMaxAgeMs: 6 * 60 * 60 * 1000,
} as const;
