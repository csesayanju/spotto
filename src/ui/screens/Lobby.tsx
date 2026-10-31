import { useState } from "react";
import { setLength, setMatch, setMode, setPenalty, setTheme, startGame } from "../../net/game";
import { kick, roomLink, setReady } from "../../net/rooms";
import { CONFIG } from "../../shared/config";
import type { GameLength, MatchLength, Room, SymbolTheme } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { HowToPlay } from "../components/HowToPlay";
import { ReactionBar } from "../components/Reactions";
import { LENGTH_INFO, MATCH_INFO, MODE_INFO, MODE_ORDER, THEME_INFO } from "../modes";
import { BigSymbolsToggle } from "../prefs";
import { SoundToggle } from "../sound";
import { Spectators } from "./Watch";

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
  const match = room.meta.match ?? "single";
  const matchWins = room.meta.matchWins ?? {};
  const midMatch = match !== "single" && Object.keys(matchWins).length > 0;
  const penalty = room.meta.penaltyMs ?? CONFIG.penaltyMs;
  const theme = room.meta.theme ?? "classic";
  const [kicking, setKicking] = useState<{ id: string; name: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wins = room.meta.wins ?? {};


  async function share() {
    const text = `Join my Spotto game! Room code: ${code}`;
    const url = roomLink(code);
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* cancelled */ }
  }

  const summary = [
    LENGTH_INFO[length].name,
    MATCH_INFO[match].name === "Single" ? "Single game" : MATCH_INFO[match].name,
    `${THEME_INFO[theme].icon} ${THEME_INFO[theme].name}`,
    `${penalty / 1000}s penalty`,
  ].join(" · ");

  return (
    <main className="screen lobby">
      <section className="code-box">
        <div className="code-row">
          <div>
            <p className="code-label">Room code</p>
            <button className="room-code" onClick={share} aria-label={`Room code ${code}, tap to share`}>{code}</button>
          </div>
          <button className="share-btn" onClick={share}>{shared ? "✓ Copied" : "Invite 🔗"}</button>
        </div>
        <span className="device-toggles"><BigSymbolsToggle /><SoundToggle /></span>
      </section>

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
            {isHost && id !== uid && (
              <button className="icon kick" onClick={() => setKicking({ id, name: p.name })} aria-label={`Remove ${p.name}`}>✕</button>
            )}
          </li>
        ))}
      </ul>
      {players.length < 2 && <p className="hint center">Share the code: you need at least one friend to play.</p>}
      <Spectators room={room} uid={uid} onKick={isHost ? (id, name) => setKicking({ id, name }) : undefined} />

      <fieldset className="modes" disabled={!isHost}>
        <legend>{isHost ? "Mode" : "Mode (the host picks)"}</legend>
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

      <section className={settingsOpen ? "settings open" : "settings"}>
        <button className="settings-summary" onClick={() => isHost && setSettingsOpen((o) => !o)} disabled={!isHost}
          aria-expanded={settingsOpen}>
          <span aria-hidden>⚙️</span>
          <span className="settings-text">{summary}</span>
          {isHost && <span className="settings-edit">{settingsOpen ? "Done" : "Change"}</span>}
        </button>
        {settingsOpen && (
          <div className="settings-body">
            <div className="lengths" role="radiogroup" aria-label="Game length">
              {(Object.keys(LENGTH_INFO) as GameLength[]).map((l) => (
                <button key={l} role="radio" aria-checked={l === length} className={l === length ? "on" : ""}
                  onClick={() => setLength(code, l)}>
                  {LENGTH_INFO[l].name}<small>{CONFIG.lengthCards[l]} cards</small>
                </button>
              ))}
            </div>
            <div className="lengths" role="radiogroup" aria-label="Match length">
              {(Object.keys(MATCH_INFO) as MatchLength[]).map((m) => (
                <button key={m} role="radio" aria-checked={m === match} className={m === match ? "on" : ""}
                  onClick={() => setMatch(code, m)}>
                  {MATCH_INFO[m].name}<small>{MATCH_INFO[m].hint}</small>
                </button>
              ))}
            </div>
            <div className="lengths" role="radiogroup" aria-label="Symbols">
              {(Object.keys(THEME_INFO) as SymbolTheme[]).map((t) => (
                <button key={t} role="radio" aria-checked={t === theme} className={t === theme ? "on" : ""}
                  onClick={() => setTheme(code, t)}>
                  {THEME_INFO[t].icon} {THEME_INFO[t].name}<small>symbols</small>
                </button>
              ))}
            </div>
            <div className="lengths" role="radiogroup" aria-label="Wrong-tap penalty">
              {CONFIG.penaltyChoices.map((ms) => (
                <button key={ms} role="radio" aria-checked={ms === penalty} className={ms === penalty ? "on" : ""}
                  onClick={() => setPenalty(code, ms)}>
                  {ms / 1000}s<small>{ms < CONFIG.penaltyMs ? "gentle" : ms > CONFIG.penaltyMs ? "tough" : "penalty"}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
      {midMatch && (
        <p className="hint center">
          Match so far: {players.filter(([id]) => matchWins[id]).map(([id, p]) => `${p.name} ${matchWins[id]}`).join(" · ")}
        </p>
      )}

      <ReactionBar code={code} role="players" />
      <button className="link" onClick={onLeave}>Leave room</button>

      <div className="action-bar">
        <button className={me.ready ? "" : "ready-btn"} onClick={() => setReady(code, !me.ready)}>
          {me.ready ? "Not ready" : "I'm ready"}
        </button>
        {isHost ? (
          <button className="primary" disabled={!allReady} onClick={() => startGame(code, room)}>
            {players.length < 2 ? "Need 2 players" : allReady ? `Start ${MODE_INFO[mode].name}` : `${readyCount}/${players.length} ready`}
          </button>
        ) : (
          <p className="hint">{allReady ? "Waiting for the host to start…" : "The host starts when everyone's ready"}</p>
        )}
      </div>
      {rules && <HowToPlay initial={mode} onClose={() => setRules(false)} />}
      {kicking && (
        <ConfirmSheet title={`Remove ${kicking.name}?`} message="They'll leave the room. They can join again with the code."
          confirmLabel="Remove" onCancel={() => setKicking(null)}
          onConfirm={() => { kick(code, kicking.id).catch(() => undefined); setKicking(null); }} />
      )}
    </main>
  );
}
