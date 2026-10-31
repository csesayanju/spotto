import { useEffect, useRef, useState } from "react";
import { createRoom, joinRoom } from "../../net/rooms";
import { Footer } from "../components/Footer";
import { HowToPlay } from "../components/HowToPlay";
import { useInstall } from "../install";

const NAME_KEY = "spotto:name";

function savedName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

interface Props {
  onEnter: (code: string) => void;
  onPractice: () => void;
  onDaily: () => void;
  onStats: () => void;
  /** Only passed for admins: opens the developer analytics page. */
  onDev?: () => void;
  /** Room code from an invite link. */
  invite?: string | null;
  /** Message to show on arrival, e.g. after being removed from a room. */
  notice?: string | null;
}

export function Home({ onEnter, onPractice, onDaily, onStats, onDev, invite, notice }: Props) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(invite ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);
  const installer = useInstall();

  async function run(action: () => Promise<string>) {
    if (!name.trim()) return setError("Enter your name first.");
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
    setBusy(true); setError(null);
    try { onEnter(await action()); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const join = () => run(async () => { await joinRoom(code, name.trim()); return code; });

  // Invite link: join straight away if we already know this player's name.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (!invite || autoJoined.current || !name.trim()) return;
    autoJoined.current = true;
    join();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="screen home">
      <div className="hero" aria-hidden>
        <span className="mini">🍕</span><span className="mini">🦊</span><span className="mini">🚀</span>
      </div>
      <h1 className="logo">Spotto</h1>
      <p className="tagline">Find the match before your friends do.</p>
      {notice && <p className="error" role="status">{notice}</p>}
      {invite && <p className="invite">You're invited to room <b>{invite}</b>. Enter your name and tap Join.</p>}

      <section className="panel">
        <h2 className="panel-title">Play with friends</h2>
        <label className="field">Your name
          <input value={name} maxLength={16} placeholder="What should friends call you?" autoComplete="nickname"
            enterKeyHint="done" onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="primary" disabled={busy} onClick={() => run(() => createRoom(name.trim()))}>
          {busy ? "Connecting…" : "Create a room"}
        </button>
        <p className="divider"><span>or join with a code</span></p>
        <form className="join" onSubmit={(e) => { e.preventDefault(); if (code.length === 4) join(); }}>
          <input placeholder="Room code" value={code} maxLength={4} aria-label="Room code" autoCapitalize="characters"
            autoComplete="off" enterKeyHint="go" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
          <button type="submit" disabled={busy || code.length !== 4}>Join</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="solo">
        <h2 className="panel-title">Play solo</h2>
        <div className="solo-row">
          <button className="solo-btn daily" onClick={onDaily}><span aria-hidden>📅</span>Daily<small>same cards for all</small></button>
          <button className="solo-btn" onClick={onPractice}><span aria-hidden>🎯</span>Practice<small>beat your best</small></button>
        </div>
      </section>

      <nav className="quick-links">
        <button className="link" onClick={() => setRules(true)}>📖 How to play</button>
        <button className="link" onClick={onStats}>📊 Your stats</button>
      </nav>
      {installer.kind === "prompt" && <button className="secondary" onClick={installer.install}>📲 Install the app</button>}
      {installer.kind === "ios" && <p className="hint center">Install on iPhone: tap Share, then “Add to Home Screen”.</p>}
      {rules && <HowToPlay onClose={() => setRules(false)} />}
      {onDev && <button className="link" onClick={onDev}>📈 Analytics (dev)</button>}
      <Footer />
    </main>
  );
}
