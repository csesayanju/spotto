import { MODES } from "../../engine";
import { resetToLobby } from "../../net/rooms";
import type { Room } from "../../shared/types";
import { MODE_INFO } from "../modes";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Results({ code, room, uid, onLeave }: Props) {
  const mode = room.game?.mode ?? room.meta.mode;
  const info = MODE_INFO[mode];
  const sign = MODES[mode].winsWith === "most" ? -1 : 1;
  const ranked = Object.entries(room.players).sort(([, a], [, b]) => sign * (a.score - b.score));
  const isHost = room.meta.hostId === uid;
  const top = ranked[0]?.[1].score;
  const winners = ranked.filter(([, p]) => p.score === top).map(([id, p]) => (id === uid ? "You" : p.name));
  const title = winners.length > 1 ? `Tie: ${winners.join(" & ")}`
    : winners[0] === "You" ? "You win!" : `${winners[0]} wins`;

  return (
    <main className="screen results">
      <p className="mode-tag">{info.icon} {info.name}</p>
      <h1>{title}</h1>
      <ol>{ranked.map(([id, p]) => <li key={id}>{p.name} <span>{info.score(p.score)}</span></li>)}</ol>
      {isHost
        ? <button className="primary" onClick={() => resetToLobby(code, room)}>Play again</button>
        : <p>Waiting for the host to start another game…</p>}
      <button onClick={onLeave}>Leave room</button>
    </main>
  );
}
