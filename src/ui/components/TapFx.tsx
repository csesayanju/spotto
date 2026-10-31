import { useCallback, useState } from "react";

type Kind = "hit" | "miss";
interface Fx { id: number; x: number; y: number; kind: Kind }

/**
 * Feedback right where the finger landed: a burst ring for a match, a ✕ for a miss.
 * `shaking` is true for a moment after a miss, for shaking the card that was tapped.
 */
export function useTapFx() {
  const [items, setItems] = useState<Fx[]>([]);
  const [shaking, setShaking] = useState(false);

  const show = useCallback((x: number, y: number, kind: Kind) => {
    const fx = { id: Date.now() + Math.random(), x, y, kind };
    setItems((all) => [...all, fx]);
    setTimeout(() => setItems((all) => all.filter((f) => f.id !== fx.id)), 600);
    if (kind === "miss") {
      setShaking(true);
      setTimeout(() => setShaking(false), 340);
    }
  }, []);

  const layer = (
    <div className="tap-fx" aria-hidden>
      {items.map((f) => (
        <span key={f.id} className={`fx ${f.kind}`} style={{ left: f.x, top: f.y }}>{f.kind === "miss" ? "✕" : ""}</span>
      ))}
    </div>
  );

  return { show, shaking, layer };
}

/** Where a tap happened: the pointer position, or the element's centre for keyboard presses. */
export function tapPoint(e: React.MouseEvent): { x: number; y: number } {
  if (e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
