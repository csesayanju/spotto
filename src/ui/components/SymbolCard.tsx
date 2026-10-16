import { useMemo } from "react";
import { SYMBOLS } from "../../assets/symbols";
import type { Card, SymbolId } from "../../shared/types";
import { useBigSymbols } from "../prefs";

interface Props {
  card: Card;
  /** Seed for the layout so a card keeps its look across re-renders. */
  seed: number;
  onTap?: (symbol: SymbolId) => void;
  disabled?: boolean;
  label: string;
  /** Symbol to ring, e.g. the match in a How to play example. */
  highlight?: SymbolId;
  className?: string;
}

/** Card Renderer: one symbol in the middle, the rest on a ring, random size and rotation. */
export function SymbolCard({ card, seed, onTap, disabled, label, highlight, className }: Props) {
  const big = useBigSymbols();
  const layout = useMemo(() => buildLayout(card, seed, big), [card, seed, big]);
  return (
    <div className={className ? `card ${className}` : "card"} role="group" aria-label={label}>
      {layout.map(({ symbol, x, y, size, rot }) => (
        <button
          key={symbol}
          className={symbol === highlight ? "symbol hit" : "symbol"}
          disabled={disabled}
          onClick={() => onTap?.(symbol)}
          style={{ left: `${x}%`, top: `${y}%`, fontSize: `${size}cqw`, transform: `translate(-50%,-50%) rotate(${rot}deg)` }}
          aria-label={`Symbol ${symbol}`}
        >
          {SYMBOLS[symbol]}
        </button>
      ))}
    </div>
  );
}

/** Big mode: every symbol large and nearly upright, still on the same ring. */
function buildLayout(card: Card, seed: number, big = false) {
  const rand = mulberry32(seed);
  const order = [...card].sort(() => rand() - 0.5);
  const ring = order.length - 1;
  const offset = rand() * Math.PI * 2;
  return order.map((symbol, i) => {
    const center = i === 0;
    const angle = offset + ((i - 1) / ring) * Math.PI * 2;
    const r = center ? 0 : big ? 32 : 31;
    const size = 11 + rand() * 9;
    const rot = Math.floor(rand() * 360);
    return {
      symbol,
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
      size: big ? (center ? 22 : 19) : size,
      rot: big ? ((rot % 40) - 20) : rot,
    };
  });
}

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
