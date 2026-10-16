import { CONFIG } from "../../shared/config";
import { dealOrder } from "../../shared/deck";
import type { GameState, PlayerId, PlayerState } from "../../shared/types";
import { penalize, precheck, type ModeRules } from "../rules";

const isOver = (_game: GameState, players: Record<PlayerId, PlayerState>) =>
  Object.values(players).some((p) => p.score <= 0);

/**
 * Hot Potato: everyone starts with a small pile. Find the symbol your top card
 * shares with an opponent's top card and tap it on their card: your card lands
 * on their pile. Ends when someone runs out of cards or the timer (endsAt, set
 * when the game starts) runs out. Fewest cards wins.
 */
export const potato: ModeRules = {
  winsWith: "fewest",

  setup(playerIds, deckSize, rand, count) {
    const deckOrder = dealOrder(deckSize, count, rand);
    const per = Math.max(1, Math.min(CONFIG.potatoPile, Math.floor(deckOrder.length / playerIds.length)));
    const players: Record<string, { pile: number[]; topCard: number; score: number }> = {};
    playerIds.forEach((id, i) => {
      const pile = Array.from({ length: per }, (_, k) => i * per + k);
      players[id] = { pile, topCard: pile[pile.length - 1], score: per };
    });
    return {
      game: { mode: "potato", deckOrder, centerPos: -1, round: 0, lastWinner: null, lastMatch: null },
      players,
    };
  },

  resolveTap(input) {
    const { deck, game, players, playerId, symbol, target } = input;
    const early = precheck(input, isOver(game, players));
    if (early) return early;

    const me = players[playerId];
    const them = target ? players[target] : undefined;
    if (them && !them.connected) return { result: { kind: "stale" }, game, players }; // they dropped out
    if (!them || target === playerId) return penalize(input);
    const myCard = deck[game.deckOrder[me.topCard]];
    const theirCard = deck[game.deckOrder[them.topCard]];
    if (!myCard.includes(symbol) || !theirCard.includes(symbol)) return penalize(input);

    // Firebase drops empty arrays, so a missing pile means no cards.
    const mine = [...(me.pile ?? [])];
    const moved = mine.pop()!;
    const theirs = [...(them.pile ?? []), moved];
    return {
      result: { kind: "win", round: game.round + 1 },
      game: { ...game, round: game.round + 1, lastWinner: playerId, lastMatch: symbol, lastTarget: target,
        lastPair: [game.deckOrder[me.topCard], game.deckOrder[them.topCard]] },
      players: {
        ...players,
        [playerId]: { ...me, pile: mine, topCard: mine.length ? mine[mine.length - 1] : -1, score: mine.length },
        [target!]: { ...them, pile: theirs, topCard: moved, score: theirs.length },
      },
    };
  },

  isOver,
};
