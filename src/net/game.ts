import { ref, runTransaction, update } from "firebase/database";
import { MODES } from "../engine";
import { CONFIG } from "../shared/config";
import { generateDeck } from "../shared/deck";
import type { Room, SymbolId, TapResult } from "../shared/types";
import { db, ensureSignedIn } from "./firebase";

export const DECK = generateDeck(CONFIG.order);

/** Host only: deal cards and switch the room to playing. */
export async function startGame(code: string, room: Room): Promise<void> {
  const ids = Object.keys(room.players);
  const { game, players } = MODES[room.meta.mode].setup(ids, DECK.length);
  const patch: Record<string, unknown> = { game, "meta/status": "playing" };
  for (const id of ids) {
    patch[`players/${id}/topCard`] = players[id].topCard;
    patch[`players/${id}/score`] = players[id].score;
  }
  await update(ref(db, `rooms/${code}`), patch);
}

/**
 * Tap Arbiter. Runs as a transaction on the whole room so only the first
 * valid tap for a given round can win; later taps see a newer round and
 * come back "stale".
 */
export async function submitTap(code: string, symbol: SymbolId, round: number): Promise<TapResult> {
  const uid = await ensureSignedIn();
  let result: TapResult = { kind: "stale" };

  await runTransaction(ref(db, `rooms/${code}`), (room: Room | null) => {
    if (!room?.game) return room;
    const rules = MODES[room.game.mode];
    const out = rules.resolveTap({
      deck: DECK, game: room.game, players: room.players, playerId: uid,
      symbol, round, now: Date.now(), penaltyMs: CONFIG.penaltyMs,
    });
    result = out.result;
    if (out.result.kind === "stale" || out.result.kind === "frozen") return; // abort, no write
    const finished = rules.isOver(out.game);
    return { ...room, game: out.game, players: out.players,
      meta: { ...room.meta, status: finished ? "finished" : room.meta.status } };
  });

  return result;
}
