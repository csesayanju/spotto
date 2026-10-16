/**
 * Database rules tests. They need the Firebase emulator (and so Java), so they
 * run in CI rather than with `npm test`:
 *   npx firebase-tools emulators:exec --only database "npx vitest run --config vitest.rules.config.ts"
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
const HOUR = 3600_000;

const player = (name: string) => ({ name, ready: false, connected: true, topCard: -1, score: 0, frozenUntil: 0 });
const room = (status = "lobby", players: Record<string, unknown> = { host: player("Host") }, createdAt = Date.now()) =>
  ({ meta: { hostId: "host", status, mode: "tower", createdAt }, players });

const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const seed = (code: string, data: unknown) =>
  env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`rooms/${code}`).set(data));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-spotto",
    database: { rules: readFileSync("database.rules.json", "utf8") },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearDatabase());

describe("reading", () => {
  it("needs sign-in", async () => {
    await seed("ABCD", room());
    await assertFails(db().ref("rooms/ABCD").get());
    await assertSucceeds(db("anyone").ref("rooms/ABCD").get());
  });
});

describe("creating and joining", () => {
  it("anyone signed in can create a free room code", async () => {
    await assertSucceeds(db("host").ref("rooms/ABCD").set(room()));
  });

  it("room codes must be four capital letters", async () => {
    await assertFails(db("host").ref("rooms/abc1").set(room()));
  });

  it("can join a lobby", async () => {
    await seed("ABCD", room());
    await assertSucceeds(db("guest").ref("rooms/ABCD/players/guest").set(player("Guest")));
  });

  it("can't join a game in progress", async () => {
    await seed("ABCD", room("playing"));
    await assertFails(db("guest").ref("rooms/ABCD/players/guest").set(player("Guest")));
  });

  it("can't join a full room", async () => {
    const eight = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`p${i}`, player(`P${i}`)]));
    await seed("ABCD", { ...room("lobby", eight), meta: { ...room().meta, hostId: "p0" } });
    await assertFails(db("guest").ref("rooms/ABCD/players/guest").set(player("Guest")));
  });

  it("can't add someone else", async () => {
    await seed("ABCD", room());
    await assertFails(db("guest").ref("rooms/ABCD/players/other").set(player("Other")));
  });

  it("names must be 1 to 16 characters", async () => {
    await seed("ABCD", room());
    await assertFails(db("guest").ref("rooms/ABCD/players/guest").set(player("x".repeat(17))));
    await assertFails(db("guest").ref("rooms/ABCD/players/guest").set(player("")));
  });

  it("a stray presence write can't recreate a player who left", async () => {
    await seed("ABCD", room());
    await assertFails(db("gone").ref("rooms/ABCD/players/gone/connected").set(false));
  });
});

describe("playing", () => {
  it("members can update the room, and their own node", async () => {
    await seed("ABCD", room("lobby", { host: player("Host"), guest: player("Guest") }));
    await assertSucceeds(db("guest").ref("rooms/ABCD/players/guest/ready").set(true));
    await assertSucceeds(db("host").ref("rooms/ABCD/meta/mode").set("potato"));
    await assertSucceeds(db("host").ref("rooms/ABCD/meta/status").set("playing"));
  });

  it("rejects nonsense room values", async () => {
    await seed("ABCD", room());
    await assertFails(db("host").ref("rooms/ABCD/meta/status").set("hacked"));
    await assertFails(db("host").ref("rooms/ABCD/meta/createdAt").set(1));
    await assertFails(db("host").ref("rooms/ABCD/meta").remove());
  });

  it("outsiders can't change a room", async () => {
    await seed("ABCD", room());
    await assertFails(db("stranger").ref("rooms/ABCD/meta/status").set("finished"));
  });

  it("a player can leave", async () => {
    await seed("ABCD", room("lobby", { host: player("Host"), guest: player("Guest") }));
    await assertSucceeds(db("guest").ref("rooms/ABCD/players/guest").remove());
  });
});

describe("cleanup", () => {
  it("anyone can delete a room older than 6 hours, but not a newer one", async () => {
    await seed("OLDR", room("lobby", undefined, Date.now() - 7 * HOUR));
    await seed("NEWR", room());
    await assertSucceeds(db("anyone").ref("rooms/OLDR").remove());
    await assertFails(db("anyone").ref("rooms/NEWR").remove());
  });

  it("the last player can delete their room", async () => {
    await seed("ABCD", room());
    await assertSucceeds(db("host").ref("rooms/ABCD").remove());
  });
});
