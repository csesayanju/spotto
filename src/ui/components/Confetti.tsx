import { useMemo } from "react";

const COLORS = ["var(--sun)", "var(--coral)", "#3fa7d6", "#4cb944", "#9b5de5", "var(--card)"];

/** A burst of falling paper, drawn with CSS. Bigger for bigger wins. Hidden when motion is reduced. */
export function Confetti({ pieces = 40 }: { pieces?: number }) {
  const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    x: `${Math.random() * 100}%`,
    drift: `${(Math.random() - 0.5) * 120}px`,
    r: `${360 + Math.random() * 540}deg`,
    d: `${1.8 + Math.random() * 1.4}s`,
    delay: `${Math.random() * 0.5}s`,
    c: COLORS[i % COLORS.length],
  })), [pieces]);
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ "--x": b.x, "--drift": b.drift, "--r": b.r, "--d": b.d, "--delay": b.delay, "--c": b.c } as React.CSSProperties} />
      ))}
    </div>
  );
}
