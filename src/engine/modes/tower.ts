import { shuffle } from "../../shared/deck";
import type { GameState } from "../../shared/types";
import type { ModeRules } from "../rules";

const isOver = (game: GameState) => game.centerPos >= game.deckOrder.length;

/**
 * The Tower: each player starts with one card. Match your card with the
 * center card; the winner takes the center card (it becomes their new top
 * card) and the next center card is revealed. Most cards wins.
 */
export const tower: ModeRules = {
  setup(playerIds, deckSize, rand) {
    const deckOrder = shuffle([...Array(deckSize).keys()], rand);
    const players: Record<string, { topCard: number; score: number }> = {};
    playerIds.forEach((id, i) => (players[id] = { topCard: i, score: 1 }));
    return {
      game: { mode: "tower", deckOrder, centerPos: playerIds.length, round: 0, lastWinner: null },
      players,
    };
  },

  resolveTap({ deck, game, players, playerId, symbol, round, now, penaltyMs }) {
    const me = players[playerId];
    if (!me || round !== game.round || isOver(game))
      return { result: { kind: "stale" }, game, players };
    if (me.frozenUntil > now) return { result: { kind: "frozen" }, game, players };

    const myCard = deck[game.deckOrder[me.topCard]];
    const center = deck[game.deckOrder[game.centerPos]];
    if (!myCard.includes(symbol) || !center.includes(symbol)) {
      return {
        result: { kind: "wrong" },
        game,
        players: { ...players, [playerId]: { ...me, frozenUntil: now + penaltyMs } },
      };
    }

    return {
      result: { kind: "win", round: game.round + 1 },
      game: { ...game, centerPos: game.centerPos + 1, round: game.round + 1, lastWinner: playerId },
      players: { ...players, [playerId]: { ...me, topCard: game.centerPos, score: me.score + 1 } },
    };
  },

  isOver,
};
