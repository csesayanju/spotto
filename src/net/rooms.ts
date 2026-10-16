import {
  endAt, get, onValue, orderByChild, query, ref, remove, runTransaction, set, update,
} from "firebase/database";
import { pickNewHost } from "../engine/host";
import { CONFIG } from "../shared/config";
import { matchChampions } from "../engine/match";
import { spectatorsToPromote } from "../engine/roster";
import type { PlayerId, PlayerState, Room, RoomMeta } from "../shared/types";
import { track } from "./analytics";
import { serverNow } from "./status";
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

/** Whether this device is playing or watching in a room. */
export type Role = "players" | "spectators";

export function roleIn(room: Room | null, uid: string | null): Role | null {
  if (!room || !uid) return null;
  if (room.players?.[uid]) return "players";
  if (room.spectators?.[uid]) return "spectators";
  return null;
}

/** Database patch moving spectators into the player list while there's room, for the next game. */
function promoteSpectators(room: Room, players: Record<PlayerId, PlayerState>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const id of spectatorsToPromote(Object.keys(players).length, room.spectators, CONFIG.maxPlayers)) {
    const s = room.spectators![id];
    patch[`players/${id}`] = { ...newPlayer(s.name), connected: s.connected };
    patch[`spectators/${id}`] = null;
  }
  return patch;
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
  const [asPlayer, asSpectator] = await Promise.all([
    get(ref(db, `rooms/${code}/players/${uid}`)), get(ref(db, `rooms/${code}/spectators/${uid}`)),
  ]);
  if (asPlayer.exists() || asSpectator.exists()) return code;
  saveRoomCode(null);
  return null;
}

/* ---------- invite links ---------- */

/**
 * Link that opens straight into a room. Inside the Android app the page runs on
 * localhost, so links point at the public site instead.
 */
export function roomLink(code: string): string {
  const base = location.hostname === "localhost"
    ? `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.web.app`
    : location.origin;
  return `${base}/?room=${code}`;
}

let invite: string | null | undefined;

/**
 * Reads ?room=CODE from the address bar, then removes it so a reload doesn't rejoin.
 * Cached, because React may call this more than once (StrictMode).
 */
export function takeInviteCode(): string | null {
  if (invite === undefined) invite = readInvite();
  return invite;
}

function readInvite(): string | null {
  const params = new URLSearchParams(location.search);
  const raw = params.get("room")?.toUpperCase().replace(/[^A-Z]/g, "") ?? "";
  if (!params.has("room")) return null;
  params.delete("room");
  const rest = params.toString();
  history.replaceState(null, "", location.pathname + (rest ? `?${rest}` : "") + location.hash);
  return raw.length === CONFIG.roomCodeLength ? raw : null;
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
    if (res.committed) { track("room_create"); return code; }
  }
  throw new Error("Couldn't create a room. Try again.");
}

export async function joinRoom(code: string, name: string): Promise<void> {
  const uid = await ensureSignedIn();
  const snap = await get(ref(db, `rooms/${code}`));
  const room = snap.val() as Room | null;
  if (!room) throw new Error("No room with that code. Check the letters and try again.");

  const players = room.players ?? {};
  const role = roleIn(room, uid);
  if (role) {
    // Already in this room (e.g. rejoining): keep score and cards.
    await update(ref(db, `rooms/${code}/${role}/${uid}`), { name, connected: true });
    return;
  }
  if (room.meta.status === "lobby" && Object.keys(players).length < CONFIG.maxPlayers) {
    await set(ref(db, `rooms/${code}/players/${uid}`), newPlayer(name));
    track("room_join", { role: "player" });
    return;
  }
  // Game in progress or room full: watch, and join the players at the next lobby.
  if (Object.keys(room.spectators ?? {}).length >= CONFIG.maxSpectators) throw new Error("That room is full right now. Try again later.");
  await set(ref(db, `rooms/${code}/spectators/${uid}`), { name, connected: true });
  track("room_join", { role: "spectator" });
}

/**
 * Removes this player or spectator. Hands host to someone else; if the last
 * player leaves, any spectators take over in a fresh lobby, otherwise the room is deleted.
 */
export async function leaveRoom(code: string, role: Role = "players"): Promise<void> {
  const uid = await ensureSignedIn();
  saveRoomCode(null);
  await cancelPresence(code, role).catch(() => undefined);
  if (role === "spectators") {
    await remove(ref(db, `rooms/${code}/spectators/${uid}`));
    return;
  }
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.players?.[uid]) return room;
    const { [uid]: _gone, ...rest } = room.players;
    if (Object.keys(rest).length > 0) {
      const hostId = room.meta.hostId === uid ? pickNewHost(rest) : room.meta.hostId;
      return { ...room, players: rest, meta: { ...room.meta, hostId } };
    }
    const watchers = Object.entries(room.spectators ?? {});
    if (!watchers.length) return null; // last one out deletes the room
    const players = Object.fromEntries(watchers.map(([id, s]) => [id, { ...newPlayer(s.name), connected: s.connected }]));
    return { meta: { ...room.meta, status: "lobby", hostId: pickNewHost(players), matchWins: null }, players };
  });
}

/** Host only: remove a player or spectator from the room. */
export async function kick(code: string, id: PlayerId): Promise<void> {
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room) return room;
    if (room.spectators?.[id]) {
      const { [id]: _gone, ...spectators } = room.spectators;
      return { ...room, spectators };
    }
    if (!room.players?.[id] || Object.keys(room.players).length < 2) return; // abort: never kick the last player
    const { [id]: _gone, ...players } = room.players;
    return { ...room, players };
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

/**
 * Host only: send everyone back to the lobby with scores reset. Spectators join
 * the players, and a finished match starts over.
 */
export async function resetToLobby(code: string, room: Room): Promise<void> {
  const patch: Record<string, unknown> = { game: null, "meta/status": "lobby", ...promoteSpectators(room, room.players) };
  if (matchChampions(room.meta.matchWins, room.meta.match).length) patch["meta/matchWins"] = null;
  for (const id of Object.keys(room.players)) {
    Object.assign(patch, {
      [`players/${id}/ready`]: false, [`players/${id}/score`]: 0,
      [`players/${id}/topCard`]: -1, [`players/${id}/frozenUntil`]: 0, [`players/${id}/pileEnd`]: null, [`players/${id}/pile`]: null,
    });
  }
  await update(ref(db, `rooms/${code}`), patch);
}

/** Shows an emoji over everyone's screen. */
export async function sendReaction(code: string, role: Role, emoji: string): Promise<void> {
  const uid = await ensureSignedIn();
  await update(ref(db, `rooms/${code}/${role}/${uid}`), { reaction: { emoji, at: serverNow() } });
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
