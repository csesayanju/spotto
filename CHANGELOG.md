# Changelog

## 0.2.0

- Two new modes: Well (empty your pile first) and Gift (hand the center card to an opponent; fewest cards wins)
- The host picks the mode in the lobby; everyone sees the choice live
- How to play guide from the home screen and lobby: the basics with a highlighted example, plus a page per mode
- Results rank by each mode's goal (most or fewest cards)
- Center card symbols are no longer faded
- Fix: PR preview links (CI job was missing the checks permission)

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
