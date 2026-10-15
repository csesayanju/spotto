import { shuffle } from "../../shared/deck";
import type { GameState } from "../../shared/types";
import { penalize, precheck, type ModeRules } from "../rules";

const isOver = (game: GameState) => game.centerPos >= game.deckOrder.length;

/**
 * Gift: each player starts with one card. Find a symbol shared by the
 * center card and an opponent's card, and tap it on their card: they get
 * the center card on top of their pile. Fewest cards wins.
 */
export const gift: ModeRules = {
  winsWith: "fewest",

  setup(playerIds, deckSize, rand) {
    const deckOrder = shuffle([...Array(deckSize).keys()], rand);
    const players: Record<string, { topCard: number; score: number }> = {};
    playerIds.forEach((id, i) => (players[id] = { topCard: i, score: 1 }));
    return {
      game: { mode: "gift", deckOrder, centerPos: playerIds.length, round: 0, lastWinner: null, lastMatch: null },
      players,
    };
  },

  resolveTap(input) {
    const { deck, game, players, playerId, symbol, target } = input;
    const early = precheck(input, isOver(game));
    if (early) return early;

    const them = target ? players[target] : undefined;
    if (!them || target === playerId) return penalize(input);
    const theirCard = deck[game.deckOrder[them.topCard]];
    const center = deck[game.deckOrder[game.centerPos]];
    if (!theirCard.includes(symbol) || !center.includes(symbol)) return penalize(input);

    return {
      result: { kind: "win", round: game.round + 1 },
      game: { ...game, centerPos: game.centerPos + 1, round: game.round + 1, lastWinner: playerId, lastMatch: symbol, lastTarget: target },
      players: { ...players, [target!]: { ...them, topCard: game.centerPos, score: them.score + 1 } },
    };
  },

  isOver,
};
