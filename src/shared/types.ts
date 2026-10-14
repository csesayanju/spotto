/** A card is a list of symbol ids (0..N-1). */
export type Card = number[];
export type SymbolId = number;
export type PlayerId = string;
export type GameMode = "tower";
export type RoomStatus = "lobby" | "playing" | "finished";

export interface PlayerState {
  name: string;
  ready: boolean;
  connected: boolean;
  /** Index into deckOrder of this player's current top card, or -1 if none. */
  topCard: number;
  score: number;
  /** Epoch ms until which taps are ignored (wrong-tap penalty). */
  frozenUntil: number;
}

export interface GameState {
  mode: GameMode;
  /** Shuffled card indices for this game. */
  deckOrder: number[];
  /** Position in deckOrder of the current center card. */
  centerPos: number;
  /** Increments every time a round is won; used to reject stale taps. */
  round: number;
  lastWinner: PlayerId | null;
}

export interface RoomMeta {
  hostId: PlayerId;
  status: RoomStatus;
  mode: GameMode;
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
