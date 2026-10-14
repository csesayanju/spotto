import { startGame } from "../../net/game";
import { setReady } from "../../net/rooms";
import type { Room } from "../../shared/types";

export function Lobby({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const players = Object.entries(room.players ?? {});
  const me = room.players?.[uid];
  const isHost = room.meta.hostId === uid;
  const allReady = players.length >= 2 && players.every(([, p]) => p.ready);

  return (
    <main className="screen lobby">
      <p>Share this code with your friends</p>
      <h1 className="room-code">{code}</h1>
      <ul className="players">
        {players.map(([id, p]) => (
          <li key={id} className={p.ready ? "ready" : ""}>
            {p.name}{id === room.meta.hostId && " (host)"}{!p.connected && " – offline"}
            <span>{p.ready ? "Ready" : "Waiting"}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => setReady(code, !me?.ready)}>{me?.ready ? "Not ready" : "I'm ready"}</button>
      {isHost && (
        <button className="primary" disabled={!allReady} onClick={() => startGame(code, room)}>
          Start game
        </button>
      )}
    </main>
  );
}
