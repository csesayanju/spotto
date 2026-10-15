import { useEffect, useRef, useState } from "react";
import { SYMBOLS } from "../../assets/symbols";
import { MODES } from "../../engine";
import { DECK, submitTap } from "../../net/game";
import { serverNow, useCountdown } from "../../net/status";
import { CONFIG } from "../../shared/config";
import type { PlayerId, Room, SymbolId } from "../../shared/types";
import { colorFor } from "../components/Avatar";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";
import { MODE_INFO } from "../modes";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Game({ code, room, uid, onLeave }: Props) {
  const game = room.game!;
  const info = MODE_INFO[game.mode];
  const me = room.players[uid];
  const frozenLeft = useCountdown(me.frozenUntil);
  const frozen = frozenLeft > 0;
  const startLeft = useCountdown(game.startsAt);
  const waiting = startLeft > 0;
  const go = useGoFlash(game.startsAt, waiting);
  const banner = useRoundBanner(room, uid);
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function tap(symbol: SymbolId, target?: PlayerId) {
    if (waiting) return;
    const res = await submitTap(code, symbol, game.round, target);
    if (res.kind === "win") buzzWin();
    if (res.kind === "wrong") buzzWrong();
  }

  // Leader chip: best score for this mode (most or fewest cards), only once someone is ahead.
  const scores = Object.values(room.players).map((p) => p.score);
  const best = MODES[game.mode].winsWith === "most" ? Math.max(...scores) : Math.min(...scores);
  const isLeader = (score: number) => score === best && scores.some((s) => s !== best);

  const centerIdx = game.deckOrder[game.centerPos];
  const left = game.deckOrder.length - game.centerPos;
  const status =
    game.mode === "well" ? `${info.score(me.score)} in your pile`
    : game.mode === "gift" ? `${left} in the deck · you hold ${info.score(me.score)}`
    : `${left} cards left`;

  return (
    <main className={`screen game ${game.mode}${waiting ? " waiting" : ""}`}>
      <header className="scores">
        {Object.entries(room.players).map(([id, p]) => (
          <span key={id} className={["chip", id === uid && "me", isLeader(p.score) && "leader", !p.connected && "offline"]
            .filter(Boolean).join(" ")}>
            <i style={{ background: colorFor(id) }} aria-hidden />
            {id === uid ? "You" : p.name} <b>{info.score(p.score)}</b>
          </span>
        ))}
      </header>
      <SymbolCard key={centerIdx} className="pop" label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <p className={banner ? "banner show" : "banner"} aria-live="polite">
        {frozen ? <FrozenBar left={frozenLeft} /> : banner ?? status}
      </p>
      {game.mode === "gift"
        ? <Opponents room={room} uid={uid} frozen={frozen} onTap={tap} />
        : (
          <div className={frozen ? "mine frozen" : "mine"}>
            <SymbolCard label="Your card" card={DECK[game.deckOrder[me.topCard]]}
              seed={game.deckOrder[me.topCard] + 1000} onTap={(s) => tap(s)} disabled={frozen} />
          </div>
        )}
      <button className="link" onClick={() => setConfirmLeave(true)}>Leave game</button>
      {(waiting || go) && (
        <div className="countdown" aria-live="assertive">
          <span key={waiting ? Math.ceil(startLeft / 1000) : "go"}>{waiting ? Math.ceil(startLeft / 1000) : "Go!"}</span>
          {waiting && <small>{info.icon} {info.name}: {info.tagline}</small>}
        </div>
      )}
      {confirmLeave && (
        <ConfirmSheet title="Leave this game?" message="You'll drop out of this round and the room."
          confirmLabel="Leave game" onConfirm={onLeave} onCancel={() => setConfirmLeave(false)} />
      )}
    </main>
  );
}

/** Gift: everyone else's top card. Tap the match on a card to give that player the center card. */
function Opponents({ room, uid, frozen, onTap }: {
  room: Room; uid: string; frozen: boolean; onTap: (symbol: SymbolId, target: PlayerId) => void;
}) {
  const game = room.game!;
  const others = Object.entries(room.players).filter(([id]) => id !== uid);
  return (
    <div className={frozen ? "opponents frozen" : "opponents"} data-count={others.length}>
      {others.map(([id, p]) => {
        const idx = game.deckOrder[p.topCard];
        return (
          <figure key={id} className={id === game.lastTarget ? "opponent got" : "opponent"}>
            <SymbolCard label={`${p.name}'s card`} card={DECK[idx]} seed={idx + 2000}
              onTap={(s) => onTap(s, id)} disabled={frozen} />
            <figcaption>{p.name}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Shrinking bar shown while you're frozen after a wrong tap. */
function FrozenBar({ left }: { left: number }) {
  return (
    <span className="frozen-bar" role="status">
      Wrong symbol, frozen {(left / 1000).toFixed(1)}s
      <span style={{ transform: `scaleX(${left / CONFIG.penaltyMs})` }} />
    </span>
  );
}

/** True for a moment right after the countdown ends, to flash "Go!". */
function useGoFlash(startsAt: number | undefined, waiting: boolean): boolean {
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (waiting || !startsAt) return;
    const since = serverNow() - startsAt;
    if (since > 700) return;
    setGo(true);
    const t = setTimeout(() => setGo(false), 700 - since);
    return () => clearTimeout(t);
  }, [waiting, startsAt]);
  return go;
}

/** Shows who won the last round, and with which symbol, for a moment. */
function useRoundBanner(room: Room, uid: string): string | null {
  const game = room.game!;
  const [text, setText] = useState<string | null>(null);
  const lastRound = useRef(game.round);

  useEffect(() => {
    if (game.round === lastRound.current) return;
    lastRound.current = game.round;
    if (!game.lastWinner || game.lastMatch == null) return;
    const name = (id: PlayerId, you: string) => (id === uid ? you : room.players[id]?.name ?? "Someone");
    const symbol = SYMBOLS[game.lastMatch];
    setText(game.mode === "gift" && game.lastTarget
      ? `${name(game.lastWinner, "You")} gave ${name(game.lastTarget, "you")} a card with ${symbol}`
      : `${name(game.lastWinner, "You")} got it with ${symbol}`);
    const t = setTimeout(() => setText(null), 1400);
    return () => clearTimeout(t);
  }, [game.round, game.lastWinner, game.lastMatch, game.lastTarget, game.mode, room.players, uid]);

  return text;
}
