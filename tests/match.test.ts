import { describe, expect, it } from "vitest";
import { addWins, matchChampions, matchTarget } from "../src/engine/match";

describe("best-of matches", () => {
  it("needs 1, 2 or 3 wins", () => {
    expect(matchTarget()).toBe(1);
    expect(matchTarget("bo3")).toBe(2);
    expect(matchTarget("bo5")).toBe(3);
  });

  it("tallies wins, ties count for everyone", () => {
    expect(addWins({ a: 1 }, ["a", "b"])).toEqual({ a: 2, b: 1 });
    expect(addWins(undefined, ["c"])).toEqual({ c: 1 });
  });

  it("finds the champion once someone reaches the target", () => {
    expect(matchChampions({ a: 1, b: 1 }, "bo3")).toEqual([]);
    expect(matchChampions({ a: 2, b: 1 }, "bo3")).toEqual(["a"]);
    expect(matchChampions({ a: 1 }, "single")).toEqual(["a"]);
    expect(matchChampions(undefined, "bo5")).toEqual([]);
  });
});
