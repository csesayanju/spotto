import { get, onValue, ref, set, update } from "firebase/database";
import { CONFIG } from "../shared/config";
import type { Room, RoomMeta, PlayerState } from "../shared/types";
import { db, ensureSignedIn } from "./firebase";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid confusion

function randomCode(): string {
  return Array.from({ length: CONFIG.roomCodeLength }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

function newPlayer(name: string): PlayerState {
  return { name, ready: false, connected: true, topCard: -1, score: 0, frozenUntil: 0 };
}

export async function createRoom(name: string): Promise<string> {
  const uid = await ensureSignedIn();
  // TODO: retry if code already exists
  const code = randomCode();
  const meta: RoomMeta = { hostId: uid, status: "lobby", mode: "tower", createdAt: Date.now() };
  await set(ref(db, `rooms/${code}/meta`), meta);
  await set(ref(db, `rooms/${code}/players/${uid}`), newPlayer(name));
  return code;
}

export async function joinRoom(code: string, name: string): Promise<void> {
  const uid = await ensureSignedIn();
  const snap = await get(ref(db, `rooms/${code}/meta`));
  if (!snap.exists()) throw new Error("No room with that code. Check the letters and try again.");
  // TODO: enforce CONFIG.maxPlayers and block joining mid-game
  await set(ref(db, `rooms/${code}/players/${uid}`), newPlayer(name));
}

export async function setReady(code: string, ready: boolean): Promise<void> {
  const uid = await ensureSignedIn();
  await update(ref(db, `rooms/${code}/players/${uid}`), { ready });
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  return onValue(ref(db, `rooms/${code}`), (snap) => cb(snap.val()));
}
