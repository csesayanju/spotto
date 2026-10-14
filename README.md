# Spotto

A find-the-match card game for playing with friends, inspired by the classic
"every pair of cards shares exactly one symbol" game. Personal, non-commercial.

Stack: React + TypeScript + Vite, Firebase Realtime Database (free Spark plan),
Capacitor for the Android app. Also runs in any mobile browser.

## Project layout

| Module | Path | Status |
|---|---|---|
| Deck Generator | `src/shared/deck.ts` | Done, tested |
| Shared Types | `src/shared/types.ts` | Done |
| Config | `src/shared/config.ts` | Done |
| Rules Engine (Tower) | `src/engine/` | Done, tested |
| Room Manager | `src/net/rooms.ts` | Basic, has TODOs |
| Game State + Tap Arbiter | `src/net/game.ts` | Basic (Firebase transaction) |
| Presence / Reconnect | `src/net/presence.ts` | Basic, has TODOs |
| Client State Store | `src/state/store.ts` | Done |
| Screens | `src/ui/screens/` | Placeholder UI |
| Card Renderer | `src/ui/components/SymbolCard.tsx` | Done |
| Feedback Layer | `src/ui/feedback.ts` | Haptics only |
| Assets | `src/assets/symbols.ts` | 57 emoji |
| Test Harness | `tests/` | Deck + arbiter simulation |

## Setup

1. `npm install`
2. Create a Firebase project (free), then:
   - Build > Realtime Database > Create database
   - Build > Authentication > Sign-in method > enable **Anonymous**
   - Project settings > Your apps > add a **Web app**, copy the config
3. `cp .env.example .env` and paste the config values.
4. Deploy the security rules (Firebase CLI): `npx firebase-tools deploy --only database`
5. `npm run dev`, then open the printed network URL on two phones.

`npm test` runs the deck and tap-arbiter tests.

## Android

Needs Android Studio installed.

```
npx cap add android      # first time only
npm run android:sync
npm run android:open     # then Build > Build APK(s)
```

Share the APK with friends directly (no Play Store fee).

## Push to GitHub

Create an empty repo on GitHub (no README), then:

```
git init && git add . && git commit -m "Initial boilerplate"
git branch -M main
git remote add origin https://github.com/<you>/spotto.git
git push -u origin main
```

## Next up

- Room code collision retry, max players, block joining mid-game
- Play again / back to lobby
- Sounds and win animation
- Clean up stale rooms
