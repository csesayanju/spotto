import { resetToLobby } from "../../net/rooms";
import type { Room } from "../../shared/types";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Results({ code, room, uid, onLeave }: Props) {
  const ranked = Object.entries(room.players).sort(([, a], [, b]) => b.score - a.score);
  const isHost = room.meta.hostId === uid;
  const top = ranked[0]?.[1].score;
  const winners = ranked.filter(([, p]) => p.score === top).map(([, p]) => p.name);

  return (
    <main className="screen results">
      <h1>{winners.length > 1 ? `Tie: ${winners.join(" & ")}` : `${winners[0]} wins`}</h1>
      <ol>{ranked.map(([id, p]) => <li key={id}>{p.name} <span>{p.score} cards</span></li>)}</ol>
      {isHost
        ? <button className="primary" onClick={() => resetToLobby(code, room)}>Play again</button>
        : <p>Waiting for the host to start another game…</p>}
      <button onClick={onLeave}>Leave room</button>
    </main>
  );
}
