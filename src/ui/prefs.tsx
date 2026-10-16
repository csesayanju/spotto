import { useSyncExternalStore } from "react";

/** Per-device display preferences, remembered in localStorage. */
const BIG_KEY = "spotto:bigSymbols";
let big = read();
const listeners = new Set<() => void>();

function read(): boolean {
  try { return localStorage.getItem(BIG_KEY) === "1"; } catch { return false; }
}

export function setBigSymbols(value: boolean): void {
  big = value;
  try { localStorage.setItem(BIG_KEY, value ? "1" : "0"); } catch { /* this session only */ }
  listeners.forEach((l) => l());
}

/** Larger, less rotated symbols: easier for young players and small screens. */
export function useBigSymbols(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => big);
}

/** "Aa" button that switches big symbols on this device. */
export function BigSymbolsToggle() {
  const on = useBigSymbols();
  return (
    <button className={on ? "icon big-toggle on" : "icon big-toggle"} onClick={() => setBigSymbols(!on)}
      aria-pressed={on} aria-label={on ? "Use normal symbols" : "Use big symbols"} title="Big symbols">
      Aa
    </button>
  );
}
