import { useSyncExternalStore } from "react";

/**
 * Sounds are synthesized with Web Audio, so there are no audio files to
 * download. Browsers only allow audio after a user gesture; the first tap
 * anywhere unlocks it.
 */
export type Sound = "tick" | "go" | "win" | "lose" | "wrong" | "victory" | "defeat";

type Note = { f: number; at: number; len: number; type?: OscillatorType; vol?: number; to?: number };

const SOUNDS: Record<Sound, Note[]> = {
  tick: [{ f: 660, at: 0, len: 0.08, vol: 0.25 }],
  go: [{ f: 880, to: 1320, at: 0, len: 0.22, type: "triangle", vol: 0.35 }],
  win: [523, 659, 784].map((f, i) => ({ f, at: i * 0.06, len: 0.12, type: "triangle" as const, vol: 0.3 })),
  lose: [{ f: 330, at: 0, len: 0.1, vol: 0.12 }],
  wrong: [{ f: 170, to: 120, at: 0, len: 0.18, type: "square", vol: 0.12 }],
  victory: [523, 659, 784, 1047].map((f, i) => ({ f, at: i * 0.12, len: i === 3 ? 0.45 : 0.16, type: "triangle" as const, vol: 0.32 })),
  defeat: [392, 330, 262].map((f, i) => ({ f, at: i * 0.16, len: 0.22, type: "triangle" as const, vol: 0.22 })),
};

const MUTE_KEY = "spotto:muted";
let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
  return ctx;
}

// Unlock audio on the first interaction.
addEventListener("pointerdown", () => audio(), { once: true, capture: true });

export function play(sound: Sound): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.01;
  for (const n of SOUNDS[sound]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, t0 + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.len);
    // Short attack and decay so notes don't click.
    gain.gain.setValueAtTime(0.0001, t0 + n.at);
    gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.3, t0 + n.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.len + 0.02);
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* stays for this session only */ }
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => muted);
}

/** Speaker button that toggles sound on this device. */
export function SoundToggle() {
  const isMuted = useMuted();
  return (
    <button className="icon sound" onClick={() => setMuted(!isMuted)}
      aria-label={isMuted ? "Turn sound on" : "Turn sound off"} aria-pressed={!isMuted}>
      {isMuted ? "🔇" : "🔊"}
    </button>
  );
}
