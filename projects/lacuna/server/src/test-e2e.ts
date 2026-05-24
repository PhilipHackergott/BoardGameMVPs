// Headless end-to-end test of the whole online stack — no browser, no external services.
// Boots the server on an ephemeral port with a throwaway data dir, then drives two bot
// clients through: signup → (account checks) → ranked queue → match → a full game →
// Elo settlement, asserting the ratings moved and the match was persisted.
//
// Run: npm test   (from projects/lacuna/server)

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { legalMoves } from "../../app/src/engine/index.ts";
import type { GameState } from "../../app/src/engine/index.ts";
import type { ClientMsg, ServerMsg } from "../../app/src/net/protocol.ts";
import { GameServer } from "./server.ts";
import { Store } from "./store.ts";

let failures = 0;
function check(cond: boolean, label: string): void {
  console.log(`${cond ? "  ✓" : "  ✗ FAIL:"} ${label}`);
  if (!cond) failures++;
}

// One auto-playing bot client.
class Bot {
  ws: WebSocket;
  youAre = -1;
  over: { youWon: boolean | null; eloChange: number; newElo: number } | null = null;
  private acted = new Set<string>(); // guard: act once per (phase:turnIndex) seen as ours
  constructor(url: string, private onOver: () => void, private label: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (d) => this.handle(JSON.parse(String(d)) as ServerMsg));
  }
  send(m: ClientMsg): void {
    this.ws.send(JSON.stringify(m));
  }
  private handle(m: ServerMsg): void {
    if (m.t === "matchFound") {
      this.youAre = m.youAre;
      this.autoPlay(m.state);
    } else if (m.t === "state") {
      this.autoPlay(m.state);
    } else if (m.t === "matchOver") {
      this.over = { youWon: m.youWon, eloChange: m.eloChange, newElo: m.newElo };
      this.onOver();
    } else if (m.t === "error") {
      console.log(`    [${this.label}] server error: ${m.reason}`);
    }
  }
  private autoPlay(state: GameState): void {
    if (state.phase === "ended" || state.current !== this.youAre) return;
    const sig = `${state.phase}:${state.turnIndex}`;
    if (this.acted.has(sig)) return;
    this.acted.add(sig);
    if (state.phase === "setup") {
      this.send({ t: "act", action: { type: "claim", starId: state.stars[0].id } });
      return;
    }
    const moves = legalMoves(state);
    if (moves.length === 0) {
      this.send({ t: "act", action: { type: "pass" } });
      return;
    }
    const mv = moves[0];
    const a = state.stars.find((s) => s.id === mv.aStarId)!;
    const b = state.stars.find((s) => s.id === mv.bStarId)!;
    this.send({
      t: "act",
      action: { type: "place", aStarId: mv.aStarId, bStarId: mv.bStarId, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    });
  }
}

function once(ws: WebSocket, pred: (m: ServerMsg) => boolean): Promise<ServerMsg> {
  return new Promise((resolve) => {
    const on = (d: unknown) => {
      const m = JSON.parse(String(d)) as ServerMsg;
      if (pred(m)) {
        ws.off("message", on);
        resolve(m);
      }
    };
    ws.on("message", on);
  });
}
const open = (ws: WebSocket) => new Promise<void>((r) => ws.once("open", () => r()));
const sendRaw = (ws: WebSocket, m: ClientMsg) => ws.send(JSON.stringify(m));

