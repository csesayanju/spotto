import { useState } from "react";
import { createRoom, joinRoom } from "../../net/rooms";
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

  return (
    <main className="screen home">
      <h1 className="logo">Spotto</h1>
      <p className="tagline">Find the match before your friends do.</p>
      <label>Your name
        <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
      </label>
      <button className="primary" disabled={busy} onClick={() => run(() => createRoom(name.trim()))}>
        Create room
      </button>
      <div className="join">
        <input placeholder="Room code" value={code} maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button disabled={busy || code.length !== 4}
          onClick={() => run(async () => { await joinRoom(code, name.trim()); return code; })}>
          Join
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="link" onClick={() => setRules(true)}>How to play</button>
      {rules && <HowToPlay onClose={() => setRules(false)} />}
      <p className="version">v{__APP_VERSION__}</p>
    </main>
  );
}
