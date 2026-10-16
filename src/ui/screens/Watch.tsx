import { DECK } from "../../net/game";
import { useCountdown } from "../../net/status";
import type { Room } from "../../shared/types";
import { Avatar, colorFor } from "../components/Avatar";
import { ReactionBar } from "../components/Reactions";
import { SymbolCard } from "../components/SymbolCard";
import { MODE_INFO } from "../modes";
import { BigSymbolsToggle } from "../prefs";
import { SoundToggle } from "../sound";
import { Opponents, Replay, useRoundBanner } from "./Game";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

/** For spectators: a live, read-only view of the game, or the lobby while they wait for a spot. */
export function Watch({ code, room, uid, onLeave }: Props) {
  return room.meta.status === "playing" && room.game
    ? <WatchGame code={code} room={room} uid={uid} onLeave={onLeave} />
    : <WatchLobby code={code} room={room} uid={uid} onLeave={onLeave} />;
}

function WatchGame({ code, room, uid, onLeave }: Props) {
  const game = room.game!;
  const info = MODE_INFO[game.mode];
  const banner = useRoundBanner(room, uid);
  const startLeft = useCountdown(game.startsAt);
  const timeLeft = useCountdown(game.endsAt, 250);
  const centerIdx = game.deckOrder[game.centerPos];
  const status = game.mode === "potato" ? `💣 ${Math.ceil(timeLeft / 1000)}s`
    : game.mode === "well" ? "First to empty their pile wins"
    : `${game.deckOrder.length - game.centerPos} cards left`;

  return (
    <main className={`screen game watch ${game.mode}${startLeft > 0 ? " waiting" : ""}`}>
      <p className="watch-tag">👀 Watching {info.icon} {info.name} <SoundToggle /><BigSymbolsToggle /></p>
      <p className="hint center watch-hint">You'll join the players in the next game.</p>
      <header className="scores">
        {Object.entries(room.players).map(([id, p]) => (
          <span key={id} className={["chip", id === game.lastWinner && "leader", !p.connected && "offline"].filter(Boolean).join(" ")}>
            <i style={{ background: colorFor(id) }} aria-hidden />
            {p.name} <b>{info.score(p.score)}</b>
          </span>
        ))}
      </header>
      {game.mode !== "potato" && (
        <SymbolCard key={centerIdx} className="pop" label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      )}
      <div className={banner ? "banner show" : "banner"} aria-live="polite">
        {banner ? <Replay {...banner} /> : status}
      </div>
      {/* Everyone's top card, so you can play along in your head. */}
      <Opponents room={room} uid={uid} frozen={false} />
      <footer className="game-foot">
        <ReactionBar code={code} role="spectators" />
        <button className="link" onClick={onLeave}>Leave</button>
      </footer>
    </main>
  );
}

function WatchLobby({ code, room, uid, onLeave }: Props) {
  const players = Object.entries(room.players ?? {});
  return (
    <main className="screen lobby">
      <section className="code-box">
        <SoundToggle />
        <p>Room code</p>
        <p className="room-code">{code}</p>
        <p className="hint">The room is full, so you're watching. You'll join as soon as a spot opens.</p>
      </section>
      <h2 className="section-title">Players <span>{players.length} playing</span></h2>
      <ul className="players">
        {players.map(([id, p]) => (
          <li key={id} className={p.ready ? "ready" : ""}>
            <Avatar id={id} name={p.name} />
            <span className="who">{p.name}{id === room.meta.hostId && <span className="crown" aria-label="host"> 👑</span>}</span>
            <span className="state">{p.ready ? "✓ Ready" : "Waiting"}</span>
          </li>
        ))}
      </ul>
      <Spectators room={room} uid={uid} />
      <ReactionBar code={code} role="spectators" />
      <button className="link" onClick={onLeave}>Leave room</button>
    </main>
  );
}

/** "Watching: Ana, Ben" line, shown wherever spectators are present. The host can remove them. */
export function Spectators({ room, uid, onKick }: {
  room: Room; uid: string; onKick?: (id: string, name: string) => void;
}) {
  const list = Object.entries(room.spectators ?? {});
  if (!list.length) return null;
  return (
    <p className="spectators">
      👀 Watching:{" "}
      {list.map(([id, s], i) => (
        <span key={id}>
          {i > 0 && ", "}{id === uid ? "you" : s.name}
          {onKick && id !== uid && (
            <button className="icon kick small" onClick={() => onKick(id, s.name)} aria-label={`Remove ${s.name}`}>✕</button>
          )}
        </span>
      ))}
    </p>
  );
}
