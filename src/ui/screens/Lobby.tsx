import { useEffect } from "react";
import { startGame } from "../../net/game";
import { claimHostIfNeeded, setReady } from "../../net/rooms";
import type { Room } from "../../shared/types";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Lobby({ code, room, uid, onLeave }: Props) {
  const players = Object.entries(room.players ?? {});
  const me = room.players[uid];
  const isHost = room.meta.hostId === uid;
  const allReady = players.length >= 2 && players.every(([, p]) => p.ready);

  // If the host drops, someone else takes over so the game can still start.
  useEffect(() => { claimHostIfNeeded(code, room, uid).catch(() => undefined); }, [code, room, uid]);

  async function share() {
    const text = `Join my Spotto game! Room code: ${code}\n${location.origin}`;
    try { await navigator.share?.({ text }) ?? navigator.clipboard.writeText(text); } catch { /* cancelled */ }
  }

  return (
    <main className="screen lobby">
      <p>Share this code with your friends</p>
      <button className="room-code" onClick={share} aria-label={`Room code ${code}, tap to share`}>{code}</button>
      <ul className="players">
        {players.map(([id, p]) => (
          <li key={id} className={p.ready ? "ready" : ""}>
            {p.name}{id === room.meta.hostId && " (host)"}{!p.connected && " – offline"}
            <span>{p.ready ? "Ready" : "Waiting"}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => setReady(code, !me.ready)}>{me.ready ? "Not ready" : "I'm ready"}</button>
      {isHost && (
        <button className="primary" disabled={!allReady} onClick={() => startGame(code, room)}>
          {players.length < 2 ? "Waiting for players" : allReady ? "Start game" : "Waiting for everyone to be ready"}
        </button>
      )}
      <button className="link" onClick={onLeave}>Leave room</button>
    </main>
  );
}
