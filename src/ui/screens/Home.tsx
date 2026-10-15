import { useState } from "react";
import { createRoom, joinRoom } from "../../net/rooms";
import { Footer } from "../components/Footer";
import { HowToPlay } from "../components/HowToPlay";

const NAME_KEY = "spotto:name";

function savedName(): string {
  try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; }
}

export function Home({ onEnter }: { onEnter: (code: string) => void }) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState(false);

  async function run(action: () => Promise<string>) {
    if (!name.trim()) return setError("Enter your name first.");
    try { localStorage.setItem(NAME_KEY, name.trim()); } catch { /* ignore */ }
    setBusy(true); setError(null);
    try { onEnter(await action()); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const join = () => run(async () => { await joinRoom(code, name.trim()); return code; });

  return (
    <main className="screen home">
      <div className="hero" aria-hidden>
        <span className="mini">🍕</span><span className="mini">🦊</span><span className="mini">🚀</span>
      </div>
      <h1 className="logo">Spotto</h1>
      <p className="tagline">Find the match before your friends do.</p>

      <label className="field">Your name
        <input value={name} maxLength={16} placeholder="What should friends call you?" autoComplete="nickname"
          enterKeyHint="done" onChange={(e) => setName(e.target.value)} />
      </label>
      <button className="primary" disabled={busy} onClick={() => run(() => createRoom(name.trim()))}>
        {busy ? "Connecting…" : "Create a room"}
      </button>

      <p className="divider"><span>or join a friend</span></p>
      <form className="join" onSubmit={(e) => { e.preventDefault(); if (code.length === 4) join(); }}>
        <input placeholder="Room code" value={code} maxLength={4} aria-label="Room code" autoCapitalize="characters"
          autoComplete="off" enterKeyHint="go" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
        <button type="submit" disabled={busy || code.length !== 4}>Join</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

      <button className="secondary" onClick={() => setRules(true)}>📖 How to play</button>
      {rules && <HowToPlay onClose={() => setRules(false)} />}
      <Footer />
    </main>
  );
}
