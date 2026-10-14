import type { Card, GameState, PlayerId, PlayerState, SymbolId, TapResult } from "../shared/types";

/** Every game mode implements this. All functions must be pure. */
export interface ModeRules {
  setup(playerIds: PlayerId[], deckSize: number, rand?: () => number): {
    game: GameState;
    players: Record<PlayerId, Pick<PlayerState, "topCard" | "score">>;
  };
  resolveTap(input: TapInput): TapOutcome;
  isOver(game: GameState): boolean;
}

export interface TapInput {
  deck: Card[];
  game: GameState;
  players: Record<PlayerId, PlayerState>;
  playerId: PlayerId;
  symbol: SymbolId;
  /** The round the client saw when tapping. */
  round: number;
  now: number;
  penaltyMs: number;
}

export interface TapOutcome {
  result: TapResult;
  game: GameState;
  players: Record<PlayerId, PlayerState>;
}
