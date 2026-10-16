import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { track } from "../net/analytics";

/** Chrome's install event; not in the DOM typings yet. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // we show our own button instead of the browser's mini bar
  deferred = e as InstallPromptEvent;
  listeners.forEach((l) => l());
});
addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); track("app_installed"); });

const standalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Web only: registers the service worker that makes Spotto installable. */
export function registerServiceWorker(): void {
  if (Capacitor.isNativePlatform() || !import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => undefined));
}

/**
 * How this device can install the app: a one-tap prompt (Android/desktop Chrome),
 * instructions (iPhone/iPad Safari, which has no prompt), or nothing (already installed, or the APK).
 */
export function useInstall(): { kind: "prompt" | "ios" | null; install: () => Promise<void> } {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    deferred = null;
    listeners.forEach((l) => l());
  };

  if (Capacitor.isNativePlatform() || standalone()) return { kind: null, install };
  if (deferred) return { kind: "prompt", install };
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return { kind: "ios", install };
  return { kind: null, install };
}
