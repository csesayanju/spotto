import { useEffect } from "react";
import { MODES } from "../../engine";
import { matchChampions, matchTarget } from "../../engine/match";
import { nextGame } from "../../net/game";
import { resetToLobby } from "../../net/rooms";
import type { Room } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { ReactionBar } from "../components/Reactions";
import { roleIn } from "../../net/rooms";
import { MATCH_INFO, MODE_INFO } from "../modes";
import { play } from "../sound";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Results({ code, room, uid, onLeave }: Props) {
  const mode = room.game?.mode ?? room.meta.mode;
  const info = MODE_INFO[mode];
  const sign = MODES[mode].winsWith === "most" ? -1 : 1;
  const ranked = Object.entries(room.players).sort(([, a], [, b]) => sign * (a.score - b.score));
  const isHost = room.meta.hostId === uid;
  const top = ranked[0]?.[1].score;
  const winners = ranked.filter(([, p]) => p.score === top).map(([id, p]) => (id === uid ? "You" : p.name));
  // Same score, same place: 10, 10, 7 ranks as 1st, 1st, 3rd.
  const place = (score: number) => ranked.findIndex(([, p]) => p.score === score);
  const medal = (i: number) => ["🥇", "🥈", "🥉"][i] ?? `${i + 1}`;
  const iWon = ranked.some(([id, p]) => id === uid && p.score === top);
  const wins = room.meta.wins ?? {};
  const match = room.meta.match ?? "single";
  const matchWins = room.meta.matchWins ?? {};
  const champions = match === "single" ? [] : matchChampions(matchWins, match);
  const inMatch = match !== "single";
  const matchOver = inMatch && champions.length > 0;
  const name = (id: string) => (id === uid ? "You" : room.players[id]?.name ?? "Someone");
  const role = roleIn(room, uid) ?? "players";
  useEffect(() => { play(iWon ? "victory" : "defeat"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = winners.length > 1 ? `Tie: ${winners.join(" & ")}`
    : winners[0] === "You" ? "You win!" : `${winners[0]} wins`;

  return (
    <main className="screen results">
      <div className={matchOver ? "trophy big" : "trophy"} aria-hidden>{matchOver ? "👑" : "🏆"}</div>
      <p className="mode-tag">{info.icon} {info.name}{inMatch && ` · ${MATCH_INFO[match].name}`}</p>
      {matchOver
        ? <h1>{champions.length > 1 ? `${champions.map(name).join(" & ")} share the match!` : `${name(champions[0])} ${champions[0] === uid ? "win" : "wins"} the match!`}</h1>
        : <h1>{title}</h1>}
      {inMatch && (
        <p className="match-line">
          {matchOver ? "Final score: " : `Match, first to ${matchTarget(match)}: `}
          {Object.keys(room.players).filter((id) => matchWins[id]).sort((a, b) => matchWins[b] - matchWins[a])
            .map((id) => `${name(id)} ${matchWins[id]}`).join(" · ")}
        </p>
      )}
      <ol className="ranking">
        {ranked.map(([id, p]) => {
          const i = place(p.score);
          return (
            <li key={id} className={[i === 0 && "first", id === uid && "me"].filter(Boolean).join(" ")}>
              <span className="medal">{medal(i)}</span>
              <Avatar id={id} name={p.name} size={32} />
              <span className="who">{p.name}{id === uid && <small> (you)</small>}</span>
              <span className="pts">{info.score(p.score)}</span>
              {wins[id] ? <span className="wins" title="Games won in this room">🏆 {wins[id]}</span> : null}
            </li>
          );
        })}
      </ol>
      {isHost && inMatch && !matchOver && <button className="primary" onClick={() => nextGame(code, room)}>Next game</button>}
      {isHost && (
        <button className={inMatch && !matchOver ? "" : "primary"} onClick={() => resetToLobby(code, room)}>
          {matchOver ? "New match" : inMatch ? "Back to lobby" : "Play again"}
        </button>
      )}
      {!isHost && <p className="hint center">{inMatch && !matchOver ? "Waiting for the host to start the next game…" : "Waiting for the host to start another game…"}</p>}
      <ReactionBar code={code} role={role} />
      <button onClick={onLeave}>Leave room</button>
    </main>
  );
}
