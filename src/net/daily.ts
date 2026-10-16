import { get, onValue, ref, serverTimestamp, set } from "firebase/database";
import { useEffect, useState } from "react";
import type { DailyEntry } from "../engine/daily";
import { db, ensureSignedIn } from "./firebase";

/**
 * Daily challenge storage: daily/{day}/{uid} = { name, startedAt, ms }.
 * The rules allow one entry per player per day, stamp startedAt with the
 * server clock, and only accept an `ms` that matches the server's own elapsed time.
 */

/**
 * Claims today's official attempt: "official", "played" (already started one today),
 * or "offline" (couldn't reach the leaderboard, or Spotto is closed).
 */
export async function startDaily(day: string, name: string): Promise<"official" | "played" | "offline"> {
  try {
    const uid = await ensureSignedIn();
    const mine = ref(db, `daily/${day}/${uid}`);
    if ((await get(mine)).exists()) return "played";
    await set(mine, { name, startedAt: serverTimestamp() });
    return "official";
  } catch {
    return "offline";
  }
}

/** Records the finishing time. False if the server rejected it (e.g. clock mismatch). */
export async function finishDaily(day: string, ms: number): Promise<boolean> {
  const uid = await ensureSignedIn();
  try {
    await set(ref(db, `daily/${day}/${uid}/ms`), Math.round(ms));
    return true;
  } catch {
    return false;
  }
}

/** Live leaderboard for a day. `null` until the first load. */
export function useDailyBoard(day: string): Record<string, DailyEntry> | null {
  const [entries, setEntries] = useState<Record<string, DailyEntry> | null>(null);
  useEffect(() => {
    setEntries(null);
    return onValue(ref(db, `daily/${day}`), (snap) => setEntries(snap.val() ?? {}), () => setEntries({}));
  }, [day]);
  return entries;
}
