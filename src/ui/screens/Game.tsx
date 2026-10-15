import { useEffect, useRef, useState } from "react";
import { SYMBOLS } from "../../assets/symbols";
import { MODES } from "../../engine";
import { DECK, endIfExpired, submitTap } from "../../net/game";
import { serverNow, useCountdown } from "../../net/status";
import { CONFIG } from "../../shared/config";
import type { PlayerId, Room, SymbolId } from "../../shared/types";
import { colorFor } from "../components/Avatar";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";
import { MODE_INFO } from "../modes";
import { play, SoundToggle } from "../sound";

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
  const secondsLeft = Math.ceil(startLeft / 1000);
  const timeLeft = useCountdown(game.endsAt, 250);
  const timed = game.endsAt !== undefined && game.endsAt !== null;

  // Hot Potato: when the timer runs out, end the game (whichever phone gets there first).
  useEffect(() => {
    if (timed && !waiting && timeLeft === 0) endIfExpired(code).catch(() => undefined);
  }, [timed, waiting, timeLeft, code]);

  // Countdown beeps: one per second, then a rising "go".
  useEffect(() => { if (waiting) play("tick"); }, [waiting, secondsLeft]);
  useEffect(() => { if (go) play("go"); }, [go]);

  async function tap(symbol: SymbolId, target?: PlayerId) {
    if (waiting) return;
    const res = await submitTap(code, symbol, game.round, target);
    if (res.kind === "win") buzzWin();
    if (res.kind === "wrong") { buzzWrong(); play("wrong"); }
  }

  // Leader chip: best score for this mode (most or fewest cards), only once someone is ahead.
  const scores = Object.values(room.players).map((p) => p.score);
  const best = MODES[game.mode].winsWith === "most" ? Math.max(...scores) : Math.min(...scores);
  const isLeader = (score: number) => score === best && scores.some((s) => s !== best);

  const centerIdx = game.deckOrder[game.centerPos];
  const left = game.deckOrder.length - game.centerPos;
  const timer = `💣 ${Math.ceil(timeLeft / 1000)}s`;
  const status =
    game.mode === "well" ? `${info.score(me.score)} in your pile`
    : game.mode === "gift" ? `${left} in the deck · you hold ${info.score(me.score)}`
    : game.mode === "potato" ? <span className={timeLeft < 10_000 ? "fuse hot" : "fuse"}>{timer} · you hold {info.score(me.score)}</span>
    : `${left} cards left`;
  const myCard = me.topCard >= 0 && (
    <div className={frozen ? "mine frozen" : "mine"}>
      <Stack cards={me.score} />
      <SymbolCard key={me.topCard} className="pop" label="Your card" card={DECK[game.deckOrder[me.topCard]]}
        seed={game.deckOrder[me.topCard] + 1000} onTap={(s) => tap(s)}
        disabled={frozen || game.mode === "potato"} />
    </div>
  );

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
        <SoundToggle />
      </header>
      {game.mode === "potato"
        ? <Opponents room={room} uid={uid} frozen={frozen} onTap={tap} />
        : <SymbolCard key={centerIdx} className="pop" label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />}
      <div className={banner ? "banner show" : "banner"} aria-live="polite">
        {frozen ? <FrozenBar left={frozenLeft} />
          : banner ? <Replay {...banner} />
          : status}
      </div>
      {game.mode === "gift" ? <Opponents room={room} uid={uid} frozen={frozen} onTap={tap} /> : myCard}
      <button className="link" onClick={() => setConfirmLeave(true)}>Leave game</button>
      {(waiting || go) && (
        <div className="countdown" aria-live="assertive">
          <span key={waiting ? secondsLeft : "go"}>{waiting ? secondsLeft : "Go!"}</span>
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

/** Gift and Hot Potato: everyone else's top card. Tap the match on someone's card to send them a card. */
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
            {p.topCard >= 0
              ? <SymbolCard key={idx} className="pop" label={`${p.name}'s card`} card={DECK[idx]} seed={idx + 2000}
                  onTap={(s) => onTap(s, id)} disabled={frozen} />
              : <div className="card empty" aria-label={`${p.name} has no cards`} />}
            <figcaption>{p.name}{game.mode === "potato" && <small> · {p.score}</small>}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

/** Shrinking bar shown while you're frozen after a wrong tap. */
export function FrozenBar({ left }: { left: number }) {
  return (
    <span className="frozen-bar" role="status">
      Wrong symbol, frozen {(left / 1000).toFixed(1)}s
      <span style={{ transform: `scaleX(${left / CONFIG.penaltyMs})` }} />
    </span>
  );
}

/** True for a moment right after the countdown ends, to flash "Go!". */
export function useGoFlash(startsAt: number | undefined, waiting: boolean): boolean {
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

/** Card edges under your card, so you can see your pile grow (Tower) or shrink (Well). */
export function Stack({ cards }: { cards: number }) {
  const layers = Math.max(0, Math.min(3, cards - 1));
  return (
    <>
      {Array.from({ length: layers }, (_, i) => (
        <span key={i} className="stack-layer" style={{ "--i": layers - i } as React.CSSProperties} aria-hidden />
      ))}
      {cards > 1 && <span className="stack-count" aria-label={`${cards} cards in your pile`}>×{cards}</span>}
    </>
  );
}

interface Banner { text: string; pair: [number, number] | null; match: SymbolId }

/** Last round's two cards side by side, with the shared symbol ringed. */
function Replay({ text, pair, match }: Banner) {
  return (
    <span className="replay">
      {pair && (
        <span className="replay-cards" aria-hidden>
          <SymbolCard label="" card={DECK[pair[0]]} seed={pair[0] + 3000} highlight={match} disabled />
          <SymbolCard label="" card={DECK[pair[1]]} seed={pair[1] + 4000} highlight={match} disabled />
        </span>
      )}
      <span>{text}</span>
    </span>
  );
}

/** Who won the last round, with which symbol, shown for a moment. Also plays the round sound. */
function useRoundBanner(room: Room, uid: string): Banner | null {
  const game = room.game!;
  const [banner, setBanner] = useState<Banner | null>(null);
  const lastRound = useRef(game.round);

  useEffect(() => {
    if (game.round === lastRound.current) return;
    lastRound.current = game.round;
    if (!game.lastWinner || game.lastMatch == null) return;
    const name = (id: PlayerId, you: string) => (id === uid ? you : room.players[id]?.name ?? "Someone");
    const symbol = SYMBOLS[game.lastMatch];
    setBanner({
      text: game.mode === "potato" && game.lastTarget
        ? `${name(game.lastWinner, "You")} passed ${name(game.lastTarget, "you")} a card with ${symbol}`
        : game.mode === "gift" && game.lastTarget
        ? `${name(game.lastWinner, "You")} gave ${name(game.lastTarget, "you")} a card with ${symbol}`
        : `${name(game.lastWinner, "You")} got it with ${symbol}`,
      pair: game.lastPair ?? null,
      match: game.lastMatch,
    });
    play(game.lastWinner === uid ? "win" : "lose");
  }, [game.round, game.lastWinner, game.lastMatch, game.lastTarget, game.lastPair, game.mode, room.players, uid]);

  // Its own effect, so other room updates during the 1.6 s don't cancel the timer.
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 1600);
    return () => clearTimeout(t);
  }, [banner]);

  return banner;
}
