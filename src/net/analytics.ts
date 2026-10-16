import { Capacitor } from "@capacitor/core";
import { push, ref, serverTimestamp } from "firebase/database";
import { dayKey } from "../engine/daily";
import { app, db, ensureSignedIn } from "./firebase";
import { serverNow } from "./status";

/**
 * Anonymous usage events for the dev-only Analytics tab (analytics/{day}/{id}),
 * mirrored to Google Analytics when a measurement id is configured.
 * No names, no IP addresses: just the anonymous player id, what happened, and the device type.
 */
export type EventName =
  | "app_open" | "room_create" | "room_join" | "game_start" | "game_end"
  | "practice_done" | "daily_done" | "app_installed";

type Params = Partial<Record<"mode" | "len" | "match" | "role" | "theme", string> & Record<"players" | "ms", number> & Record<"official", boolean>>;

const platform = (): string => {
  if (Capacitor.isNativePlatform()) return "apk";
  return matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone ? "pwa" : "web";
};
const device = (): string => (matchMedia("(pointer: coarse)").matches ? "phone" : "desktop");

// Google Analytics loads lazily, and only on the web with a measurement id.
let ga: Promise<((name: string, params: Params) => void) | null> | null = null;
function googleAnalytics() {
  if (!ga) {
    ga = (async () => {
      if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || Capacitor.isNativePlatform()) return null;
      const { getAnalytics, isSupported, logEvent } = await import("firebase/analytics");
      if (!(await isSupported())) return null;
      const analytics = getAnalytics(app);
      return (name: string, params: Params) => logEvent(analytics, name, params);
    })().catch(() => null);
  }
  return ga;
}

/** Fire-and-forget: tracking must never break or slow the game. Skipped in local development. */
export function track(event: EventName, params: Params = {}): void {
  if (import.meta.env.DEV) return;
  (async () => {
    const uid = await ensureSignedIn();
    await push(ref(db, `analytics/${dayKey(serverNow())}`), {
      uid, e: event, at: serverTimestamp(), v: __APP_VERSION__, dev: device(), app: platform(), ...params,
    });
  })().catch(() => undefined);
  googleAnalytics().then((log) => log?.(event, params)).catch(() => undefined);
}
