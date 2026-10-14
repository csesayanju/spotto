import { useEffect, useRef, useState } from "react";
import { SYMBOLS } from "../../assets/symbols";
import { DECK, submitTap } from "../../net/game";
import type { Room, SymbolId } from "../../shared/types";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";

interface Props { code: string; room: Room; uid: string; onLeave: () => void }

export function Game({ code, room, uid, onLeave }: Props) {
  const game = room.game!;
  const me = room.players[uid];
  const [now, setNow] = useState(Date.now());
  const frozen = me.frozenUntil > now;
  const banner = useRoundBanner(room, uid);

  useEffect(() => {
    if (!frozen) return;
    const t = setTimeout(() => setNow(Date.now()), me.frozenUntil - Date.now());
    return () => clearTimeout(t);
  }, [frozen, me.frozenUntil]);

  async function tap(symbol: SymbolId) {
    const res = await submitTap(code, symbol, game.round);
    if (res.kind === "win") buzzWin();
    if (res.kind === "wrong") { buzzWrong(); setNow(Date.now()); }
  }

  const centerIdx = game.deckOrder[game.centerPos];
  const myIdx = game.deckOrder[me.topCard];
  const left = game.deckOrder.length - game.centerPos;

  return (
    <main className="screen game">
      <header className="scores">
        {Object.entries(room.players).map(([id, p]) => (
          <span key={id} className={id === game.lastWinner ? "leader" : ""}>
            {p.name} {p.score}{!p.connected && " ⚠"}
          </span>
        ))}
      </header>
      <SymbolCard label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <p className={banner ? "banner show" : "banner"} aria-live="polite">
        {banner ?? `${left} cards left`}
      </p>
      <div className={frozen ? "mine frozen" : "mine"}>
        <SymbolCard label="Your card" card={DECK[myIdx]} seed={myIdx + 1000} onTap={tap} disabled={frozen} />
      </div>
      <button className="link" onClick={() => confirm("Leave this game?") && onLeave()}>Leave game</button>
    </main>
  );
}

/** Shows "Name got it with 🍕" for a moment after each round. */
function useRoundBanner(room: Room, uid: string): string | null {
  const game = room.game!;
  const [text, setText] = useState<string | null>(null);
  const lastRound = useRef(game.round);

  useEffect(() => {
    if (game.round === lastRound.current) return;
    lastRound.current = game.round;
    if (!game.lastWinner || game.lastMatch == null) return;
    const who = game.lastWinner === uid ? "You" : room.players[game.lastWinner]?.name ?? "Someone";
    setText(`${who} got it with ${SYMBOLS[game.lastMatch]}`);
    const t = setTimeout(() => setText(null), 1400);
    return () => clearTimeout(t);
  }, [game.round, game.lastWinner, game.lastMatch, room.players, uid]);

  return text;
}
