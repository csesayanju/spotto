import { useEffect, useState } from "react";
import { ensureSignedIn } from "./net/firebase";
import { trackPresence } from "./net/presence";
import { useRoom } from "./state/store";
import { Game } from "./ui/screens/Game";
import { Home } from "./ui/screens/Home";
import { Lobby } from "./ui/screens/Lobby";
import { Results } from "./ui/screens/Results";

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const room = useRoom(code);

  useEffect(() => { ensureSignedIn().then(setUid); }, []);
  useEffect(() => {
    if (!code) return;
    let stop: (() => void) | undefined;
    trackPresence(code).then((s) => (stop = s));
    return () => stop?.();
  }, [code]);

  if (!uid) return <main className="screen"><p>Connecting…</p></main>;
  if (!code || !room) return <Home onEnter={setCode} />;
  if (room.meta.status === "lobby") return <Lobby code={code} room={room} uid={uid} />;
  if (room.meta.status === "playing") return <Game code={code} room={room} uid={uid} />;
  return <Results room={room} onLeave={() => setCode(null)} />;
}
