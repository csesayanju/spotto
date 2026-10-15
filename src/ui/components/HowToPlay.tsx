import { useEffect, useRef, useState } from "react";
import { SYMBOLS } from "../../assets/symbols";
import { DECK } from "../../net/game";
import { sharedSymbol } from "../../shared/deck";
import type { GameMode } from "../../shared/types";
import { BASICS, MODE_INFO, MODE_ORDER } from "../modes";
import { Footer } from "./Footer";
import { SymbolCard } from "./SymbolCard";

type Tab = "basics" | GameMode;

interface Props {
  /** Tab to open on, e.g. the mode currently picked in the lobby. */
  initial?: Tab;
  onClose: () => void;
}

// A fixed pair of cards so the example looks the same every time.
const EXAMPLE = [DECK[12], DECK[40]] as const;
const EXAMPLE_MATCH = sharedSymbol(EXAMPLE[0], EXAMPLE[1])!;

/** Full-screen rules sheet: the basics plus one page per mode. */
export function HowToPlay({ initial = "basics", onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initial);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so live room updates (a new onClose each render) don't re-run the effect.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const tabs: Tab[] = ["basics", ...MODE_ORDER];

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="htp-title">
      <div className="sheet-inner">
        <header className="sheet-head">
          <h2 id="htp-title">How to play</h2>
          <button ref={closeRef} className="icon" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <nav className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "tab on" : "tab"}
              onClick={() => setTab(t)}>
              {t === "basics" ? "Basics" : `${MODE_INFO[t].icon} ${MODE_INFO[t].name}`}
            </button>
          ))}
        </nav>

        <section className="sheet-body" role="tabpanel">
          {tab === "basics" ? <Basics /> : <ModePage mode={tab} />}
          <Footer />
        </section>

        <button className="primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function Basics() {
  return (
    <>
      <p className="lead">Two cards, one shared symbol. Spot it faster than your friends.</p>
      <div className="example">
        <SymbolCard label="Example card" card={EXAMPLE[0]} seed={7} highlight={EXAMPLE_MATCH} disabled />
        <SymbolCard label="Example card" card={EXAMPLE[1]} seed={11} highlight={EXAMPLE_MATCH} disabled />
      </div>
      <p className="caption">These two cards share {SYMBOLS[EXAMPLE_MATCH]}. It's the only symbol on both.</p>
      <ol className="rules">{BASICS.map((r) => <li key={r}>{r}</li>)}</ol>
    </>
  );
}

function ModePage({ mode }: { mode: GameMode }) {
  const info = MODE_INFO[mode];
  return (
    <>
      <p className="lead">{info.icon} <strong>{info.name}</strong>: {info.tagline}</p>
      <h3>Goal</h3>
      <p>{info.goal}</p>
      <h3>How a round works</h3>
      <ol className="rules">{info.steps.map((s) => <li key={s}>{s}</li>)}</ol>
    </>
  );
}
