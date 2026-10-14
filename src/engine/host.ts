import type { PlayerId, PlayerState } from "../shared/types";

/** Picks the next host: first connected player by id, else first player. Pure, so it's testable. */
export function pickNewHost(players: Record<PlayerId, PlayerState>): PlayerId {
  const ids = Object.keys(players).sort();
  return ids.find((id) => players[id].connected) ?? ids[0];
}
