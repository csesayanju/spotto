import { describe, expect, it } from "vitest";
import { currentStreak, dailyRandom, dayKey, msUntilNextDay, nextStreak, previousDay, ranking } from "../src/engine/daily";
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

describe("daily streaks", () => {
  it("knows yesterday, across months and years", () => {
    expect(previousDay("2026-11-01")).toBe("2026-10-31");
    expect(previousDay("2027-01-01")).toBe("2026-12-31");
  });

  it("grows on consecutive days and restarts after a gap", () => {
    expect(nextStreak(undefined, 0, "2026-10-16")).toBe(1);
    expect(nextStreak("2026-10-15", 4, "2026-10-16")).toBe(5);
    expect(nextStreak("2026-10-16", 5, "2026-10-16")).toBe(5);
    expect(nextStreak("2026-10-13", 9, "2026-10-16")).toBe(1);
  });

  it("shows the streak until a full day is missed", () => {
    expect(currentStreak("2026-10-15", 3, "2026-10-16")).toBe(3);
    expect(currentStreak("2026-10-14", 3, "2026-10-16")).toBe(0);
  });
});
