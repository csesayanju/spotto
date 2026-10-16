import { useEffect, useRef, useState } from "react";
import { tower } from "../../engine/modes/tower";
import { DECK } from "../../net/game";
import { serverNow, useCountdown } from "../../net/status";
import { CONFIG } from "../../shared/config";
import type { GameState, PlayerState, SymbolId } from "../../shared/types";
import { SymbolCard } from "../components/SymbolCard";
import { buzzWin, buzzWrong } from "../feedback";
import { play, SoundToggle } from "../sound";
import { FrozenBar, Stack, useGoFlash } from "./Game";

const ME = "me";
const BEST_KEY = "spotto:practiceBest";

function readBest(): number | null {
  try { const v = Number(localStorage.getItem(BEST_KEY)); return v > 0 ? v : null; } catch { return null; }
}

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;

interface Run { game: GameState; players: Record<string, PlayerState> }

/** Tower rules for one player, run on the device: match every center card as fast as you can. */
function newRun(): Run {
  const { game, players } = tower.setup([ME], DECK.length, Math.random, CONFIG.practiceCards + 1);
  return {
    game: { ...game, startsAt: serverNow() + CONFIG.countdownMs },
    players: { [ME]: { name: "", ready: true, connected: true, frozenUntil: 0, ...players[ME] } },
  };
}

export function Practice({ onExit }: { onExit: () => void }) {
  const [run, setRun] = useState(newRun);
  const [finishedIn, setFinishedIn] = useState<number | null>(null);
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);
  const { game, players } = run;
  const me = players[ME];

  const startLeft = useCountdown(game.startsAt);
  const waiting = startLeft > 0;
  const go = useGoFlash(game.startsAt, waiting);
  const frozenLeft = useCountdown(me.frozenUntil);
  const frozen = frozenLeft > 0;
  const elapsed = useElapsed(game.startsAt, waiting || finishedIn !== null);
  const secondsLeft = Math.ceil(startLeft / 1000);

  useEffect(() => { if (waiting) play("tick"); }, [waiting, secondsLeft]);
  useEffect(() => { if (go) play("go"); }, [go]);

  function tap(symbol: SymbolId) {
    if (waiting || finishedIn !== null) return;
    const now = serverNow();
    const out = tower.resolveTap({ deck: DECK, game, players, playerId: ME, symbol, round: game.round, now, penaltyMs: CONFIG.penaltyMs });
    if (out.result.kind === "wrong") { buzzWrong(); play("wrong"); }
    if (out.result.kind !== "win") { setRun({ game: out.game, players: out.players }); return; }

    buzzWin();
    setRun({ game: out.game, players: out.players });
    if (!tower.isOver(out.game, out.players)) { play("win"); return; }

    const time = now - game.startsAt!;
    const record = best === null || time < best;
    setFinishedIn(time);
    setNewBest(record);
    play(record ? "victory" : "win");
    if (record) {
      setBest(time);
      try { localStorage.setItem(BEST_KEY, String(time)); } catch { /* best kept for this session only */ }
    }
  }

  function again() {
    setRun(newRun());
    setFinishedIn(null);
    setNewBest(false);
  }

  if (finishedIn !== null) {
    return (
      <main className="screen results practice-done">
        <div className="trophy" aria-hidden>{newBest ? "🏅" : "⏱️"}</div>
        <p className="mode-tag">🎯 Practice</p>
        <h1>{fmt(finishedIn)}</h1>
        <p className="lead">
          {newBest ? "New personal best!" : `Your best is ${fmt(best!)}`}
          <br /><small>{CONFIG.practiceCards} matches · {(finishedIn / CONFIG.practiceCards / 1000).toFixed(2)}s each</small>
        </p>
        <button className="primary" onClick={again}>Go again</button>
        <button onClick={onExit}>Back to home</button>
      </main>
    );
  }

  const done = me.score - 1;
  const centerIdx = game.deckOrder[game.centerPos];
  const myIdx = game.deckOrder[me.topCard];

  return (
    <main className={`screen game practice${waiting ? " waiting" : ""}`}>
      <header className="practice-bar">
        <button className="icon" onClick={onExit} aria-label="Back to home">✕</button>
        <span className="clock" aria-label="Time">{fmt(elapsed)}</span>
        <span className="chip"><b>{done}/{CONFIG.practiceCards}</b></span>
        <SoundToggle />
      </header>
      <SymbolCard key={centerIdx} className="pop" label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <div className="banner" aria-live="polite">
        {frozen ? <FrozenBar left={frozenLeft} /> : best ? `Best ${fmt(best)}` : "Match every card as fast as you can"}
      </div>
      <div className={frozen ? "mine frozen" : "mine"}>
        <Stack cards={me.score} />
        <SymbolCard key={me.topCard} className="pop" label="Your card" card={DECK[myIdx]} seed={myIdx + 1000}
          onTap={tap} disabled={frozen} />
      </div>
      <p className="hint center">Solo practice: only you see this.</p>
      {(waiting || go) && (
        <div className="countdown" aria-live="assertive">
          <span key={waiting ? secondsLeft : "go"}>{waiting ? secondsLeft : "Go!"}</span>
          {waiting && <small>🎯 Practice: {CONFIG.practiceCards} matches against the clock</small>}
        </div>
      )}
    </main>
  );
}

/** Milliseconds since `start` (server time), ticking until `stopped`. */
function useElapsed(start: number | undefined, stopped: boolean): number {
  const [now, setNow] = useState(serverNow);
  const frame = useRef(0);
  useEffect(() => {
    if (stopped) return;
    const tick = () => { setNow(serverNow()); frame.current = requestAnimationFrame(tick); };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [stopped]);
  return Math.max(0, now - (start ?? now));
}
