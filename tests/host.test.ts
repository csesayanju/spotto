import { describe, expect, it } from "vitest";
import { pickNewHost } from "../src/engine/host";
import type { PlayerState } from "../src/shared/types";

const p = (connected: boolean): PlayerState =>
  ({ name: "", ready: false, connected, topCard: -1, score: 0, frozenUntil: 0 });

describe("host handover", () => {
  it("prefers a connected player", () => {
    expect(pickNewHost({ a: p(false), b: p(true), c: p(true) })).toBe("b");
  });
  it("falls back to anyone if all are offline", () => {
    expect(pickNewHost({ z: p(false), y: p(false) })).toBe("y");
  });
});
