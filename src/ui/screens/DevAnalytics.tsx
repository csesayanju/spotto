import { useEffect, useState } from "react";
import { summarize, type Summary, type Tally } from "../../engine/analytics";
import { dayKey } from "../../engine/daily";
import { lastDays, loadEvents, pruneEvents, useIsAdmin, useLiveRooms } from "../../net/devstats";
import { serverNow } from "../../net/status";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { MODE_INFO, THEME_INFO } from "../modes";

const RANGES = [7, 14, 30] as const;
const KEEP_DAYS = 30;
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID;

/** Developer-only dashboard. Readable only by ids listed under admins/ in the database. */
export function DevAnalytics({ uid, onExit }: { uid: string; onExit: () => void }) {
  const admin = useIsAdmin(uid);

  return (
    <main className="screen dev">
      <header className="daily-head">
        <button className="icon" onClick={onExit} aria-label="Back to home">✕</button>
        <h1>📈 Analytics</h1>
        <span className="hint">dev</span>
      </header>
      {admin === null && <p className="hint center">Checking access…</p>}
      {admin === false && <NotAdmin uid={uid} />}
      {admin && <Dashboard />}
    </main>
  );
}

function NotAdmin({ uid }: { uid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="dev-card">
      <p className="lead">This page is for the developer.</p>
      <p className="hint">
        To unlock it on this device, open the Firebase console → Realtime Database → Data,
        and add <code>admins</code> → <code>{uid}</code> with the value <code>true</code> (boolean).
      </p>
      <button onClick={() => navigator.clipboard?.writeText(uid).then(() => setCopied(true))}>
        {copied ? "Device id copied" : "Copy this device's id"}
      </button>
    </section>
  );
}

function Dashboard() {
  const today = dayKey(serverNow());
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);
  const live = useLiveRooms();

  useEffect(() => {
    const days = lastDays(today, range);
    setData(null);
    loadEvents(days).then((byDay) => setData(summarize(byDay, days)), (e) => setError(String(e?.message ?? e)));
  }, [today, range]);

  return (
    <>
      <div className="lengths" role="radiogroup" aria-label="Time range">
        {RANGES.map((r) => (
          <button key={r} role="radio" aria-checked={r === range} className={r === range ? "on" : ""} onClick={() => setRange(r)}>
            {r} days<small>to {today.slice(5)}</small>
          </button>
        ))}
      </div>

      <section className="dev-card">
        <h2 className="section-title">Live now</h2>
        <div className="stat-tiles four">
          <Tile big={live ? live.rooms : "–"} label="rooms" />
          <Tile big={live ? live.playing : "–"} label="mid-game" />
          <Tile big={live ? live.online : "–"} label="players online" />
          <Tile big={live ? live.watching : "–"} label="watching" />
        </div>
      </section>

      {error && <p className="error">Couldn't load analytics: {error}</p>}
      {!data && !error && <p className="hint center">Loading {range} days…</p>}
      {data && <Report s={data} range={range} />}

      <section className="dev-card">
        <h2 className="section-title">Location & traffic</h2>
        <p className="hint">
          Countries, cities and visits come from Google Analytics (Spotto never stores IP addresses).
        </p>
        <a className="button-link" href={`https://console.firebase.google.com/project/${PROJECT}/analytics`} target="_blank" rel="noreferrer">
          Open Google Analytics ↗
        </a>
      </section>

      <button className="link" onClick={() => setPruning(true)}>Delete analytics older than {KEEP_DAYS} days</button>
      {pruning && (
        <ConfirmSheet title="Delete old analytics?" message={`Events older than ${KEEP_DAYS} days are removed for good. This keeps the database small.`}
          confirmLabel="Delete" onCancel={() => setPruning(false)}
          onConfirm={() => { pruneEvents(today, KEEP_DAYS).catch(() => undefined); setPruning(false); }} />
      )}
    </>
  );
}

