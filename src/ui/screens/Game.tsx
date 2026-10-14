import { useEffect, useRef, useState } from "react";
import { SYMBOLS } from "../../assets/symbols";
import { DECK, submitTap } from "../../net/game";
import type { PlayerId, Room, SymbolId } from "../../shared/types";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";
import { MODE_INFO } from "../modes";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Game({ code, room, uid, onLeave }: Props) {
  const game = room.game!;
  const info = MODE_INFO[game.mode];
  const me = room.players[uid];
  const [now, setNow] = useState(Date.now());
  const frozen = me.frozenUntil > now;
  const banner = useRoundBanner(room, uid);

  useEffect(() => {
    if (!frozen) return;
    const t = setTimeout(() => setNow(Date.now()), me.frozenUntil - Date.now());
    return () => clearTimeout(t);
  }, [frozen, me.frozenUntil]);

  async function tap(symbol: SymbolId, target?: PlayerId) {
    const res = await submitTap(code, symbol, game.round, target);
    if (res.kind === "win") buzzWin();
    if (res.kind === "wrong") { buzzWrong(); setNow(Date.now()); }
  }

  const centerIdx = game.deckOrder[game.centerPos];
  const left = game.deckOrder.length - game.centerPos;
  const status =
    game.mode === "well" ? `${info.score(me.score)} in your pile`
    : game.mode === "gift" ? `${left} in the deck · you hold ${info.score(me.score)}`
    : `${left} cards left`;

  return (
    <main className={`screen game ${game.mode}`}>
      <header className="scores">
        {Object.entries(room.players).map(([id, p]) => (
          <span key={id} className={id === game.lastWinner ? "leader" : ""}>
            {id === uid ? "You" : p.name} {info.score(p.score)}{!p.connected && " ⚠"}
          </span>
        ))}
      </header>
      <SymbolCard label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <p className={banner ? "banner show" : "banner"} aria-live="polite">{banner ?? status}</p>
      {game.mode === "gift"
        ? <Opponents room={room} uid={uid} frozen={frozen} onTap={tap} />
        : (
          <div className={frozen ? "mine frozen" : "mine"}>
            <SymbolCard label="Your card" card={DECK[game.deckOrder[me.topCard]]}
              seed={game.deckOrder[me.topCard] + 1000} onTap={(s) => tap(s)} disabled={frozen} />
          </div>
        )}
      <button className="link" onClick={() => confirm("Leave this game?") && onLeave()}>Leave game</button>
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
