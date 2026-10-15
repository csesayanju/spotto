const COLORS = ["#e8505b", "#f29e4c", "#4cb944", "#3fa7d6", "#9b5de5", "#f15bb5", "#00b8a9", "#c9a227"];

/** Stable color per player id, so someone looks the same on every screen. */
export function colorFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

/** Round badge with the player's initial. */
export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  return (
    <span className="avatar" aria-hidden style={{ background: colorFor(id), width: size, height: size, fontSize: size * 0.48 }}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
