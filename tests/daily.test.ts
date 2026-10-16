import { describe, expect, it } from "vitest";
import { dailyRandom, dayKey, msUntilNextDay, ranking } from "../src/engine/daily";
import { tower } from "../src/engine/modes/tower";

const deal = (day: string) => tower.setup(["me"], 57, dailyRandom(day), 16).game.deckOrder;

describe("daily challenge", () => {
  it("uses the UTC date", () => {
    expect(dayKey(Date.UTC(2026, 9, 16, 23, 59))).toBe("2026-10-16");
    expect(dayKey(Date.UTC(2026, 9, 17, 0, 0))).toBe("2026-10-17");
    expect(msUntilNextDay(Date.UTC(2026, 9, 16, 23, 0))).toBe(3600_000);
  });

  it("deals the same cards to everyone on the same day, different ones the next", () => {
    expect(deal("2026-10-16")).toEqual(deal("2026-10-16"));
    expect(deal("2026-10-16")).not.toEqual(deal("2026-10-17"));
    expect(deal("2026-10-16")).toHaveLength(16);
  });

  it("ranks finished runs only, fastest first", () => {
    const r = ranking({
      a: { name: "A", startedAt: 3, ms: 9000 },
      b: { name: "B", startedAt: 1 },
      c: { name: "C", startedAt: 2, ms: 7000 },
      d: { name: "D", startedAt: 1, ms: 9000 },
    });
    expect(r.map(([id]) => id)).toEqual(["c", "d", "a"]);
  });
});
