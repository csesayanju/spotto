import { describe, expect, it } from "vitest";
import { summarize, type AnalyticsEvent } from "../src/engine/analytics";

const ev = (uid: string, e: string, at: number, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent =>
  ({ uid, e, at, v: "0.8.1", dev: "phone", app: "web", ...extra });

describe("analytics summary", () => {
  const byDay = {
    "2026-10-15": {
      a: ev("ann", "app_open", 1000),
      b: ev("ann", "game_start", 2000, { mode: "tower", players: 3, theme: "animals" }),
      c: ev("ann", "game_end", 3000, { ms: 60_000 }),
    },
    "2026-10-16": {
      d: ev("ann", "app_open", 5000, { app: "pwa" }),
      e: ev("ben", "app_open", 5100, { dev: "desktop" }),
      f: ev("ben", "game_start", 6000, { mode: "gift", players: 5, dev: "desktop" }),
      g: ev("ben", "game_end", 7000, { ms: 120_000, dev: "desktop" }),
      h: ev("cat", "practice_done", 8000, { ms: 15_000 }),
    },
  };
  const s = summarize(byDay, ["2026-10-14", "2026-10-15", "2026-10-16"], (t) => Math.floor(t / 1000) % 24);

  it("counts players per day and overall, including empty days", () => {
    expect(s.days).toEqual([
      { day: "2026-10-14", users: 0, games: 0 },
      { day: "2026-10-15", users: 1, games: 1 },
      { day: "2026-10-16", users: 3, games: 1 },
    ]);
    expect(s.users).toBe(3);
  });

  it("totals events and averages games", () => {
    expect(s.opens).toBe(3);
    expect(s.gamesStarted).toBe(2);
    expect(s.practiceRuns).toBe(1);
    expect(s.avgPlayers).toBe(4);
    expect(s.avgGameMs).toBe(90_000);
  });

  it("breaks down modes, and platforms by each player's latest event", () => {
    expect(s.modes).toEqual([["gift", 1], ["tower", 1]]);
    expect(s.platforms).toEqual([["web", 2], ["pwa", 1]]);
    expect(s.devices).toEqual([["phone", 2], ["desktop", 1]]);
  });

  it("buckets opens and game starts by hour", () => {
    expect(s.hours[1]).toBe(1); // app_open at 1 s
    expect(s.hours[6]).toBe(1); // game_start at 6 s
    expect(s.hours[8]).toBe(0); // practice isn't counted in the traffic hours
  });

  it("handles no data at all", () => {
    const empty = summarize({}, ["2026-10-16"]);
    expect(empty.users).toBe(0);
    expect(empty.avgPlayers).toBeNull();
    expect(empty.modes).toEqual([]);
  });
});
