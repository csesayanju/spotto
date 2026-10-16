import { ref, runTransaction, update } from "firebase/database";
import { MODES } from "../engine";
import { addWins } from "../engine/match";
import { winnersOf } from "../engine/rules";
import { CONFIG } from "../shared/config";
import { generateDeck } from "../shared/deck";
import type { GameLength, GameMode, MatchLength, PlayerId, Room, SymbolId, TapResult } from "../shared/types";
import { db, ensureSignedIn } from "./firebase";
import { serverNow } from "./status";

export const DECK = generateDeck(CONFIG.order);

/** Host only: deal cards and switch the room to playing. */
export async function startGame(code: string, room: Room): Promise<void> {
  const ids = Object.keys(room.players);
  const length = room.meta.length ?? "full";
  const { game, players } = MODES[room.meta.mode].setup(ids, DECK.length, Math.random, CONFIG.lengthCards[length]);
  const startsAt = serverNow() + CONFIG.countdownMs;
  const endsAt = room.meta.mode === "potato" ? startsAt + CONFIG.potatoSeconds[length] * 1000 : null;
  const patch: Record<string, unknown> = { game: { ...game, startsAt, endsAt }, "meta/status": "playing" };
  for (const id of ids) {
    patch[`players/${id}/topCard`] = players[id].topCard;
    patch[`players/${id}/score`] = players[id].score;
    patch[`players/${id}/pileEnd`] = players[id].pileEnd ?? null;
    patch[`players/${id}/pile`] = players[id].pile ?? null;
    patch[`players/${id}/frozenUntil`] = 0;
  }
  await update(ref(db, `rooms/${code}`), patch);
}

/**
 * Tap Arbiter. Runs as a transaction on the whole room so only the first
 * valid tap for a given round can win; later taps see a newer round and
 * come back "stale".
 */
export async function submitTap(code: string, symbol: SymbolId, round: number, target?: PlayerId): Promise<TapResult> {
  const uid = await ensureSignedIn();
  let result: TapResult = { kind: "stale" };

  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.game) return room;
    const rules = MODES[room.game.mode];
    const out = rules.resolveTap({
      deck: DECK, game: room.game, players: room.players, playerId: uid,
      symbol, target, round, now: serverNow(), penaltyMs: CONFIG.penaltyMs,
    });
    result = out.result;
    if (out.result.kind === "stale" || out.result.kind === "frozen") return; // abort, no write
    const finished = rules.isOver(out.game, out.players);
    return { ...room, game: out.game, players: out.players, meta: finished ? finishMeta(room, out.players) : room.meta };
  });

  return result;
}

/** Meta for a finished game: status, plus a room win and a match win for each winner (ties all count). */
function finishMeta(room: Room, players: Room["players"]): Room["meta"] {
  const winners = winnersOf(MODES[room.game!.mode], players);
  return {
    ...room.meta, status: "finished",
    wins: addWins(room.meta.wins, winners),
    matchWins: addWins(room.meta.matchWins, winners),
  };
}

/**
 * Ends a timed game (Hot Potato) once its timer runs out. Every player's app
 * calls this when its clock hits zero; the transaction makes sure it only happens once.
 */
export async function endIfExpired(code: string): Promise<void> {
  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.game?.endsAt || room.meta.status !== "playing" || serverNow() < room.game.endsAt) return; // abort
    return { ...room, meta: finishMeta(room, room.players) };
  });
}

/** Host only, in the lobby: pick the mode for the next game. */
export async function setMode(code: string, mode: GameMode): Promise<void> {
  await update(ref(db, `rooms/${code}/meta`), { mode });
}

/** Host only, in the lobby: pick how many cards the next game uses. */
export async function setLength(code: string, length: GameLength): Promise<void> {
  await update(ref(db, `rooms/${code}/meta`), { length });
}

/** Host only, in the lobby: single game or best of 3/5. Starts the match over. */
export async function setMatch(code: string, match: MatchLength): Promise<void> {
  await update(ref(db, `rooms/${code}/meta`), { match, matchWins: null });
}

/** Host only, mid-match: deal the next game straight away with the same players and settings. */
export const nextGame = startGame;
