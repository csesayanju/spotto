/** One logged event, as stored under analytics/{day}/{id}. */
export interface AnalyticsEvent {
  uid: string;
  e: string;
  at: number;
  v?: string;
  dev?: string;
  app?: string;
  mode?: string;
  players?: number;
  ms?: number;
  theme?: string;
  role?: string;
  official?: boolean;
}

export type Tally = [label: string, count: number][];

export interface Summary {
  days: { day: string; users: number; games: number }[];
  users: number;
  opens: number;
  roomsCreated: number;
  gamesStarted: number;
  gamesFinished: number;
  practiceRuns: number;
  dailyRuns: number;
  installs: number;
  avgPlayers: number | null;
  avgGameMs: number | null;
  /** Games started and app opens per local hour, 0 to 23. */
  hours: number[];
  modes: Tally;
  themes: Tally;
  /** Unique players per platform / device / version (each player counted once, by their latest event). */
  platforms: Tally;
  devices: Tally;
  versions: Tally;
}

const sorted = (m: Map<string, number>): Tally => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const bump = (m: Map<string, number>, k: string | undefined) => m.set(k ?? "unknown", (m.get(k ?? "unknown") ?? 0) + 1);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Crunches raw events into the dashboard's numbers. `byDay` maps day keys to
 * that day's events; days with no data still show up (as zeros) if listed in `dayKeys`.
 */
export function summarize(byDay: Record<string, Record<string, AnalyticsEvent> | null>, dayKeys: string[], hourOf: (t: number) => number = (t) => new Date(t).getHours()): Summary {
  const everyone = new Set<string>();
  const latest = new Map<string, AnalyticsEvent>();
  const modes = new Map<string, number>();
  const themes = new Map<string, number>();
  const hours = Array<number>(24).fill(0);
  const players: number[] = [];
  const lengths: number[] = [];
  const count: Record<string, number> = {};

  const days = dayKeys.map((day) => {
    const events = Object.values(byDay[day] ?? {});
    const users = new Set<string>();
    let games = 0;
    for (const ev of events) {
      users.add(ev.uid);
      everyone.add(ev.uid);
      count[ev.e] = (count[ev.e] ?? 0) + 1;
      const prev = latest.get(ev.uid);
      if (!prev || ev.at > prev.at) latest.set(ev.uid, ev);
      if (ev.e === "game_start") {
        games++;
        bump(modes, ev.mode);
        bump(themes, ev.theme);
        if (typeof ev.players === "number") players.push(ev.players);
      }
      if (ev.e === "game_end" && typeof ev.ms === "number") lengths.push(ev.ms);
      if ((ev.e === "game_start" || ev.e === "app_open") && typeof ev.at === "number") hours[hourOf(ev.at)]++;
    }
    return { day, users: users.size, games };
  });

  const platforms = new Map<string, number>();
  const devices = new Map<string, number>();
  const versions = new Map<string, number>();
  for (const ev of latest.values()) {
    bump(platforms, ev.app);
    bump(devices, ev.dev);
    bump(versions, ev.v);
  }

  return {
    days,
    users: everyone.size,
    opens: count.app_open ?? 0,
    roomsCreated: count.room_create ?? 0,
    gamesStarted: count.game_start ?? 0,
    gamesFinished: count.game_end ?? 0,
    practiceRuns: count.practice_done ?? 0,
    dailyRuns: count.daily_done ?? 0,
    installs: count.app_installed ?? 0,
    avgPlayers: mean(players),
    avgGameMs: mean(lengths),
    hours,
    modes: sorted(modes),
    themes: sorted(themes),
    platforms: sorted(platforms),
    devices: sorted(devices),
    versions: sorted(versions),
  };
}
