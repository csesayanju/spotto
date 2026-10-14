import { onDisconnect, onValue, ref, set } from "firebase/database";
import { db, ensureSignedIn } from "./firebase";

/** Marks the player connected, and disconnected automatically if the socket drops. */
export async function trackPresence(code: string): Promise<() => void> {
  const uid = await ensureSignedIn();
  const connectedRef = ref(db, `rooms/${code}/players/${uid}/connected`);
  // TODO: host-side cleanup of players disconnected longer than CONFIG.reconnectGraceMs
  return onValue(ref(db, ".info/connected"), async (snap) => {
    if (snap.val() !== true) return;
    await onDisconnect(connectedRef).set(false);
    await set(connectedRef, true);
  });
}
