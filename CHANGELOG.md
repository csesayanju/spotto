# Changelog

## 0.3.0

- Sounds: countdown beeps, round won/lost, wrong tap, victory and defeat. Made in the browser, no downloads. Mute with the speaker button (remembered per device)
- Replay after every round: the two cards that matched, with the shared symbol ringed
- Invite links: sharing the room sends a link that opens straight into the room (and points at the website even when shared from the Android app)
- Card stack under your card, with a count, so you can see your pile grow (Tower) or shrink (Well)
- Game length: the host picks Quick (21 cards), Normal (35) or Full (57)
- Room scoreboard: games won in the room are counted across rematches (🏆 in the lobby and results)
- Fix: the round banner could stay on screen if another update arrived while it was showing

## 0.2.1

First release of the 0.2 line (0.2.0 was never published).

New modes and rules
- Two new modes: Well (empty your pile first) and Gift (hand the center card to an opponent; fewest cards wins)
- The host picks the mode in the lobby; everyone sees the choice live
- How to play guide from the home screen and lobby: the basics with a highlighted example, plus a page per mode
- Results rank by each mode's goal (most or fewest cards)

UI and UX
- 3-2-1 countdown before each game, synced to the server clock so every phone starts together
- Frozen timer bar after a wrong tap; the center card pops in when it changes
- "You're offline, reconnecting…" banner when the connection drops
- Redesigned home screen; room code field accepts letters only and Enter joins
- Lobby: player avatars, host crown, ready ticks, player count, tap-to-share hint
- Score chips in game with the current leader highlighted
- In-app confirmation when leaving a game (replaces the browser pop-up)
- Results with medals, avatars and your row marked
- Consistent buttons, spacing and animations; respects reduced-motion settings
- © Sayan in the footer and How to play guide

Fixes
- Center card symbols are no longer faded
- PR preview links (CI job was missing the checks permission)

## 0.1.1

- Rejoin automatically after a reload or app switch
- "Play again" sends everyone back to the lobby with scores reset
- Round banner shows who won and with which symbol
- Joining is blocked mid-game and when the room is full; room codes never collide
- Host role passes to another player if the host leaves or goes offline
- Rooms are deleted when the last player leaves; rooms older than 6 hours are swept
- Leave buttons in lobby, game and results; tap the room code to share it
- Your name is remembered on the device
- Firebase Hosting, Android project, and GitHub Actions CI/CD

## 0.1.0

- Initial boilerplate: deck generator, Tower mode, rooms, lobby, game, results
