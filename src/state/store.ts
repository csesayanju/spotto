import { useEffect, useState } from "react";
import { subscribeRoom } from "../net/rooms";
import type { Room } from "../shared/types";

/** Client State Store: a live mirror of rooms/{code}. `loaded` is false until the first snapshot. */
export function useRoom(code: string | null): { room: Room | null; loaded: boolean } {
  const [state, setState] = useState<{ room: Room | null; loaded: boolean }>({ room: null, loaded: false });
  useEffect(() => {
    setState({ room: null, loaded: false });
    if (!code) return;
    return subscribeRoom(code, (room) => setState({ room, loaded: true }));
  }, [code]);
  return state;
}
