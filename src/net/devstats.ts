import { get, onValue, ref, remove } from "firebase/database";
import { useEffect, useState } from "react";
import type { AnalyticsEvent } from "../engine/analytics";
import { previousDay } from "../engine/daily";
import type { Room } from "../shared/types";
import { db } from "./firebase";

/** Whether this device's anonymous id is listed under admins/ (set in the Firebase console). */
export function useIsAdmin(uid: string | null): boolean | null {
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!uid) return;
    get(ref(db, `admins/${uid}`)).then((s) => setAdmin(s.val() === true), () => setAdmin(false));
  }, [uid]);
  return admin;
}

/** The last `n` day keys, oldest first, ending today. */
export function lastDays(today: string, n: number): string[] {
  const days = [today];
  while (days.length < n) days.unshift(previousDay(days[0]));
  return days;
}

/** Raw events for each day (admins only). */
export async function loadEvents(days: string[]): Promise<Record<string, Record<string, AnalyticsEvent> | null>> {
  const snaps = await Promise.all(days.map((d) => get(ref(db, `analytics/${d}`))));
  return Object.fromEntries(days.map((d, i) => [d, snaps[i].val()]));
}

/** Deletes analytics older than `keepDays` (looks back a further 120 days). */
export async function pruneEvents(today: string, keepDays: number): Promise<void> {
  const old = lastDays(today, keepDays + 120).slice(0, 120);
  await Promise.all(old.map((d) => remove(ref(db, `analytics/${d}`)).catch(() => undefined)));
}

export interface LiveRooms { rooms: number; playing: number; online: number; watching: number }

/** Rooms right now: how many, how many mid-game, players online, spectators. */
export function useLiveRooms(): LiveRooms | null {
  const [live, setLive] = useState<LiveRooms | null>(null);
  useEffect(() => onValue(ref(db, "rooms"), (snap) => {
    const rooms = Object.values((snap.val() ?? {}) as Record<string, Room>);
    setLive({
      rooms: rooms.length,
      playing: rooms.filter((r) => r.meta?.status === "playing").length,
      online: rooms.reduce((n, r) => n + Object.values(r.players ?? {}).filter((p) => p.connected).length, 0),
      watching: rooms.reduce((n, r) => n + Object.keys(r.spectators ?? {}).length, 0),
    });
  }, () => setLive(null)), []);
  return live;
}
