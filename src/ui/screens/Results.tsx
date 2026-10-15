import { useEffect } from "react";
import { MODES } from "../../engine";
import { resetToLobby } from "../../net/rooms";
import type { Room } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { MODE_INFO } from "../modes";
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
  useEffect(() => { play(iWon ? "victory" : "defeat"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = winners.length > 1 ? `Tie: ${winners.join(" & ")}`
    : winners[0] === "You" ? "You win!" : `${winners[0]} wins`;

  return (
    <main className="screen results">
      <div className="trophy" aria-hidden>🏆</div>
      <p className="mode-tag">{info.icon} {info.name}</p>
      <h1>{title}</h1>
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
      {isHost
        ? <button className="primary" onClick={() => resetToLobby(code, room)}>Play again</button>
        : <p className="hint center">Waiting for the host to start another game…</p>}
      <button onClick={onLeave}>Leave room</button>
    </main>
  );
}
