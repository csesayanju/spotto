import { describe, expect, it } from "vitest";
import { tower } from "../src/engine/modes/tower";
import { generateDeck, sharedSymbol } from "../src/shared/deck";
import type { PlayerState } from "../src/shared/types";

/** Test harness: simulates several players tapping at once against the rules. */
const deck = generateDeck(7);
const base = (): PlayerState => ({ name: "", ready: true, connected: true, topCard: -1, score: 0, frozenUntil: 0 });

function setup(ids: string[]) {
  const s = tower.setup(ids, deck.length, () => 0.42);
  const players = Object.fromEntries(ids.map((id) => [id, { ...base(), name: id, ...s.players[id] }]));
  return { game: s.game, players };
}

const correct = (game: any, players: any, id: string) =>
  sharedSymbol(deck[game.deckOrder[players[id].topCard]], deck[game.deckOrder[game.centerPos]])!;

describe("tower tap arbiter", () => {
  it("only the first of simultaneous correct taps wins", () => {
    let { game, players } = setup(["a", "b", "c"]);
    const round = game.round;
    const results = ["a", "b", "c"].map((id) => {
      const out = tower.resolveTap({ deck, game, players, playerId: id,
        symbol: correct(game, players, id), round, now: 0, penaltyMs: 1500 });
      game = out.game; players = out.players;
      return out.result.kind;
    });
    expect(results).toEqual(["win", "stale", "stale"]);
    expect(players.a.score).toBe(2);
  });

  it("wrong tap freezes the player", () => {
    const { game, players } = setup(["a", "b"]);
    const center = deck[game.deckOrder[game.centerPos]];
    const wrong = deck[game.deckOrder[players.a.topCard]].find((s) => !center.includes(s))!;
    const out = tower.resolveTap({ deck, game, players, playerId: "a", symbol: wrong, round: 0, now: 100, penaltyMs: 1500 });
    expect(out.result.kind).toBe("wrong");
    expect(out.players.a.frozenUntil).toBe(1600);
  });

  it("a full game ends with all cards dealt", () => {
    let { game, players } = setup(["a", "b"]);
    let turn = 0;
    while (!tower.isOver(game)) {
      const id = turn++ % 2 ? "b" : "a";
      const out = tower.resolveTap({ deck, game, players, playerId: id,
        symbol: correct(game, players, id), round: game.round, now: 0, penaltyMs: 0 });
      game = out.game; players = out.players;
    }
    expect(players.a.score + players.b.score).toBe(deck.length);
  });
});
