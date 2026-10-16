import { useMemo, useState } from "react";
import { dailyRandom, dayKey, msUntilNextDay, ranking, type DailyEntry } from "../../engine/daily";
import { finishDaily, startDaily, useDailyBoard } from "../../net/daily";
import { serverNow, useCountdown } from "../../net/status";
import { CONFIG } from "../../shared/config";
import { Avatar } from "../components/Avatar";
import { Footer } from "../components/Footer";
import { track } from "../../net/analytics";
import { play } from "../sound";
import { recordDaily, streakToday } from "../stats";
import { fmt, SoloRun } from "./SoloRun";

const NAME_KEY = "spotto:name";
const savedName = () => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } };

type Claim = "official" | "played" | "offline";
type Stage = { kind: "intro" } | { kind: "playing"; claim: Claim } | { kind: "done"; ms: number; claim: Claim; saved: boolean };

const HINT: Record<Claim, string> = {
  official: "Official run: this one counts",
  played: "Just for fun: today's official run is done",
  offline: "Just for fun: couldn't reach the leaderboard",
};

/** The daily challenge: the same 15 matches for everyone today, one official try, shared leaderboard. */
export function Daily({ uid, onExit }: { uid: string; onExit: () => void }) {
  const [day] = useState(() => dayKey(serverNow()));
  const board = useDailyBoard(day);
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [name, setName] = useState(savedName);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mine = board?.[uid];
  const label = new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

  async function begin() {
    const n = name.trim();
    if (!n) return;
    try { localStorage.setItem(NAME_KEY, n); } catch { /* ignore */ }
    setBusy(true);
    const claim: Claim = mine ? "played" : await startDaily(day, n);
    setBusy(false);
    setAttempt((a) => a + 1);
    setStage({ kind: "playing", claim });
  }

  async function finish(ms: number) {
    const claim = stage.kind === "playing" ? stage.claim : "played";
    const saved = claim === "official" ? await finishDaily(day, ms) : false;
    if (saved) recordDaily(day, ms);
    track("daily_done", { ms: Math.round(ms), official: saved });
    play(saved ? "victory" : "win");
    setStage({ kind: "done", ms, claim, saved });
  }

  if (stage.kind === "playing") {
    return (
      <SoloRun key={attempt} label="📅 Daily" matches={CONFIG.dailyCards} rand={dailyRandom(day)}
        hint={HINT[stage.claim]}
        onFinish={finish} onExit={onExit} />
    );
  }

  const ranked = board ? ranking(board) : [];
  const myRank = ranked.findIndex(([id]) => id === uid) + 1;

  if (stage.kind === "done") {
    return (
      <main className="screen results daily">
        <div className="trophy" aria-hidden>{stage.saved && myRank === 1 ? "🥇" : "📅"}</div>
        <p className="mode-tag">📅 Daily challenge · {label}</p>
        <h1>{fmt(stage.ms)}</h1>
        <p className="lead center">
          {stage.saved ? `${myRank ? `You're #${myRank} of ${ranked.length} today` : "Saved!"} · 🔥 ${streakToday(day)}-day streak`
            : stage.claim === "official" ? "Couldn't save this time (connection or clock problem). Sorry!"
            : stage.claim === "offline" ? "Just for fun: the leaderboard couldn't be reached, so this one didn't count."
            : "Just for fun. Your official time is on the board."}
        </p>
        <Board ranked={ranked} uid={uid} />
        <button className="primary" onClick={() => setStage({ kind: "intro" })}>Done</button>
        <button onClick={onExit}>Back to home</button>
      </main>
    );
  }

  return (
    <main className="screen daily">
      <header className="daily-head">
        <button className="icon" onClick={onExit} aria-label="Back to home">✕</button>
        <h1>📅 Daily challenge</h1>
        <span className="hint">{label}</span>
      </header>
      <p className="lead center">
        Same {CONFIG.dailyCards} matches for everyone today. Your first run counts. <NextIn />
      </p>
      {streakToday(day) > 0 && <p className="streak">🔥 {streakToday(day)}-day streak{mine ? "" : ". Play today to keep it!"}</p>}
      {board === null ? <p className="hint center">Loading today's board…</p> : <Board ranked={ranked} uid={uid} />}
      <MyStatus mine={mine} rank={myRank} />
      {!mine && (
        <label className="field">Your name on the board
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="What should friends call you?" />
        </label>
      )}
      <button className="primary" disabled={busy || board === null || (!mine && !name.trim())} onClick={begin}>
        {mine ? "Play again just for fun" : busy ? "Starting…" : "Start today's challenge"}
      </button>
      <Footer />
    </main>
  );
}

function MyStatus({ mine, rank }: { mine?: DailyEntry; rank: number }) {
  if (!mine) return null;
  if (typeof mine.ms !== "number") return <p className="hint center">You started today's run but didn't finish it, so it doesn't count. Try again tomorrow!</p>;
  return <p className="hint center">Your official time: <b>{fmt(mine.ms)}</b>{rank ? ` · #${rank}` : ""}</p>;
}

/** Top 10, plus your own row if you're further down. */
function Board({ ranked, uid }: { ranked: [string, DailyEntry & { ms: number }][]; uid: string }) {
  const rows = useMemo(() => {
    const top = ranked.slice(0, 10).map((r, i) => [i, ...r] as const);
    const me = ranked.findIndex(([id]) => id === uid);
    return me >= 10 ? [...top, [me, ...ranked[me]] as const] : top;
  }, [ranked, uid]);

  if (!ranked.length) return <p className="hint center">No times yet today. Be the first!</p>;
  return (
    <ol className="ranking daily-board">
      {rows.map(([i, id, e]) => (
        <li key={id} className={[i === 0 && "first", id === uid && "me"].filter(Boolean).join(" ")}>
          <span className="medal">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
          <Avatar id={id} name={e.name} size={28} />
          <span className="who">{e.name}{id === uid && <small> (you)</small>}</span>
          <span className="pts">{fmt(e.ms)}</span>
        </li>
      ))}
    </ol>
  );
}

/** "New challenge in 5h 12m". */
function NextIn() {
  const [target] = useState(() => serverNow() + msUntilNextDay(serverNow()));
  const left = useCountdown(target, 30_000);
  const h = Math.floor(left / 3600_000);
  const m = Math.floor((left % 3600_000) / 60_000);
  return <span className="next-in">New one in {h}h {m}m.</span>;
}
