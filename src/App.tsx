import { useEffect, useRef, useState } from "react";
import { ensureSignedIn } from "./net/firebase";
import { trackPresence } from "./net/presence";
import { leaveRoom, restoreRoom, roleIn, saveRoomCode, takeInviteCode } from "./net/rooms";
import { useOnline } from "./net/status";
import { useRoom } from "./state/store";
import { ReactionLayer } from "./ui/components/Reactions";
import { Game } from "./ui/screens/Game";
import { Home } from "./ui/screens/Home";
import { Lobby } from "./ui/screens/Lobby";
import { Practice } from "./ui/screens/Practice";
import { Watch } from "./ui/screens/Watch";
import { Results } from "./ui/screens/Results";

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [invite] = useState(takeInviteCode);
  const [practice, setPractice] = useState(false);
  const { room, loaded } = useRoom(code);
  const stopPresence = useRef<(() => void) | null>(null);
  const online = useOnline();
  const role = roleIn(room, uid);

  // Sign in, then rejoin the last room if this device was in one.
  useEffect(() => {
    ensureSignedIn()
      .then(async (id) => { setUid(id); setCode(await restoreRoom()); })
      .catch((e) => setAuthError(e.code ?? e.message))
      .finally(() => setRestoring(false));
  }, []);

  // Presence follows the role, so a spectator who joins the players is tracked in the right place.
  useEffect(() => {
    if (!code || !role) return;
    saveRoomCode(code);
    let cancelled = false;
    trackPresence(code, role).then((stop) => {
      if (cancelled) stop();
      else stopPresence.current = stop;
    });
    return () => {
      cancelled = true;
      stopPresence.current?.();
      stopPresence.current = null;
    };
  }, [code, role]);

  // Room deleted, or we were removed from it: go home.
  useEffect(() => {
    if (code && loaded && uid && !role) {
      saveRoomCode(null);
      setCode(null);
    }
  }, [code, loaded, role, uid]);

  async function leave() {
    stopPresence.current?.(); // stop presence first so it can't re-add us
    stopPresence.current = null;
    if (code) await leaveRoom(code, role ?? "players");
    setCode(null);
  }

  return (
    <>
      {!online && <div className="offline-banner" role="status">You're offline. Reconnecting…</div>}
      {screen()}
      {code && room && uid && role && <ReactionLayer room={room} uid={uid} />}
    </>
  );

  function screen() {
    if (authError) return <main className="screen"><p className="error">Sign-in failed: {authError}</p></main>;
    if (!uid || restoring) return <main className="screen"><p>Connecting…</p></main>;
    if (!code && practice) return <Practice onExit={() => setPractice(false)} />;
    if (!code) return <Home onEnter={setCode} onPractice={() => setPractice(true)} invite={invite} />;
    if (!room || !role) return <main className="screen"><p>Joining room…</p></main>;
    if (role === "spectators" && room.meta.status !== "finished") {
      return <Watch code={code} room={room} uid={uid} onLeave={leave} />;
    }
    if (room.meta.status === "lobby") return <Lobby code={code} room={room} uid={uid} onLeave={leave} />;
    if (room.meta.status === "playing" && room.game) return <Game code={code} room={room} uid={uid} onLeave={leave} />;
    return <Results code={code} room={room} uid={uid} onLeave={leave} />;
  }
}
