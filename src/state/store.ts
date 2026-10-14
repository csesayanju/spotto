import { useEffect, useState } from "react";
import { subscribeRoom } from "../net/rooms";
import type { Room } from "../shared/types";

/** Client State Store: a live mirror of rooms/{code}. */
export function useRoom(code: string | null): Room | null {
  const [room, setRoom] = useState<Room | null>(null);
  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, setRoom);
  }, [code]);
  return room;
}
