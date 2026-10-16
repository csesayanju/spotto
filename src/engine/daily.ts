import { hashSeed, mulberry32 } from "../shared/random";

/** The daily challenge's id: the UTC date, e.g. "2026-10-16". Everyone shares it. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Milliseconds until the next challenge (UTC midnight). */
export function msUntilNextDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now;
}

/** Seeded random for a day, so every player gets the same cards. */
export function dailyRandom(day: string): () => number {
  return mulberry32(hashSeed(`spotto-daily-${day}`));
}

export interface DailyEntry {
  name: string;
  startedAt: number;
  /** Finishing time; missing if the run was started but not finished. */
  ms?: number;
}

/** Finished entries, fastest first, ties broken by who finished first. */
export function ranking(entries: Record<string, DailyEntry> = {}): [string, DailyEntry & { ms: number }][] {
  return Object.entries(entries)
    .filter((e): e is [string, DailyEntry & { ms: number }] => typeof e[1].ms === "number")
    .sort(([, a], [, b]) => a.ms - b.ms || a.startedAt - b.startedAt);
}

/** The day before, as a day key. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Streak after finishing an official run on `day`: +1 if yesterday was played, same if today already counted, else 1. */
export function nextStreak(lastDay: string | undefined, streak: number, day: string): number {
  if (lastDay === day) return streak;
  return lastDay === previousDay(day) ? streak + 1 : 1;
}

/** Streak to show today: it survives until the end of the day after the last run. */
export function currentStreak(lastDay: string | undefined, streak: number, today: string): number {
  return lastDay === today || lastDay === previousDay(today) ? streak : 0;
}
