import type { PlayerId, Spectator } from "../shared/types";

/**
 * Which spectators move into the game: in id order, until the player list is full.
 * Pure, so it's testable; rooms.ts turns the result into a database patch.
 */
export function spectatorsToPromote(
  playerCount: number,
  spectators: Record<PlayerId, Spectator> = {},
  maxPlayers: number,
): PlayerId[] {
  const free = Math.max(0, maxPlayers - playerCount);
  return Object.keys(spectators).sort().slice(0, free);
}
