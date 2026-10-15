/** A card is a list of symbol ids (0..N-1). */
export type Card = number[];
export type SymbolId = number;
export type PlayerId = string;
export type GameMode = "tower" | "well" | "gift" | "potato";
export type RoomStatus = "lobby" | "playing" | "finished";
export type GameLength = "quick" | "normal" | "full";

export interface PlayerState {
  name: string;
  ready: boolean;
  connected: boolean;
  /** Position in deckOrder of this player's current top card, or -1 if none. */
  topCard: number;
  /** Well only: end (exclusive) of this player's pile in deckOrder. */
  pileEnd?: number;
  /** Hot Potato only: positions in deckOrder of this player's cards, top card last. */
  pile?: number[];
  /** Cards that count for this mode: collected (Tower), left in pile (Well), held (Gift). */
  score: number;
  /** Epoch ms until which taps are ignored (wrong-tap penalty). */
  frozenUntil: number;
}

export interface GameState {
  mode: GameMode;
  /** Shuffled card indices for this game. */
  deckOrder: number[];
  /** Position in deckOrder of the current center card (Well: the last card played). */
  centerPos: number;
  /** Increments every time a round is won; used to reject stale taps. */
  round: number;
  lastWinner: PlayerId | null;
  /** Symbol that won the last round, shown in the round banner. */
  lastMatch: SymbolId | null;
  /** Server time the first round opens, after the 3-2-1 countdown. */
  startsAt?: number;
  /** Server time the game ends regardless of cards (Hot Potato's timer). */
  endsAt?: number;
  /** Deck indices of the two cards that matched last round, for the replay. */
  lastPair?: [number, number] | null;
  /** Gift only: who received the last card. */
  lastTarget?: PlayerId | null;
}

export interface RoomMeta {
  hostId: PlayerId;
  status: RoomStatus;
  mode: GameMode;
  /** How many cards the next game uses. Missing means "full" (rooms from before 0.3). */
  length?: GameLength;
  /** Games won in this room, kept across rematches. */
  wins?: Record<PlayerId, number>;
  createdAt: number;
}

/** Shape of rooms/{code} in Firebase Realtime Database. */
export interface Room {
  meta: RoomMeta;
  players: Record<PlayerId, PlayerState>;
  game?: GameState;
}

export type TapResult =
  | { kind: "win"; round: number }
  | { kind: "wrong" }
  | { kind: "stale" }
  | { kind: "frozen" };
