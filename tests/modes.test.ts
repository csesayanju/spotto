import { describe, expect, it } from "vitest";
import { MODES } from "../src/engine";
import { winnersOf, type ModeRules } from "../src/engine/rules";
import { generateDeck, sharedSymbol } from "../src/shared/deck";
import type { GameState, PlayerState } from "../src/shared/types";

const deck = generateDeck(7);
const base = (): PlayerState => ({ name: "", ready: true, connected: true, topCard: -1, score: 0, frozenUntil: 0 });

function setup(rules: ModeRules, ids: string[]) {
  const s = rules.setup(ids, deck.length, () => 0.42);
  const players = Object.fromEntries(ids.map((id) => [id, { ...base(), name: id, ...s.players[id] }]));
  return { game: s.game, players };
}

const card = (game: GameState, pos: number) => deck[game.deckOrder[pos]];
const center = (game: GameState) => card(game, game.centerPos);

describe("well", () => {
  const { well } = MODES;

  it("deals equal piles and one center card", () => {
    const { game, players } = setup(well, ["a", "b", "c"]);
    expect(game.centerPos).toBe(0);
    expect(Object.values(players).map((p) => p.score)).toEqual([18, 18, 18]);
    expect(players.b.topCard).toBe(19);
    expect(players.b.pileEnd).toBe(37);
  });

  it("a match plays your top card onto the center", () => {
    const { game, players } = setup(well, ["a", "b"]);
    const symbol = sharedSymbol(card(game, players.a.topCard), center(game))!;
    const out = well.resolveTap({ deck, game, players, playerId: "a", symbol, round: 0, now: 0, penaltyMs: 1500 });
    expect(out.result.kind).toBe("win");
    expect(out.game.centerPos).toBe(players.a.topCard);
    expect(out.players.a.topCard).toBe(players.a.topCard + 1);
    expect(out.players.a.score).toBe(players.a.score - 1);
  });

  it("ends when someone empties their pile, and they win", () => {
    let { game, players } = setup(well, ["a", "b"]);
    while (!well.isOver(game, players)) {
      const symbol = sharedSymbol(card(game, players.a.topCard), center(game))!;
      const out = well.resolveTap({ deck, game, players, playerId: "a", symbol, round: game.round, now: 0, penaltyMs: 0 });
      game = out.game; players = out.players;
    }
    expect(players.a.score).toBe(0);
    expect(players.a.topCard).toBe(players.a.pileEnd);
    expect(players.b.score).toBe(28);
    expect(well.winsWith).toBe("fewest");
  });
});

describe("gift", () => {
  const { gift } = MODES;

  it("tapping the match on an opponent's card gives them the center card", () => {
    const { game, players } = setup(gift, ["a", "b", "c"]);
    const symbol = sharedSymbol(card(game, players.b.topCard), center(game))!;
    const out = gift.resolveTap({ deck, game, players, playerId: "a", symbol, target: "b", round: 0, now: 0, penaltyMs: 1500 });
    expect(out.result.kind).toBe("win");
    expect(out.players.b.score).toBe(2);
    expect(out.players.b.topCard).toBe(game.centerPos);
    expect(out.players.a.score).toBe(1);
    expect(out.game.centerPos).toBe(game.centerPos + 1);
    expect(out.game.lastTarget).toBe("b");
  });

  it("targeting yourself or the wrong card is a wrong tap", () => {
    const { game, players } = setup(gift, ["a", "b"]);
    const own = sharedSymbol(card(game, players.a.topCard), center(game))!;
    const self = gift.resolveTap({ deck, game, players, playerId: "a", symbol: own, target: "a", round: 0, now: 10, penaltyMs: 1500 });
    expect(self.result.kind).toBe("wrong");
    expect(self.players.a.frozenUntil).toBe(1510);

    const miss = card(game, players.b.topCard).find((s) => !center(game).includes(s))!;
    const wrong = gift.resolveTap({ deck, game, players, playerId: "a", symbol: miss, target: "b", round: 0, now: 0, penaltyMs: 1500 });
    expect(wrong.result.kind).toBe("wrong");
  });

  it("only the first of simultaneous gifts counts", () => {
    let { game, players } = setup(gift, ["a", "b", "c"]);
    const symbol = sharedSymbol(card(game, players.c.topCard), center(game))!;
    const kinds = ["a", "b"].map((id) => {
      const out = gift.resolveTap({ deck, game, players, playerId: id, symbol, target: "c", round: 0, now: 0, penaltyMs: 0 });
      game = out.game; players = out.players;
      return out.result.kind;
    });
    expect(kinds).toEqual(["win", "stale"]);
    expect(players.c.score).toBe(2);
  });
});

