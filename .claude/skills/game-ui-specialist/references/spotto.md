# Spotto: what to know before changing the UI

Spotto is a private spot-the-match party game for friends: every pair of
cards shares exactly one symbol, players race to tap it. Mobile-first,
portrait, played in short bursts in a group, often on mid-range Android
phones and iPhones (as an installed web app).

## Where things live
- `src/styles.css` - the whole stylesheet. Tokens are CSS custom properties
  on `:root` (felt greens, `--card`, `--sun` accent, `--coral` for errors,
  `--glass*` surfaces, `--radius`, `--shadow`). Extend tokens rather than
  hard-coding values.
- `src/ui/screens/` - Home, Lobby, Game (plus Opponents, Replay, Stack,
  FrozenBar), Watch (spectators), Results, Practice/Daily (share SoloRun),
  StatsScreen, DevAnalytics, Closed.
- `src/ui/components/` - SymbolCard (the round card; symbols laid out on a
  ring, seeded), HowToPlay, ConfirmSheet, Avatar, Reactions, Footer.
- `src/ui/sound.tsx` (Web Audio tones), `src/ui/feedback.ts` (haptics),
  `src/ui/prefs.tsx` (big symbols), `src/ui/theme.tsx` (symbol themes).
- Font: Baloo 2 from Google Fonts (loaded in `index.html`).

## Constraints
- Everything stays free and light: no animation or UI libraries, no image
  assets for things CSS can draw. Emoji are the symbols.
- The game screen must fit one phone screen without scrolling with up to
  8 players (Gift and Potato show every opponent's card).
- Symbols must stay tappable and legible: don't shrink cards to make room
  for decoration. The `big symbols` preference must keep working.
- Keep game logic out of UI changes; engine code in `src/engine/` is pure and
  tested. UI changes shouldn't need engine changes.
- Respect `prefers-reduced-motion` (already handled globally at the end of
  styles.css - keep it last).
- Copyright footer reads "© <year> Sayan".

## Testing the UI
- Run the dev server with file polling, because Vite's watcher can miss edits
  in temp folders on Windows and keep serving stale code:
  `CHOKIDAR_USEPOLLING=1 node node_modules/vite/bin/vite.js --port 5179`.
  If a change doesn't show up, `curl` the served file to confirm before debugging.
  Use a 375×812 viewport (and 360×640). `.env` comes from the owner's local copy.
- Vite's CSS processing drops a repeated property in one rule (the
  `width: …vh; width: …dvh` fallback trick). Put the newer-unit version in its
  own `@supports` rule instead.
- Multiplayer screens need other players. Add a temporary dev-only helper
  (`src/devbots.ts`, imported from `main.tsx` under `import.meta.env.DEV`)
  that writes bot players into your room and can start/finish games via
  `startGame`/`submitTap`. Delete it before committing.
- Live database rules apply in dev and on PR previews, so features that need
  new rules can't be exercised until released.
- Screenshots in the in-app browser can lag behind the DOM; when timing
  matters, measure in the page with JS instead.
- `npm run typecheck`, `npm test`, `npm run build` before committing.
