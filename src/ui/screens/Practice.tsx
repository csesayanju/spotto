import { useState } from "react";
import { CONFIG } from "../../shared/config";
import { track } from "../../net/analytics";
import { play } from "../sound";
import { fmt, SoloRun } from "./SoloRun";

const BEST_KEY = "spotto:practiceBest";

function readBest(): number | null {
  try { const v = Number(localStorage.getItem(BEST_KEY)); return v > 0 ? v : null; } catch { return null; }
}

/** Solo practice: 20 matches against the clock, best time kept on the device. */
export function Practice({ onExit }: { onExit: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [finishedIn, setFinishedIn] = useState<number | null>(null);
  const [best, setBest] = useState(readBest);
  const [newBest, setNewBest] = useState(false);

  function finish(time: number) {
    track("practice_done", { ms: Math.round(time) });
    const record = best === null || time < best;
    setFinishedIn(time);
    setNewBest(record);
    play(record ? "victory" : "win");
    if (record) {
      setBest(time);
      try { localStorage.setItem(BEST_KEY, String(time)); } catch { /* best kept for this session only */ }
    }
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
        <button className="primary" onClick={() => { setFinishedIn(null); setNewBest(false); setAttempt((n) => n + 1); }}>Go again</button>
        <button onClick={onExit}>Back to home</button>
      </main>
    );
  }

  return (
    <SoloRun key={attempt} label="🎯 Practice" matches={CONFIG.practiceCards} rand={Math.random}
      hint={best ? `Best ${fmt(best)}` : "Match every card as fast as you can"} onFinish={finish} onExit={onExit} />
  );
}
