import { dealOrder } from "../../shared/deck";
import type { GameState } from "../../shared/types";
import { penalize, precheck, type ModeRules } from "../rules";

const isOver = (game: GameState) => game.centerPos >= game.deckOrder.length;

/**
 * Tower: each player starts with one card. Match your card with the
 * center card; the winner takes the center card (it becomes their new top
 * card) and the next center card is revealed. Most cards wins.
 */
export const tower: ModeRules = {
  winsWith: "most",

  setup(playerIds, deckSize, rand, count) {
    const deckOrder = dealOrder(deckSize, count, rand);
    const players: Record<string, { topCard: number; score: number }> = {};
    playerIds.forEach((id, i) => (players[id] = { topCard: i, score: 1 }));
    return {
      game: { mode: "tower", deckOrder, centerPos: playerIds.length, round: 0, lastWinner: null, lastMatch: null },
      players,
    };
  },

  resolveTap(input) {
    const { deck, game, players, playerId, symbol } = input;
    const early = precheck(input, isOver(game));
    if (early) return early;

    const me = players[playerId];
    const myCard = deck[game.deckOrder[me.topCard]];
    const center = deck[game.deckOrder[game.centerPos]];
    if (!myCard.includes(symbol) || !center.includes(symbol)) return penalize(input);

    return {
      result: { kind: "win", round: game.round + 1 },
      game: { ...game, centerPos: game.centerPos + 1, round: game.round + 1, lastWinner: playerId, lastMatch: symbol,
        lastPair: [game.deckOrder[me.topCard], game.deckOrder[game.centerPos]] },
      players: { ...players, [playerId]: { ...me, topCard: game.centerPos, score: me.score + 1 } },
    };
  },

  isOver,
};