function Report({ s, range }: { s: Summary; range: number }) {
  const mins = (ms: number | null) => (ms === null ? "–" : `${Math.round(ms / 6000) / 10} min`);
  if (!s.users) return <p className="hint center">No events in the last {range} days yet.</p>;
  return (
    <>
      <section className="dev-card">
        <h2 className="section-title">Last {range} days</h2>
        <div className="stat-tiles four">
          <Tile big={s.users} label="players" />
          <Tile big={s.gamesStarted} label="games" />
          <Tile big={s.avgPlayers === null ? "–" : s.avgPlayers.toFixed(1)} label="players / game" />
          <Tile big={mins(s.avgGameMs)} label="avg game" />
          <Tile big={s.opens} label="app opens" />
          <Tile big={s.roomsCreated} label="rooms made" />
          <Tile big={s.practiceRuns + s.dailyRuns} label="solo runs" />
          <Tile big={s.installs} label="installs" />
        </div>
      </section>

      <section className="dev-card">
        <h2 className="section-title">Players per day</h2>
        <Columns values={s.days.map((d) => d.users)} labels={s.days.map((d) => d.day.slice(5))} unit="players" />
      </section>

      <section className="dev-card">
        <h2 className="section-title">Busiest hours <span>opens + games, your local time</span></h2>
        <Columns values={s.hours} labels={s.hours.map((_, h) => `${h}:00`)} unit="events" sparseLabels />
      </section>

      <section className="dev-card two-col">
        <Bars title="Games by mode" rows={s.modes.map(([k, n]) => [MODE_INFO[k as keyof typeof MODE_INFO]?.name ?? k, n])} />
        <Bars title="Symbol themes" rows={s.themes.map(([k, n]) => [THEME_INFO[k as keyof typeof THEME_INFO]?.name ?? k, n])} />
        <Bars title="How they play" rows={s.platforms.map(([k, n]) => [({ web: "Website", pwa: "Installed web app", apk: "Android APK" } as Record<string, string>)[k] ?? k, n])} />
        <Bars title="Devices" rows={s.devices.map(([k, n]) => [k === "phone" ? "Phone / tablet" : k === "desktop" ? "Computer" : k, n])} />
        <Bars title="App versions" rows={s.versions} />
      </section>
    </>
  );
}

function Tile({ big, label }: { big: string | number; label: string }) {
  return <div className="tile"><b>{big}</b><small>{label}</small></div>;
}

/** Single-series column chart with a hover/focus tooltip per bar and a table fallback. */
function Columns({ values, labels, unit, sparseLabels }: { values: number[]; labels: string[]; unit: string; sparseLabels?: boolean }) {
  const max = Math.max(1, ...values);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure className="columns">
      <div className="columns-plot" role="img" aria-label={`${unit} chart`} onMouseLeave={() => setHover(null)}>
        {values.map((v, i) => (
          <button key={labels[i]} className="col" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            aria-label={`${labels[i]}: ${v} ${unit}`}>
            <span style={{ height: `${(v / max) * 100}%` }} className={v ? "" : "zero"} />
          </button>
        ))}
        {hover !== null && (
          <span className="col-tip" style={{ left: `${((hover + 0.5) / values.length) * 100}%` }}>
            <b>{values[hover]}</b> {unit}<small>{labels[hover]}</small>
          </span>
        )}
      </div>
      <div className="columns-axis" aria-hidden>
        {labels.map((l, i) => (
          <span key={l}>{!sparseLabels || i % 6 === 0 ? l : ""}</span>
        ))}
      </div>
      <details className="as-table">
        <summary>Show as table</summary>
        <table><tbody>{values.map((v, i) => <tr key={labels[i]}><th>{labels[i]}</th><td>{v}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

/** Labelled horizontal bars: label, bar, value. One hue; identity is in the text. */
function Bars({ title, rows }: { title: string; rows: Tally }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div className="bars">
      <h3>{title}</h3>
      {rows.length === 0 && <p className="hint">No data yet.</p>}
      {rows.map(([label, n]) => (
        <div key={label} className="bar-row" title={`${label}: ${n}`}>
          <span className="bar-label">{label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(n / max) * 100}%` }} /></span>
          <span className="bar-value">{n}</span>
        </div>
      ))}
    </div>
  );
}
