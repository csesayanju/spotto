import { useEffect, useState } from "react";
import { DECK, submitTap } from "../../net/game";
import type { Room, SymbolId } from "../../shared/types";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";

export function Game({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const game = room.game!;
  const me = room.players[uid];
  const [now, setNow] = useState(Date.now());
  const frozen = me.frozenUntil > now;

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
          <span key={id} className={id === game.lastWinner ? "leader" : ""}>{p.name} {p.score}</span>
        ))}
      </header>
      <SymbolCard label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <p className="pile">{left} cards left</p>
      <div className={frozen ? "mine frozen" : "mine"}>
        <SymbolCard label="Your card" card={DECK[myIdx]} seed={myIdx + 1000} onTap={tap} disabled={frozen} />
      </div>
    </main>
  );
}
