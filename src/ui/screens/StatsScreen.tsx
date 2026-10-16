import { dayKey } from "../../engine/daily";
import { serverNow } from "../../net/status";
import { Footer } from "../components/Footer";
import { MODE_INFO, MODE_ORDER } from "../modes";
import { practiceBest, readStats, streakToday } from "../stats";
import { fmt } from "./SoloRun";

/** Your numbers on this device: games and wins per mode, Practice and Daily bests, streaks. */
export function StatsScreen({ onExit }: { onExit: () => void }) {
  const s = readStats();
  const streak = streakToday(dayKey(serverNow()));
  const best = practiceBest();
  const totals = MODE_ORDER.reduce((t, m) => ({ played: t.played + (s.modes[m]?.played ?? 0), won: t.won + (s.modes[m]?.won ?? 0) }), { played: 0, won: 0 });

  return (
    <main className="screen stats">
      <header className="daily-head">
        <button className="icon" onClick={onExit} aria-label="Back to home">✕</button>
        <h1>📊 Your stats</h1>
        <span />
      </header>

      <div className="stat-tiles">
        <Tile big={String(totals.played)} label="games played" />
        <Tile big={String(totals.won)} label="games won" />
        <Tile big={streak ? `🔥 ${streak}` : "0"} label="daily streak" />
        <Tile big={best ? fmt(best) : "–"} label="best practice" />
      </div>

      <h2 className="section-title">By mode</h2>
      <ul className="players stat-modes">
        {MODE_ORDER.map((m) => {
          const r = s.modes[m] ?? { played: 0, won: 0 };
          return (
            <li key={m}>
              <span className="mode-icon" aria-hidden>{MODE_INFO[m].icon}</span>
              <span className="who">{MODE_INFO[m].name}</span>
              <span className="state">{r.won} / {r.played} won{r.played ? ` · ${Math.round((r.won / r.played) * 100)}%` : ""}</span>
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">Daily challenge</h2>
      <p className="hint">
        {s.dailyRuns ? `${s.dailyRuns} official runs · best ${fmt(s.dailyBest!)} · longest streak ${s.bestStreak} days` : "No official daily runs yet."}
      </p>
      <p className="hint center">Stats live on this phone only.</p>
      <Footer />
    </main>
  );
}

function Tile({ big, label }: { big: string; label: string }) {
  return <div className="tile"><b>{big}</b><small>{label}</small></div>;
}