describe("countdown", () => {
  it("taps before startsAt are ignored", () => {
    const { game, players } = setup(MODES.tower, ["a", "b"]);
    const timed = { ...game, startsAt: 5000 };
    const symbol = sharedSymbol(card(game, players.a.topCard), center(game))!;
    const early = MODES.tower.resolveTap({ deck, game: timed, players, playerId: "a", symbol, round: 0, now: 4999, penaltyMs: 0 });
    expect(early.result.kind).toBe("stale");
    const onTime = MODES.tower.resolveTap({ deck, game: timed, players, playerId: "a", symbol, round: 0, now: 5000, penaltyMs: 0 });
    expect(onTime.result.kind).toBe("win");
  });
});

describe("game length", () => {
  it("deals only the requested number of cards", () => {
    const s = MODES.tower.setup(["a", "b"], deck.length, () => 0.3, 21);
    expect(s.game.deckOrder).toHaveLength(21);
    expect(new Set(s.game.deckOrder).size).toBe(21);
    const w = MODES.well.setup(["a", "b", "c"], deck.length, () => 0.3, 21);
    expect(w.players.a.score).toBe(6);
  });
});

describe("room results", () => {
  const p = (score: number) => ({ ...base(), score });

  it("picks the highest or lowest score depending on the mode", () => {
    expect(winnersOf(MODES.tower, { a: p(9), b: p(4) })).toEqual(["a"]);
    expect(winnersOf(MODES.gift, { a: p(9), b: p(4) })).toEqual(["b"]);
    expect(winnersOf(MODES.well, { a: p(0), b: p(0), c: p(3) })).toEqual(["a", "b"]);
  });

  it("records the two matched cards for the replay", () => {
    const { game, players } = setup(MODES.tower, ["a", "b"]);
    const symbol = sharedSymbol(card(game, players.a.topCard), center(game))!;
    const out = MODES.tower.resolveTap({ deck, game, players, playerId: "a", symbol, round: 0, now: 0, penaltyMs: 0 });
    const [mine, mid] = out.game.lastPair!;
    expect(sharedSymbol(deck[mine], deck[mid])).toBe(symbol);
  });
});

describe("hot potato", () => {
  const { potato } = MODES;

  it("deals small piles", () => {
    const { players } = setup(potato, ["a", "b", "c"]);
    expect(Object.values(players).map((p) => p.score)).toEqual([5, 5, 5]);
    expect(players.b.pile).toEqual([5, 6, 7, 8, 9]);
    expect(players.b.topCard).toBe(9);
  });

  it("a match passes your top card onto their pile", () => {
    const { game, players } = setup(potato, ["a", "b"]);
    const symbol = sharedSymbol(card(game, players.a.topCard), card(game, players.b.topCard))!;
    const out = potato.resolveTap({ deck, game, players, playerId: "a", symbol, target: "b", round: 0, now: 0, penaltyMs: 0 });
    expect(out.result.kind).toBe("win");
    expect(out.players.a.score).toBe(4);
    expect(out.players.a.topCard).toBe(3);
    expect(out.players.b.score).toBe(6);
    expect(out.players.b.topCard).toBe(4);
    expect(out.game.lastTarget).toBe("b");
  });

  it("ends when someone runs out, and rejects taps after the timer", () => {
    let { game, players } = setup(potato, ["a", "b"]);
    while (!potato.isOver(game, players)) {
      const symbol = sharedSymbol(card(game, players.a.topCard), card(game, players.b.topCard))!;
      const out = potato.resolveTap({ deck, game, players, playerId: "a", symbol, target: "b", round: game.round, now: 0, penaltyMs: 0 });
      game = out.game; players = out.players;
    }
    expect(players.a.score).toBe(0);
    expect(players.b.score).toBe(10);

    const fresh = setup(potato, ["a", "b"]);
    const timed = { ...fresh.game, endsAt: 1000 };
    const symbol = sharedSymbol(card(timed, fresh.players.a.topCard), card(timed, fresh.players.b.topCard))!;
    const late = potato.resolveTap({ deck, game: timed, players: fresh.players, playerId: "a", symbol, target: "b", round: 0, now: 1000, penaltyMs: 0 });
    expect(late.result.kind).toBe("stale");
  });
});

describe("players who dropped out", () => {
  it("can't be sent cards in Gift or Potato, and tapping them costs nothing", () => {
    for (const mode of ["gift", "potato"] as const) {
      const rules = MODES[mode];
      const { game, players } = setup(rules, ["a", "b"]);
      players.b = { ...players.b, connected: false };
      const other = mode === "gift" ? center(game) : card(game, players.a.topCard);
      const symbol = sharedSymbol(card(game, players.b.topCard), other)!;
      const out = rules.resolveTap({ deck, game, players, playerId: "a", symbol, target: "b", round: 0, now: 0, penaltyMs: 1500 });
      expect(out.result.kind).toBe("stale");
      expect(out.players.a.frozenUntil).toBe(0);
    }
  });
});
