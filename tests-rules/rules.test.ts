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

  // The 8-player cap is enforced by the app: database rules can't count children.

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

describe("spectators and reactions", () => {
  it("anyone can watch a game in progress, but only as themselves", async () => {
    await seed("ABCD", room("playing"));
    await assertSucceeds(db("fan").ref("rooms/ABCD/spectators/fan").set({ name: "Fan", connected: true }));
    await assertFails(db("fan").ref("rooms/ABCD/spectators/other").set({ name: "Other", connected: true }));
  });

  it("spectators can't change the game", async () => {
    await seed("ABCD", { ...room("playing"), spectators: { fan: { name: "Fan", connected: true } } });
    await assertFails(db("fan").ref("rooms/ABCD/meta/status").set("finished"));
    await assertSucceeds(db("fan").ref("rooms/ABCD/spectators/fan/reaction").set({ emoji: "🔥", at: Date.now() }));
    await assertSucceeds(db("fan").ref("rooms/ABCD/spectators/fan").remove());
  });

  it("can't watch a room that doesn't exist", async () => {
    await assertFails(db("fan").ref("rooms/ZZZZ/spectators/fan").set({ name: "Fan", connected: true }));
  });

  it("the host can move spectators into the game", async () => {
    await seed("ABCD", { ...room("finished"), spectators: { fan: { name: "Fan", connected: true } } });
    await assertSucceeds(db("host").ref("rooms/ABCD").update({
      "players/fan": player("Fan"), "spectators/fan": null, "meta/status": "lobby",
    }));
  });

  it("reactions must look like reactions", async () => {
    await seed("ABCD", room());
    await assertSucceeds(db("host").ref("rooms/ABCD/players/host/reaction").set({ emoji: "😂", at: Date.now() }));
    await assertFails(db("host").ref("rooms/ABCD/players/host/reaction").set({ emoji: "x".repeat(40), at: 1 }));
  });
});

describe("open / closed switch", () => {
  const close = () => env.withSecurityRulesDisabled((ctx) => ctx.database().ref("config/open").set(false));

  it("nobody can flip it from the app", async () => {
    await assertFails(db("anyone").ref("config/open").set(false));
    await assertSucceeds(db("anyone").ref("config/open").get());
  });

  it("closed: no new rooms, no joining, no watching", async () => {
    await seed("ABCD", room());
    await seed("PLAY", room("playing"));
    await close();
    await assertFails(db("host2").ref("rooms/WXYZ").set(room()));
    await assertFails(db("guest").ref("rooms/ABCD/players/guest").set(player("Guest")));
    await assertFails(db("fan").ref("rooms/PLAY/spectators/fan").set({ name: "Fan", connected: true }));
  });

  it("closed: games already running carry on", async () => {
    await seed("PLAY", room("playing"));
    await close();
    await assertSucceeds(db("host").ref("rooms/PLAY/meta/status").set("finished"));
    await assertSucceeds(db("host").ref("rooms/PLAY").remove());
  });
});

describe("daily challenge", () => {
  const DAY = "2026-10-16";
  const start = (uid: string) => db(uid).ref(`daily/${DAY}/${uid}`).set({ name: "Me", startedAt: { ".sv": "timestamp" } });
  const backdate = (uid: string, ms: number) =>
    env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`daily/${DAY}/${uid}/startedAt`).set(Date.now() - ms));

  it("one official attempt per player per day", async () => {
    await assertSucceeds(start("me"));
    await assertFails(start("me"));
    await assertFails(db("me").ref(`daily/${DAY}/other`).set({ name: "X", startedAt: { ".sv": "timestamp" } }));
  });

  it("the start time has to be the server's", async () => {
    await assertFails(db("me").ref(`daily/${DAY}/me`).set({ name: "Me", startedAt: 1 }));
  });

  it("accepts a time that matches the server clock", async () => {
    await start("me");
    await backdate("me", 15_000); // started 15 s ago: 3 s countdown + about 12 s of play
    await assertSucceeds(db("me").ref(`daily/${DAY}/me/ms`).set(12_000));
    await assertFails(db("me").ref(`daily/${DAY}/me/ms`).set(11_000)); // no second go
  });

  it("rejects a time faster or slower than really happened", async () => {
    await start("fast");
    await backdate("fast", 30_000);
    await assertFails(db("fast").ref(`daily/${DAY}/fast/ms`).set(5_000)); // claims 5 s after 30 s
    await start("slow");
    await backdate("slow", 10_000);
    await assertFails(db("slow").ref(`daily/${DAY}/slow/ms`).set(20_000)); // longer than it's been
  });

  it("everyone signed in can read the board", async () => {
    await start("me");
    await assertSucceeds(db("other").ref(`daily/${DAY}`).get());
    await assertFails(db().ref(`daily/${DAY}`).get());
  });

  it("no new attempts while Spotto is closed", async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.database().ref("config/open").set(false));
    await assertFails(start("me"));
  });
});

describe("analytics", () => {
  const DAY = "2026-10-16";
  const event = (uid: string, extra: Record<string, unknown> = {}) =>
    ({ uid, e: "app_open", at: { ".sv": "timestamp" }, v: "0.8.1", dev: "phone", app: "web", ...extra });
  const makeAdmin = (uid: string) => env.withSecurityRulesDisabled((ctx) => ctx.database().ref(`admins/${uid}`).set(true));

  it("anyone signed in can log their own events, but not edit them", async () => {
    const r = db("me").ref(`analytics/${DAY}`).push();
    await assertSucceeds(r.set(event("me")));
    await assertFails(r.update({ e: "changed" }));
    await assertFails(db("me").ref(`analytics/${DAY}`).push().set(event("someone-else")));
  });

  it("events can't carry extra data (no IPs, no names)", async () => {
    await assertFails(db("me").ref(`analytics/${DAY}`).push().set(event("me", { ip: "1.2.3.4" })));
    await assertFails(db("me").ref(`analytics/${DAY}`).push().set(event("me", { at: 5 })));
  });

  it("only admins can read or clear analytics", async () => {
    await db("me").ref(`analytics/${DAY}`).push().set(event("me"));
    await assertFails(db("me").ref(`analytics/${DAY}`).get());
    await makeAdmin("boss");
    await assertSucceeds(db("boss").ref(`analytics/${DAY}`).get());
    await assertSucceeds(db("boss").ref(`analytics/${DAY}`).remove());
    await assertFails(db("me").ref("admins/me").set(true));
  });

  it("you can check whether you're an admin, but not see who else is", async () => {
    await makeAdmin("boss");
    await assertSucceeds(db("boss").ref("admins/boss").get());
    await assertSucceeds(db("me").ref("admins/me").get());
    await assertFails(db("me").ref("admins/boss").get());
  });
});
