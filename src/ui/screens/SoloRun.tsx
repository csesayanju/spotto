import { useEffect, useRef, useState } from "react";
import { tower } from "../../engine/modes/tower";
import { DECK } from "../../net/game";
import { serverNow, useCountdown } from "../../net/status";
import { CONFIG } from "../../shared/config";
import type { GameState, PlayerState, SymbolId } from "../../shared/types";
import { SymbolCard } from "../components/SymbolCard";
import { tapPoint, useTapFx } from "../components/TapFx";
import { buzzWin, buzzWrong } from "../feedback";
import { BigSymbolsToggle } from "../prefs";
import { play, SoundToggle } from "../sound";
import { FrozenBar, Stack, useGoFlash } from "./Game";

const ME = "me";

/** 1:02.3 */
export const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;

interface Run { game: GameState; players: Record<string, PlayerState> }

function newRun(matches: number, rand: () => number): Run {
  const { game, players } = tower.setup([ME], DECK.length, rand, matches + 1);
  return {
    game: { ...game, startsAt: serverNow() + CONFIG.countdownMs },
    players: { [ME]: { name: "", ready: true, connected: true, frozenUntil: 0, ...players[ME] } },
  };
}

interface Props {
  /** Shown in the countdown, e.g. "🎯 Practice". */
  label: string;
  matches: number;
  /** Random source for the deal; seeded for the daily challenge. */
  rand: () => number;
  /** Line under your card while playing. */
  hint: string;
  onFinish: (ms: number) => void;
  onExit: () => void;
}

/**
 * One player against the clock, on the device: Tower rules, match every center
 * card as fast as you can. Used by Practice and the Daily challenge.
 */
export function SoloRun({ label, matches, rand, hint, onFinish, onExit }: Props) {
  const [run, setRun] = useState(() => newRun(matches, rand));
  const [done, setDone] = useState(false);
  const { game, players } = run;
  const me = players[ME];

  const startLeft = useCountdown(game.startsAt);
  const waiting = startLeft > 0;
  const go = useGoFlash(game.startsAt, waiting);
  const frozenLeft = useCountdown(me.frozenUntil);
  const frozen = frozenLeft > 0;
  const elapsed = useElapsed(game.startsAt, waiting || done);
  const secondsLeft = Math.ceil(startLeft / 1000);

  useEffect(() => { if (waiting) play("tick"); }, [waiting, secondsLeft]);
  useEffect(() => { if (go) play("go"); }, [go]);

  const fx = useTapFx();

  function tap(symbol: SymbolId, e: React.MouseEvent) {
    if (waiting || done) return;
    const at = tapPoint(e);
    const now = serverNow();
    const out = tower.resolveTap({ deck: DECK, game, players, playerId: ME, symbol, round: game.round, now, penaltyMs: CONFIG.penaltyMs });
    setRun({ game: out.game, players: out.players });
    if (out.result.kind === "wrong") { buzzWrong(); play("wrong"); fx.show(at.x, at.y, "miss"); }
    if (out.result.kind !== "win") return;
    buzzWin();
    fx.show(at.x, at.y, "hit");
    if (!tower.isOver(out.game, out.players)) { play("win"); return; }
    setDone(true);
    onFinish(now - game.startsAt!);
  }

  const centerIdx = game.deckOrder[Math.min(game.centerPos, game.deckOrder.length - 1)];
  const myIdx = game.deckOrder[me.topCard];

  return (
    <main className={`screen game practice${waiting ? " waiting" : ""}`}>
      <header className="practice-bar">
        <button className="icon" onClick={onExit} aria-label="Back to home">✕</button>
        <span className="clock" aria-label="Time">{fmt(elapsed)}</span>
        <span className="chip"><b>{me.score - 1}/{matches}</b></span>
        <BigSymbolsToggle />
        <SoundToggle />
      </header>
      <SymbolCard key={centerIdx} className="pop" label="Center card" card={DECK[centerIdx]} seed={centerIdx + 1} disabled />
      <div className="banner" aria-live="polite">
        {frozen ? <FrozenBar left={frozenLeft} /> : hint}
      </div>
      <div className={["mine", frozen && "frozen", fx.shaking && "shake"].filter(Boolean).join(" ")}>
        <Stack cards={me.score} />
        <SymbolCard key={me.topCard} className="pop" label="Your card" card={DECK[myIdx]} seed={myIdx + 1000}
          onTap={tap} disabled={frozen} />
      </div>
      <span />
      {fx.layer}
      {(waiting || go) && (
        <div className="countdown" aria-live="assertive">
          <span key={waiting ? secondsLeft : "go"}>{waiting ? secondsLeft : "Go!"}</span>
          {waiting && <small>{label}: {matches} matches against the clock</small>}
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
