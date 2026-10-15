import type { Card, GameState, PlayerId, PlayerState, SymbolId, TapResult } from "../shared/types";

/** Every game mode implements this. All functions must be pure. */
export interface ModeRules {
  setup(playerIds: PlayerId[], deckSize: number, rand?: () => number): {
    game: GameState;
    players: Record<PlayerId, Pick<PlayerState, "topCard" | "score" | "pileEnd">>;
  };
  resolveTap(input: TapInput): TapOutcome;
  isOver(game: GameState, players: Record<PlayerId, PlayerState>): boolean;
  /** Whether the highest or the lowest score wins. */
  winsWith: "most" | "fewest";
}

export interface TapInput {
  deck: Card[];
  game: GameState;
  players: Record<PlayerId, PlayerState>;
  playerId: PlayerId;
  symbol: SymbolId;
  /** Gift only: the opponent whose card the symbol was tapped on. */
  target?: PlayerId;
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

/** Shared checks every mode runs first: stale round, game over, countdown, frozen player. */
export function precheck(input: TapInput, over: boolean): TapOutcome | null {
  const { game, players, playerId, round, now } = input;
  const me = players[playerId];
  if (!me || round !== game.round || over || now < (game.startsAt ?? 0))
    return { result: { kind: "stale" }, game, players };
  if (me.frozenUntil > now) return { result: { kind: "frozen" }, game, players };
  return null;
}

/** A wrong tap freezes the player for penaltyMs. */
export function penalize({ game, players, playerId, now, penaltyMs }: TapInput): TapOutcome {
  return {
    result: { kind: "wrong" },
    game,
    players: { ...players, [playerId]: { ...players[playerId], frozenUntil: now + penaltyMs } },
  };
}
