import { describe, expect, it } from "vitest";
import { spectatorsToPromote } from "../src/engine/roster";

const s = (name: string) => ({ name, connected: true });

describe("spectators joining the next game", () => {
  it("all join when there's room", () => {
    expect(spectatorsToPromote(3, { b: s("B"), a: s("A") }, 8)).toEqual(["a", "b"]);
  });

  it("only as many as there are free spots, in a stable order", () => {
    expect(spectatorsToPromote(7, { z: s("Z"), m: s("M"), c: s("C") }, 8)).toEqual(["c"]);
  });

  it("none when the room is full or nobody is watching", () => {
    expect(spectatorsToPromote(8, { a: s("A") }, 8)).toEqual([]);
    expect(spectatorsToPromote(2, undefined, 8)).toEqual([]);
  });
});
