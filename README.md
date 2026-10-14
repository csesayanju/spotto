# Spotto

A find-the-match card game for playing with friends, inspired by the classic
"every pair of cards shares exactly one symbol" game. Personal, non-commercial.

Stack: React + TypeScript + Vite, Firebase Realtime Database (free Spark plan),
Capacitor for the Android app. Also runs in any mobile browser.

## Project layout

| Module | Path |
|---|---|
| Deck Generator | `src/shared/deck.ts` |
| Shared Types, Config | `src/shared/` |
| Rules Engine (Tower, Well, Gift), host handover | `src/engine/` |
| Room Manager, rejoin, cleanup | `src/net/rooms.ts` |
| Game State + Tap Arbiter | `src/net/game.ts` |
| Presence | `src/net/presence.ts` |
| Client State Store | `src/state/store.ts` |
| Screens, Card Renderer, Feedback | `src/ui/` |
| Assets | `src/assets/symbols.ts` |
| Tests | `tests/` |
| Android project | `android/` |
| CI/CD | `.github/workflows/` |

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

## Android (local build)

Needs Android Studio. The `android/` folder is already in the repo.

```
npm run android:sync
npm run android:open     # then Build > Build APK(s)
```

All APKs are signed with the shared key in `android/app/spotto-friends.keystore`,
so a new version installs over the old one. That key is fine for sharing with
friends but must not be used for the Play Store.

## CI/CD (GitHub Actions + Firebase, free)

- **Every pull request:** typecheck, tests, build, and a temporary preview link
  posted as a PR comment (expires after 7 days).
- **Every push to `main`:** typecheck, tests, build.
- **Every version tag (`v*`):** deploys the web app and database rules to
  Firebase, builds the APK, and publishes a GitHub Release with the APK attached.

Preview links use the same database as the live game.

### One-time setup

1. **Firebase Hosting:** in the Firebase console, open Hosting and click Get started
   (you can skip the CLI steps it shows).
2. **Service account key:** Firebase console > Project settings > Service accounts >
   Generate new private key. This downloads a JSON file.
3. **GitHub secret:** repo > Settings > Secrets and variables > Actions > Secrets >
   New repository secret. Name `FIREBASE_SERVICE_ACCOUNT`, value: the whole JSON file.
   Then delete the downloaded file.
4. **GitHub variables:** same page, Variables tab. Add the five `VITE_FIREBASE_*`
   values from your `.env`.

### Releasing a version

```
git checkout -b release/0.1.2
# make changes, bump "version" in package.json, update CHANGELOG.md
git commit -am "0.1.2: ..."
git push -u origin release/0.1.2      # open a PR, check CI + preview link
# after merging the PR on GitHub:
git checkout main && git pull
git tag v0.1.2 && git push origin v0.1.2
```

The live game is at `https://<project-id>.web.app`, and the APK is on the
repo's Releases page.

## Next up

- Sounds and a win animation
- More modes (Hot Potato)
