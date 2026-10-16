import { currentStreak, nextStreak } from "../engine/daily";
import type { GameMode } from "../shared/types";

/** Personal stats, kept on this device only (localStorage). */
export interface Stats {
  modes: Partial<Record<GameMode, { played: number; won: number }>>;
  /** Keys of games already counted, so a reload of the results screen doesn't count twice. */
  counted: string[];
  dailyStreak: number;
  bestStreak: number;
  lastDailyDay?: string;
  dailyBest?: number;
  dailyRuns: number;
}

const KEY = "spotto:stats";
const PRACTICE_KEY = "spotto:practiceBest";
const empty = (): Stats => ({ modes: {}, counted: [], dailyStreak: 0, bestStreak: 0, dailyRuns: 0 });

export function readStats(): Stats {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return empty(); }
}

function save(s: Stats): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stats just won't stick */ }
}

/** Counts a finished multiplayer game once. */
export function recordGame(key: string, mode: GameMode, won: boolean): void {
  const s = readStats();
  if (s.counted.includes(key)) return;
  const m = s.modes[mode] ?? { played: 0, won: 0 };
  s.modes[mode] = { played: m.played + 1, won: m.won + (won ? 1 : 0) };
  s.counted = [...s.counted, key].slice(-30);
  save(s);
}

/** Counts an official daily run and updates the streak. */
export function recordDaily(day: string, ms: number): void {
  const s = readStats();
  if (s.lastDailyDay === day) return;
  s.dailyStreak = nextStreak(s.lastDailyDay, s.dailyStreak, day);
  s.bestStreak = Math.max(s.bestStreak, s.dailyStreak);
  s.lastDailyDay = day;
  s.dailyBest = s.dailyBest === undefined ? ms : Math.min(s.dailyBest, ms);
  s.dailyRuns += 1;
  save(s);
}

export function streakToday(today: string): number {
  const s = readStats();
  return currentStreak(s.lastDailyDay, s.dailyStreak, today);
}

export function practiceBest(): number | null {
  try { const v = Number(localStorage.getItem(PRACTICE_KEY)); return v > 0 ? v : null; } catch { return null; }
}