async function main(): Promise<void> {
  const dataDir = mkdtempSync(join(tmpdir(), "lacuna-e2e-"));
  const store = new Store(dataDir);
  const server = new GameServer({ store, port: 0 });
  const port = await server.ready();
  const url = `ws://localhost:${port}`;
  console.log(`E2E server on ${url}\n`);

  // ── Account checks on one raw socket ───────────────────────────────────────
  console.log("Accounts:");
  const a = new WebSocket(url);
  await open(a);
  sendRaw(a, { t: "signup", email: "alice@example.com", handle: "Alice", password: "hunter2pass" });
  const aAuth = await once(a, (m) => m.t === "authOk" || m.t === "authErr");
  check(aAuth.t === "authOk", "signup Alice succeeds");
  const aliceToken = aAuth.t === "authOk" ? aAuth.token : "";

  sendRaw(a, { t: "signup", email: "alice@example.com", handle: "Other", password: "anotherpass" });
  const dup = await once(a, (m) => m.t === "authErr" || m.t === "authOk");
  check(dup.t === "authErr", "duplicate email is rejected");

  sendRaw(a, { t: "updateAccount", handle: "AliceTheGreat" });
  const upd = await once(a, (m) => m.t === "accountUpdated" || m.t === "authErr");
  check(upd.t === "accountUpdated" && upd.user.handle === "AliceTheGreat", "handle change works");

  sendRaw(a, { t: "resume", token: aliceToken });
  const res = await once(a, (m) => m.t === "authOk" || m.t === "authErr");
  check(res.t === "authOk", "token resume works");
  a.close();

  // ── Two bots queue, match, and play a full ranked game ─────────────────────
  console.log("\nMatch + Elo:");
  // Register both accounts up front (bots reuse them via login-less signup on fresh sockets).
  const reg = new WebSocket(url);
  await open(reg);
  sendRaw(reg, { t: "signup", email: "bob@example.com", handle: "Bob", password: "bobpassword" });
  await once(reg, (m) => m.t === "authOk");
  sendRaw(reg, { t: "logout" });
  await once(reg, (m) => m.t === "loggedOut");
  sendRaw(reg, { t: "signup", email: "carol@example.com", handle: "Carol", password: "carolpassword" });
  await once(reg, (m) => m.t === "authOk");
  reg.close();

  let oversLeft = 2;
  let finishCb: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finishCb = () => {
      if (--oversLeft === 0) resolve();
    };
  });

  const bob = new Bot(url, () => finishCb(), "Bob");
  const carol = new Bot(url, () => finishCb(), "Carol");
  await open(bob.ws);
  await open(carol.ws);
  bob.send({ t: "login", email: "bob@example.com", password: "bobpassword" });
  carol.send({ t: "login", email: "carol@example.com", password: "carolpassword" });
  await once(bob.ws, (m) => m.t === "authOk");
  await once(carol.ws, (m) => m.t === "authOk");

  bob.send({ t: "findMatch" });
  carol.send({ t: "findMatch" });

  const timeout = new Promise<void>((_, rej) => setTimeout(() => rej(new Error("timed out")), 20000));
  await Promise.race([done, timeout]);

  check(bob.over !== null && carol.over !== null, "both players received matchOver");
  const draw = bob.over?.youWon === null;
  if (!draw) {
    const winner = bob.over?.youWon ? bob : carol;
    const loser = bob.over?.youWon ? carol : bob;
    check((winner.over?.eloChange ?? 0) > 0, "winner gained Elo");
    check((loser.over?.eloChange ?? 0) < 0, "loser lost Elo");
    check(winner.over!.newElo > 1000 && loser.over!.newElo < 1000, "ratings moved off the 1000 baseline");
  } else {
    check(bob.over?.eloChange === 0 && carol.over?.eloChange === 0, "draw leaves both ratings unchanged");
  }

  bob.ws.close();
  carol.ws.close();

  // ── Persistence ────────────────────────────────────────────────────────────
  console.log("\nPersistence:");
  const matches = JSON.parse(readFileSync(join(dataDir, "matches.json"), "utf8")) as unknown[];
  check(matches.length === 1, "exactly one match was persisted");
  const players = JSON.parse(readFileSync(join(dataDir, "players.json"), "utf8")) as { handle: string; elo: number }[];
  const bobRec = players.find((p) => p.handle === "Bob");
  const carolRec = players.find((p) => p.handle === "Carol");
  check(!!bobRec && !!carolRec, "both ranked players persisted");
  if (!draw) check((bobRec!.elo === 1000) === false || (carolRec!.elo === 1000) === false, "a persisted Elo changed");

  server.close();
  rmSync(dataDir, { recursive: true, force: true });

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED ✓" : `${failures} CHECK(S) FAILED ✗`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("E2E crashed:", err);
  process.exit(1);
});
