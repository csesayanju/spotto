import { ref, runTransaction, update } from "firebase/database";
import { MODES } from "../engine";
import { winnersOf } from "../engine/rules";
import { CONFIG } from "../shared/config";
import { generateDeck } from "../shared/deck";
import type { GameLength, GameMode, PlayerId, Room, SymbolId, TapResult } from "../shared/types";
import { db, ensureSignedIn } from "./firebase";
import { serverNow } from "./status";

export const DECK = generateDeck(CONFIG.order);

/** Host only: deal cards and switch the room to playing. */
export async function startGame(code: string, room: Room): Promise<void> {
  const ids = Object.keys(room.players);
  const count = CONFIG.lengthCards[room.meta.length ?? "full"];
  const { game, players } = MODES[room.meta.mode].setup(ids, DECK.length, Math.random, count);
  const patch: Record<string, unknown> = {
    game: { ...game, startsAt: serverNow() + CONFIG.countdownMs }, "meta/status": "playing",
  };
  for (const id of ids) {
    patch[`players/${id}/topCard`] = players[id].topCard;
    patch[`players/${id}/score`] = players[id].score;
    patch[`players/${id}/pileEnd`] = players[id].pileEnd ?? null;
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
    const wins = { ...room.meta.wins };
    if (finished) for (const id of winnersOf(rules, out.players)) wins[id] = (wins[id] ?? 0) + 1;
    return { ...room, game: out.game, players: out.players,
      meta: { ...room.meta, wins, status: finished ? "finished" : room.meta.status } };
  });

  return result;
}

/** Host only, in the lobby: pick the mode for the next game. */
export async function setMode(code: string, mode: GameMode): Promise<void> {
  await update(ref(db, `rooms/${code}/meta`), { mode });
}

/** Host only, in the lobby: pick how many cards the next game uses. */
export async function setLength(code: string, length: GameLength): Promise<void> {
  await update(ref(db, `rooms/${code}/meta`), { length });
}
