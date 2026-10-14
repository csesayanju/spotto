import { onDisconnect, onValue, ref, set } from "firebase/database";
import { db, ensureSignedIn } from "./firebase";

function connectedRef(code: string, uid: string) {
  return ref(db, `rooms/${code}/players/${uid}/connected`);
}

/**
 * Marks the player connected, and has the server mark them offline if the
 * socket drops. The returned stop function also cancels that server-side
 * hook, so a player who left doesn't reappear as an offline ghost.
 */
export async function trackPresence(code: string): Promise<() => void> {
  const uid = await ensureSignedIn();
  const target = connectedRef(code, uid);
  const unsub = onValue(ref(db, ".info/connected"), async (snap) => {
    if (snap.val() !== true) return;
    await onDisconnect(target).set(false);
    await set(target, true);
  });
  return () => {
    unsub();
    onDisconnect(target).cancel().catch(() => undefined);
  };
}

export async function cancelPresence(code: string): Promise<void> {
  const uid = await ensureSignedIn();
  await onDisconnect(connectedRef(code, uid)).cancel();
}
