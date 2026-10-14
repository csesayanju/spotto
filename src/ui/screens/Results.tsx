import type { Room } from "../../shared/types";

export function Results({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const ranked = Object.values(room.players).sort((a, b) => b.score - a.score);
  return (
    <main className="screen results">
      <h1>{ranked[0]?.name} wins</h1>
      <ol>{ranked.map((p) => <li key={p.name}>{p.name} <span>{p.score} cards</span></li>)}</ol>
      {/* TODO: "Play again" that resets the room to lobby */}
      <button className="primary" onClick={onLeave}>Back to home</button>
    </main>
  );
}
