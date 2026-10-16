import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "./firebase";

/* ---------- server clock ---------- */

// Firebase reports how far this device's clock is from the server's, so every
// device can agree on times like "the game starts at" and "frozen until".
let offset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (snap) => { offset = snap.val() ?? 0; });

/** Current time on the server's clock. */
export const serverNow = () => Date.now() + offset;

/** Re-renders until `until` (server time) has passed, returning ms remaining. */
export function useCountdown(until: number | undefined, stepMs = 100): number {
  const [left, setLeft] = useState(() => Math.max(0, (until ?? 0) - serverNow()));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (until ?? 0) - serverNow()));
    tick();
    if (!until || until <= serverNow()) return;
    const t = setInterval(tick, stepMs);
    return () => clearInterval(t);
  }, [until, stepMs]);
  return left;
}

/* ---------- connection ---------- */

/** False while the socket to Firebase is down. Starts true to avoid a flash on load. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let first = true;
    return onValue(ref(db, ".info/connected"), (snap) => {
      // The first value is often `false` while the socket is still opening.
      if (first && snap.val() === false) { first = false; return; }
      first = false;
      setOnline(snap.val() === true);
    });
  }, []);
  return online;
}

/* ---------- open / closed switch ---------- */

/**
 * The owner's off switch: set config/open to false in the Firebase console to close
 * Spotto. New rooms and joins are blocked (also by the rules); games in progress finish.
 */
export function useOpen(): boolean {
  const [open, setOpen] = useState(true);
  useEffect(() => onValue(ref(db, "config/open"), (snap) => setOpen(snap.val() !== false), () => setOpen(true)), []);
  return open;
}
