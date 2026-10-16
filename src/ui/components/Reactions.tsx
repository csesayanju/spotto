import { useEffect, useRef, useState } from "react";
import { sendReaction, type Role } from "../../net/rooms";
import { serverNow } from "../../net/status";
import { CONFIG } from "../../shared/config";
import type { Reaction, Room } from "../../shared/types";
import { colorFor } from "./Avatar";

/** Row of emoji buttons. Sends at most one reaction per CONFIG.reactionGapMs. */
export function ReactionBar({ code, role }: { code: string; role: Role }) {
  const last = useRef(0);
  const [cooling, setCooling] = useState(false);

  function send(emoji: string) {
    const now = Date.now();
    if (now - last.current < CONFIG.reactionGapMs) return;
    last.current = now;
    setCooling(true);
    setTimeout(() => setCooling(false), CONFIG.reactionGapMs);
    sendReaction(code, role, emoji).catch(() => undefined);
  }

  return (
    <div className={cooling ? "reaction-bar cooling" : "reaction-bar"} role="group" aria-label="Send a reaction">
      {CONFIG.reactions.map((e) => (
        <button key={e} onClick={() => send(e)} aria-label={`React ${e}`}>{e}</button>
      ))}
    </div>
  );
}

interface Floating { key: string; emoji: string; name: string; color: string; x: number }

/** Floats everyone's reactions up the screen. Mounted once for the whole room. */
export function ReactionLayer({ room, uid }: { room: Room; uid: string }) {
  const [items, setItems] = useState<Floating[]>([]);
  const seen = useRef<Record<string, number>>({});

  useEffect(() => {
    const people: [string, { name: string; reaction?: Reaction }][] = [
      ...Object.entries(room.players ?? {}),
      ...Object.entries(room.spectators ?? {}),
    ];
    const fresh: Floating[] = [];
    for (const [id, p] of people) {
      const r = p.reaction;
      if (!r || seen.current[id] === r.at) continue;
      const first = seen.current[id] === undefined;
      seen.current[id] = r.at;
      // Skip reactions that were already old when we arrived (e.g. after a reload).
      if (first && serverNow() - r.at > 3000) continue;
      fresh.push({ key: `${id}-${r.at}`, emoji: r.emoji, name: id === uid ? "You" : p.name, color: colorFor(id), x: 12 + Math.random() * 76 });
    }
    if (!fresh.length) return;
    setItems((cur) => [...cur, ...fresh]);
    const keys = new Set(fresh.map((f) => f.key));
    setTimeout(() => setItems((cur) => cur.filter((f) => !keys.has(f.key))), 2600);
  }, [room.players, room.spectators, uid]);

  return (
    <div className="reaction-layer" aria-live="polite">
      {items.map((f) => (
        <span key={f.key} className="float" style={{ left: `${f.x}%` }}>
          <b>{f.emoji}</b>
          <small style={{ background: f.color }}>{f.name}</small>
        </span>
      ))}
    </div>
  );
}
