import {
  endAt, get, onValue, orderByChild, query, ref, remove, runTransaction, set, update,
} from "firebase/database";
import { pickNewHost } from "../engine/host";
import { CONFIG } from "../shared/config";
import type { PlayerState, Room, RoomMeta } from "../shared/types";
import { db, ensureSignedIn } from "./firebase";
import { cancelPresence } from "./presence";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to avoid confusion
const SAVED_ROOM_KEY = "spotto:room";

function randomCode(): string {
  return Array.from({ length: CONFIG.roomCodeLength }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
}

function newPlayer(name: string): PlayerState {
  return { name, ready: false, connected: true, topCard: -1, score: 0, frozenUntil: 0 };
}

/* ---------- remembered room (rejoin after reload) ---------- */

export function saveRoomCode(code: string | null) {
  try {
    if (code) localStorage.setItem(SAVED_ROOM_KEY, code);
    else localStorage.removeItem(SAVED_ROOM_KEY);
  } catch { /* storage unavailable: rejoin just won't work */ }
}

/** Returns the saved room code if that room still exists and this player is in it. */
export async function restoreRoom(): Promise<string | null> {
  let code: string | null = null;
  try { code = localStorage.getItem(SAVED_ROOM_KEY); } catch { return null; }
  if (!code) return null;
  const uid = await ensureSignedIn();
  const snap = await get(ref(db, `rooms/${code}/players/${uid}`));
  if (snap.exists()) return code;
  saveRoomCode(null);
  return null;
}

/* ---------- create / join / leave ---------- */

export async function createRoom(name: string): Promise<string> {
  const uid = await ensureSignedIn();
  sweepOldRooms().catch(() => { /* best effort */ });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const meta: RoomMeta = { hostId: uid, status: "lobby", mode: "tower", createdAt: Date.now() };
    const room: Room = { meta, players: { [uid]: newPlayer(name) } };
    // Transaction only succeeds if the code is free, so two rooms can't collide.
    const res = await runTransaction(ref(db, `rooms/${code}`), (cur) => (cur === null ? room : undefined));
    if (res.committed) return code;
  }
  throw new Error("Couldn't create a room. Try again.");
}

export async function joinRoom(code: string, name: string): Promise<void> {
  const uid = await ensureSignedIn();
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val() as Room | null;
  if (!room) throw new Error("No room with that code. Check the letters and try again.");

  const players = room.players ?? {};
  if (players[uid]) {
    // Already in this room (e.g. rejoining): keep score and cards.
    await update(ref(db, `rooms/${code}/players/${uid}`), { name, connected: true });
    return;
  }
  if (room.meta.status !== "lobby") throw new Error("That game has already started. Wait for the next round.");
  if (Object.keys(players).length >= CONFIG.maxPlayers) throw new Error(`That room is full (${CONFIG.maxPlayers} players max).`);
  await set(ref(db, `rooms/${code}/players/${uid}`), newPlayer(name));
}

/** Removes this player. Hands host to someone else, or deletes the room if it's now empty. */
export async function leaveRoom(code: string): Promise<void> {
  const uid = await ensureSignedIn();
  saveRoomCode(null);
  await cancelPresence(code).catch(() => undefined);
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.players?.[uid]) return room;
    const { [uid]: _gone, ...rest } = room.players;
    const ids = Object.keys(rest);
    if (ids.length === 0) return null; // last one out deletes the room
    const hostId = room.meta.hostId === uid ? pickNewHost(rest) : room.meta.hostId;
    return { ...room, players: rest, meta: { ...room.meta, hostId } };
  });
}

/** If the host is offline, the first connected player (by id) takes over. */
export async function claimHostIfNeeded(code: string, room: Room, uid: string): Promise<void> {
  const host = room.players?.[room.meta.hostId];
  if (host?.connected) return;
  if (pickNewHost(room.players) !== uid) return;
  await update(ref(db, `rooms/${code}/meta`), { hostId: uid });
}

/* ---------- lobby ---------- */

export async function setReady(code: string, ready: boolean): Promise<void> {
  const uid = await ensureSignedIn();
  await update(ref(db, `rooms/${code}/players/${uid}`), { ready });
}

/** Host only: send everyone back to the lobby with scores reset. */
export async function resetToLobby(code: string, room: Room): Promise<void> {
  const patch: Record<string, unknown> = { game: null, "meta/status": "lobby" };
  for (const id of Object.keys(room.players)) {
    Object.assign(patch, {
      [`players/${id}/ready`]: false, [`players/${id}/score`]: 0,
      [`players/${id}/topCard`]: -1, [`players/${id}/frozenUntil`]: 0,
    });
  }
  await update(ref(db, `rooms/${code}`), patch);
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  return onValue(ref(db, `rooms/${code}`), (snap) => cb(snap.val()));
}

/* ---------- cleanup ---------- */

/** Deletes rooms older than CONFIG.roomMaxAgeMs. Runs whenever someone creates a room. */
export async function sweepOldRooms(): Promise<number> {
  const cutoff = Date.now() - CONFIG.roomMaxAgeMs;
  const q = query(ref(db, "rooms"), orderByChild("meta/createdAt"), endAt(cutoff));
  const snap = await get(q);
  const codes = Object.keys(snap.val() ?? {});
  await Promise.all(codes.map((c) => remove(ref(db, `rooms/${c}`)).catch(() => undefined)));
  return codes.length;
}
