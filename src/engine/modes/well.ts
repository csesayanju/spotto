import { dealOrder } from "../../shared/deck";
import type { GameState, PlayerId, PlayerState } from "../../shared/types";
import { penalize, precheck, type ModeRules } from "../rules";

const isOver = (_game: GameState, players: Record<PlayerId, PlayerState>) =>
  Object.values(players).some((p) => p.score <= 0);

/**
 * Well: one card starts in the center and the rest are dealt evenly into
 * each player's pile. Match your top card with the center card to play it
 * onto the center, revealing your next card. First to empty their pile wins.
 */
export const well: ModeRules = {
  winsWith: "fewest",

  setup(playerIds, deckSize, rand, count) {
    const deckOrder = dealOrder(deckSize, count, rand);
    const perPlayer = Math.floor((deckOrder.length - 1) / playerIds.length);
    const players: Record<string, { topCard: number; pileEnd: number; score: number }> = {};
    playerIds.forEach((id, i) => {
      const start = 1 + i * perPlayer;
      players[id] = { topCard: start, pileEnd: start + perPlayer, score: perPlayer };
    });
    return {
      game: { mode: "well", deckOrder, centerPos: 0, round: 0, lastWinner: null, lastMatch: null },
      players,
    };
  },

  resolveTap(input) {
    const { deck, game, players, playerId, symbol } = input;
    const early = precheck(input, isOver(game, players));
    if (early) return early;

    const me = players[playerId];
    const myCard = deck[game.deckOrder[me.topCard]];
    const center = deck[game.deckOrder[game.centerPos]];
    if (!myCard.includes(symbol) || !center.includes(symbol)) return penalize(input);

    return {
      result: { kind: "win", round: game.round + 1 },
      game: { ...game, centerPos: me.topCard, round: game.round + 1, lastWinner: playerId, lastMatch: symbol,
        lastPair: [game.deckOrder[me.topCard], game.deckOrder[game.centerPos]] },
      players: { ...players, [playerId]: { ...me, topCard: me.topCard + 1, score: me.score - 1 } },
    };
  },

  isOver,
};
