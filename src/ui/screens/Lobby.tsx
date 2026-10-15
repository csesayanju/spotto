import { useEffect, useState } from "react";
import { setLength, setMode, startGame } from "../../net/game";
import { claimHostIfNeeded, roomLink, setReady } from "../../net/rooms";
import { CONFIG } from "../../shared/config";
import type { GameLength, Room } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { HowToPlay } from "../components/HowToPlay";
import { LENGTH_INFO, MODE_INFO, MODE_ORDER } from "../modes";
import { SoundToggle } from "../sound";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Lobby({ code, room, uid, onLeave }: Props) {
  const players = Object.entries(room.players ?? {});
  const me = room.players[uid];
  const isHost = room.meta.hostId === uid;
  const allReady = players.length >= 2 && players.every(([, p]) => p.ready);
  const mode = room.meta.mode;
  const [rules, setRules] = useState(false);
  const [shared, setShared] = useState(false);
  const readyCount = players.filter(([, p]) => p.ready).length;
  const length = room.meta.length ?? "full";
  const wins = room.meta.wins ?? {};

  // If the host drops, someone else takes over so the game can still start.
  useEffect(() => { claimHostIfNeeded(code, room, uid).catch(() => undefined); }, [code, room, uid]);

  async function share() {
    const text = `Join my Spotto game! Room code: ${code}`;
    const url = roomLink(code);
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* cancelled */ }
  }

  return (
    <main className="screen lobby">
      <section className="code-box">
        <SoundToggle />
        <p>Room code</p>
        <button className="room-code" onClick={share} aria-label={`Room code ${code}, tap to share`}>{code}</button>
        <p className="hint">{shared ? "Link copied! Send it to your friends." : "Tap the code to share an invite link"}</p>
      </section>

      <fieldset className="modes" disabled={!isHost}>
        <legend>{isHost ? "Pick a mode" : "Mode (the host picks)"}</legend>
        {MODE_ORDER.map((m) => (
          <label key={m} className={m === mode ? "mode on" : "mode"}>
            <input type="radio" name="mode" checked={m === mode} onChange={() => setMode(code, m)} />
            <span className="mode-icon" aria-hidden>{MODE_INFO[m].icon}</span>
            <strong>{MODE_INFO[m].name}</strong>
          </label>
        ))}
      </fieldset>
      <p className="mode-desc">
        {MODE_INFO[mode].tagline}{" "}
        <button className="link inline" onClick={() => setRules(true)}>How to play</button>
      </p>

      <div className="lengths" role="radiogroup" aria-label="Game length">
        {(Object.keys(LENGTH_INFO) as GameLength[]).map((l) => (
          <button key={l} role="radio" aria-checked={l === length} className={l === length ? "on" : ""}
            disabled={!isHost} onClick={() => setLength(code, l)}>
            {LENGTH_INFO[l].name}<small>{CONFIG.lengthCards[l]} cards</small>
          </button>
        ))}
      </div>

      <h2 className="section-title">
        Players <span>{players.length}/{CONFIG.maxPlayers} · {readyCount} ready</span>
      </h2>
      <ul className="players">
        {players.map(([id, p]) => (
          <li key={id} className={[p.ready && "ready", !p.connected && "offline"].filter(Boolean).join(" ")}>
            <Avatar id={id} name={p.name} />
            <span className="who">
              {p.name}{id === uid && <small> (you)</small>}
              {id === room.meta.hostId && <span className="crown" title="Host" aria-label="host"> 👑</span>}
              {!p.connected && <small className="off"> offline</small>}
            </span>
            {wins[id] ? <span className="wins" title="Games won in this room">🏆 {wins[id]}</span> : null}
            <span className="state">{p.ready ? "✓ Ready" : "Waiting"}</span>
          </li>
        ))}
      </ul>
      <button className={me.ready ? "" : "ready-btn"} onClick={() => setReady(code, !me.ready)}>
        {me.ready ? "Not ready" : "I'm ready"}
      </button>
      {!isHost && <p className="hint center">The host starts the game when everyone is ready.</p>}
      {isHost && (
        <button className="primary" disabled={!allReady} onClick={() => startGame(code, room)}>
          {players.length < 2 ? "Waiting for players" : allReady ? `Start ${MODE_INFO[mode].name}` : "Waiting for everyone to be ready"}
        </button>
      )}
      <button className="link" onClick={onLeave}>Leave room</button>
      {rules && <HowToPlay initial={mode} onClose={() => setRules(false)} />}
    </main>
  );
}
