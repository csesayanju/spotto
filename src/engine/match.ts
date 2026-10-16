import type { MatchLength, PlayerId } from "../shared/types";

/** Games needed to win a match: 1, 2 (best of 3) or 3 (best of 5). */
export function matchTarget(match: MatchLength = "single"): number {
  return match === "bo5" ? 3 : match === "bo3" ? 2 : 1;
}

/** Players who have reached the target, i.e. won the match. Empty while it's still going. */
export function matchChampions(matchWins: Record<PlayerId, number> = {}, match: MatchLength = "single"): PlayerId[] {
  const target = matchTarget(match);
  return Object.keys(matchWins).filter((id) => matchWins[id] >= target);
}

/** Adds a game win for each winner (ties all score). */
export function addWins(wins: Record<PlayerId, number> = {}, winners: PlayerId[]): Record<PlayerId, number> {
  const next = { ...wins };
  for (const id of winners) next[id] = (next[id] ?? 0) + 1;
  return next;
}
