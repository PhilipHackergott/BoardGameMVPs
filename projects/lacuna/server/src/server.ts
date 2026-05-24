// The WebSocket front door. One socket per client carries everything: auth, account
// management, ranked matchmaking, and in-match actions. The server is authoritative for
// games (rooms.ts) and ratings (Elo settled on game end).

import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMsg, ServerMsg } from "../../app/src/net/protocol.ts";
import type { PlayerId } from "../../app/src/engine/index.ts";
import {
  hashPassword,
  Sessions,
  validateEmail,
  validateHandle,
  validatePassword,
  verifyPassword,
} from "./auth.ts";
import { Matchmaker } from "./matchmaking.ts";
import { Match } from "./rooms.ts";
import { Store, toPublicUser } from "./store.ts";

const RANKED_CLOCK_SECONDS = 180; // 3-minute chess clock per player

interface Ctx {
  ws: WebSocket;
  userId: string | null;
  msgs: number; // messages seen in the current rate-limit window
  windowStart: number;
}

const RATE_WINDOW_MS = 2000;
const RATE_MAX = 60; // generous for turn-based play; blocks floods
const MAX_PAYLOAD = 64 * 1024;

export class GameServer {
  private store: Store;
  private sessions = new Sessions();
  private matchmaker = new Matchmaker();
  private matches = new Map<string, Match>();
  private userToConn = new Map<string, Ctx>();
  private userToMatch = new Map<string, string>();
  private wss: WebSocketServer;
  private mmTimer: ReturnType<typeof setInterval>;

  constructor(opts: { store: Store; port: number }) {
    this.store = opts.store;
    this.wss = new WebSocketServer({ port: opts.port, maxPayload: MAX_PAYLOAD });
    this.wss.on("connection", (ws) => this.onConnection(ws));
    this.mmTimer = setInterval(() => this.runMatchmaking(), 1000);
  }

  get port(): number {
    const a = this.wss.address();
    return typeof a === "object" && a ? a.port : 0;
  }

  /** Resolves with the bound port once the socket is listening (port 0 = ephemeral). */
  ready(): Promise<number> {
    return new Promise((resolve) => {
      if (this.wss.address()) resolve(this.port);
      else this.wss.once("listening", () => resolve(this.port));
    });
  }

  close(): void {
    clearInterval(this.mmTimer);
    this.wss.close();
  }

  // ─── Connection plumbing ────────────────────────────────────────────────────
  private onConnection(ws: WebSocket): void {
    const ctx: Ctx = { ws, userId: null, msgs: 0, windowStart: Date.now() };
    ws.on("message", (data) => {
      // Per-connection rate limit: drop floods silently.
      const now = Date.now();
      if (now - ctx.windowStart > RATE_WINDOW_MS) {
        ctx.windowStart = now;
        ctx.msgs = 0;
      }
      if (++ctx.msgs > RATE_MAX) return;

      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(data)) as ClientMsg;
      } catch {
        return send(ctx, { t: "error", reason: "Malformed message." });
      }
      try {
        this.dispatch(ctx, msg);
      } catch (err) {
        send(ctx, { t: "error", reason: err instanceof Error ? err.message : "Server error." });
      }
    });
    ws.on("close", () => this.onClose(ctx));
    ws.on("error", () => {});
  }

  private onClose(ctx: Ctx): void {
    const uid = ctx.userId;
    if (!uid) return;
    // Only react if this socket is still the user's active connection.
    if (this.userToConn.get(uid) !== ctx) return;
    this.matchmaker.remove(uid);
    const m = this.activeMatch(uid);
    if (m) m.detach(m.seatOf(uid) as PlayerId);
    this.userToConn.delete(uid);
    this.notifyPresence(uid); // let online friends see them go offline
  }

  private activeMatch(userId: string): Match | null {
    const id = this.userToMatch.get(userId);
    if (!id) return null;
    return this.matches.get(id) ?? null;
  }

  private routeFn(userId: string) {
    return (msg: ServerMsg) => this.sendToUser(userId, msg);
  }

  private sendToUser(userId: string, msg: ServerMsg): void {
    const ctx = this.userToConn.get(userId);
    if (ctx && ctx.ws.readyState === ctx.ws.OPEN) ctx.ws.send(JSON.stringify(msg));
  }

  // ─── Dispatch ─────────────────────────────────────────────────────────────--
  private dispatch(ctx: Ctx, msg: ClientMsg): void {
    switch (msg.t) {
      case "signup":
        return this.onSignup(ctx, msg);
      case "login":
        return this.onLogin(ctx, msg);
      case "resume":
        return this.onResume(ctx, msg);
      case "logout":
        return this.onLogout(ctx);
      case "updateAccount":
        return this.onUpdateAccount(ctx, msg);
      case "changePassword":
        return this.onChangePassword(ctx, msg);
      case "deleteAccount":
        return this.onDeleteAccount(ctx, msg);
      case "findMatch":
        return this.onFindMatch(ctx);
      case "cancelQueue":
        return this.onCancelQueue(ctx);
      case "addFriend":
        return this.onAddFriend(ctx, msg);
      case "acceptFriend":
        return this.onFriendOp(ctx, "accept", msg.userId);
      case "declineFriend":
        return this.onFriendOp(ctx, "decline", msg.userId);
      case "removeFriend":
        return this.onFriendOp(ctx, "remove", msg.userId);
      case "invite":
        return this.onInvite(ctx, msg.userId);
      case "acceptInvite":
        return this.onAcceptInvite(ctx, msg.fromUserId);
      case "declineInvite":
        return this.onDeclineInvite(ctx, msg.fromUserId);
      case "act":
      case "resign":
      case "leaveMatch":
        return this.onMatchMsg(ctx, msg);
      case "ping":
        return send(ctx, { t: "pong" });
      default:
        return send(ctx, { t: "error", reason: "Unknown message." });
    }
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────--
  private authenticate(ctx: Ctx, userId: string): string {
    // Evict any previous socket for this user (single active connection).
    const prev = this.userToConn.get(userId);
    if (prev && prev !== ctx) prev.userId = null;
    ctx.userId = userId;
    this.userToConn.set(userId, ctx);
    this.notifyPresence(userId); // send this user their friends list + tell online friends they're on
    return this.sessions.issue(userId);
  }

  private onSignup(ctx: Ctx, msg: Extract<ClientMsg, { t: "signup" }>): void {
    const errs = [validateEmail(msg.email), validateHandle(msg.handle), validatePassword(msg.password)];
    const err = errs.find(Boolean);
    if (err) return send(ctx, { t: "authErr", reason: err });
    if (this.store.getByEmail(msg.email)) return send(ctx, { t: "authErr", reason: "Email already registered." });
    if (this.store.getByHandle(msg.handle)) return send(ctx, { t: "authErr", reason: "Handle already taken." });
    const { hash, salt } = hashPassword(msg.password);
    const p = this.store.createPlayer({ email: msg.email, handle: msg.handle, passHash: hash, passSalt: salt });
    const token = this.authenticate(ctx, p.id);
    send(ctx, { t: "authOk", token, user: toPublicUser(p) });
  }

  private onLogin(ctx: Ctx, msg: Extract<ClientMsg, { t: "login" }>): void {
    const p = this.store.getByEmail(msg.email ?? "");
    if (!p || !verifyPassword(msg.password ?? "", p.passHash, p.passSalt))
      return send(ctx, { t: "authErr", reason: "Invalid email or password." });
    const token = this.authenticate(ctx, p.id);
    send(ctx, { t: "authOk", token, user: toPublicUser(p) });
    this.maybeRejoinMatch(p.id);
  }

  private onResume(ctx: Ctx, msg: Extract<ClientMsg, { t: "resume" }>): void {
    const userId = this.sessions.resolve(msg.token ?? "");
    const p = userId ? this.store.getById(userId) : undefined;
    if (!p) return send(ctx, { t: "authErr", reason: "Session expired." });
    const token = this.authenticate(ctx, p.id);
    send(ctx, { t: "authOk", token, user: toPublicUser(p) });
    this.maybeRejoinMatch(p.id);
  }

  private onLogout(ctx: Ctx): void {
    const uid = ctx.userId;
    if (uid) {
      this.matchmaker.remove(uid);
      const m = this.activeMatch(uid);
      if (m) m.leave(m.seatOf(uid) as PlayerId);
      this.userToConn.delete(uid);
      ctx.userId = null;
    }
    send(ctx, { t: "loggedOut" });
  }

  // ─── Account management ─────────────────────────────────────────────────────
  private requireUser(ctx: Ctx): string | null {
    if (!ctx.userId) {
      send(ctx, { t: "error", reason: "Not signed in." });
      return null;
    }
    return ctx.userId;
  }

  private onUpdateAccount(ctx: Ctx, msg: Extract<ClientMsg, { t: "updateAccount" }>): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const patch: { handle?: string; email?: string } = {};
    if (msg.handle !== undefined) {
      const e = validateHandle(msg.handle);
      if (e) return send(ctx, { t: "authErr", reason: e });
      const owner = this.store.getByHandle(msg.handle);
      if (owner && owner.id !== uid) return send(ctx, { t: "authErr", reason: "Handle already taken." });
      patch.handle = msg.handle;
    }
    if (msg.email !== undefined) {
      const e = validateEmail(msg.email);
      if (e) return send(ctx, { t: "authErr", reason: e });
      const owner = this.store.getByEmail(msg.email);
      if (owner && owner.id !== uid) return send(ctx, { t: "authErr", reason: "Email already registered." });
      patch.email = msg.email.toLowerCase();
    }
    const p = this.store.updatePlayer(uid, patch);
    if (p) send(ctx, { t: "accountUpdated", user: toPublicUser(p) });
  }

  private onChangePassword(ctx: Ctx, msg: Extract<ClientMsg, { t: "changePassword" }>): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const p = this.store.getById(uid);
    if (!p || !verifyPassword(msg.oldPassword ?? "", p.passHash, p.passSalt))
      return send(ctx, { t: "authErr", reason: "Current password is incorrect." });
    const e = validatePassword(msg.newPassword);
    if (e) return send(ctx, { t: "authErr", reason: e });
    const { hash, salt } = hashPassword(msg.newPassword);
    this.store.updatePlayer(uid, { passHash: hash, passSalt: salt });
    send(ctx, { t: "accountUpdated", user: toPublicUser(p) });
  }

  private onDeleteAccount(ctx: Ctx, msg: Extract<ClientMsg, { t: "deleteAccount" }>): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const p = this.store.getById(uid);
    if (!p || !verifyPassword(msg.password ?? "", p.passHash, p.passSalt))
      return send(ctx, { t: "authErr", reason: "Password is incorrect." });
    const m = this.activeMatch(uid);
    if (m) m.leave(m.seatOf(uid) as PlayerId);
    this.matchmaker.remove(uid);
    this.sessions.revokeUser(uid);
    this.store.deletePlayer(uid);
    this.userToConn.delete(uid);
    ctx.userId = null;
    send(ctx, { t: "loggedOut" });
  }

  // ─── Matchmaking ────────────────────────────────────────────────────────────
  private onFindMatch(ctx: Ctx): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    if (this.activeMatch(uid)) return send(ctx, { t: "error", reason: "Already in a match." });
    const p = this.store.getById(uid);
    if (!p) return;
    if (!this.matchmaker.enqueue(uid, p.elo)) return; // already queued
    send(ctx, { t: "queued", sinceMs: Date.now() });
    this.runMatchmaking();
  }

  private onCancelQueue(ctx: Ctx): void {
    const uid = ctx.userId;
    if (!uid) return;
    this.matchmaker.remove(uid);
    send(ctx, { t: "queueCancelled" });
  }

  private runMatchmaking(): void {
    for (const [a, b] of this.matchmaker.pair()) this.createMatch(a.userId, b.userId, true);
  }

  /** Build a match between two users, register it, attach both, and notify them. */
  private createMatch(aId: string, bId: string, ranked: boolean): void {
    const pa = this.store.getById(aId);
    const pb = this.store.getById(bId);
    if (!pa || !pb) return;
    // Randomize who takes seat 0 (the opening claim) for fairness.
    const [s0, s1] = Math.random() < 0.5 ? [pa, pb] : [pb, pa];
    const match = new Match({
      players: [
        { userId: s0.id, handle: s0.handle, elo: s0.elo },
        { userId: s1.id, handle: s1.handle, elo: s1.elo },
      ],
      clockSeconds: RANKED_CLOCK_SECONDS,
      ranked,
      store: this.store,
      onEnd: (id) => this.onMatchEnd(id),
    });
    this.matches.set(match.id, match);
    this.userToMatch.set(s0.id, match.id);
    this.userToMatch.set(s1.id, match.id);
    for (const seat of [0, 1] as PlayerId[]) {
      const uid = seat === 0 ? s0.id : s1.id;
      match.attach(seat, this.routeFn(uid));
      this.sendMatchFound(uid, match);
    }
    this.notifyPresence(s0.id); // both now "in-game" — refresh friends' lists
    this.notifyPresence(s1.id);
  }

  private sendMatchFound(userId: string, match: Match): void {
    const seat = match.seatOf(userId) as PlayerId;
    this.sendToUser(userId, {
      t: "matchFound",
      matchId: match.id,
      youAre: seat,
      opponent: match.opponentInfo(seat),
      clockSeconds: match.clockSeconds,
      ranked: match.ranked,
      state: match.getState(),
      clocks: match.getClocks(),
    });
  }

  private maybeRejoinMatch(userId: string): void {
    const m = this.activeMatch(userId);
    if (!m) return;
    m.attach(m.seatOf(userId) as PlayerId, this.routeFn(userId));
    this.sendMatchFound(userId, m);
  }

  // ─── Friends & presence ─────────────────────────────────────────────────────
  private presenceOf(userId: string): "offline" | "online" | "in-game" {
    if (this.userToMatch.has(userId)) return "in-game";
    if (this.userToConn.has(userId)) return "online";
    return "offline";
  }

  private friendInfo(userId: string): { userId: string; handle: string; elo: number; presence: "offline" | "online" | "in-game" } | null {
    const p = this.store.getById(userId);
    if (!p) return null;
    return { userId: p.id, handle: p.handle, elo: p.elo, presence: this.presenceOf(userId) };
  }

  private pushFriends(userId: string): void {
    if (!this.userToConn.has(userId)) return; // only push to a live socket
    const p = this.store.getById(userId);
    if (!p) return;
    const map = (ids: string[]) => ids.map((id) => this.friendInfo(id)).filter((x): x is NonNullable<typeof x> => !!x);
    this.sendToUser(userId, { t: "friends", friends: map(p.friends), reqIn: map(p.reqIn), reqOut: map(p.reqOut) });
  }

  /** Refresh this user's own list and every online friend's list (presence ripples out). */
  private notifyPresence(userId: string): void {
    this.pushFriends(userId);
    const p = this.store.getById(userId);
    if (!p) return;
    for (const fid of p.friends) if (this.userToConn.has(fid)) this.pushFriends(fid);
  }

  private onAddFriend(ctx: Ctx, msg: Extract<ClientMsg, { t: "addFriend" }>): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const target = this.store.getByHandle((msg.handle ?? "").trim());
    if (!target) return send(ctx, { t: "error", reason: "No player with that handle." });
    const res = this.store.friendRequest(uid, target.id);
    if (!res.ok) return send(ctx, { t: "error", reason: res.error ?? "Could not send request." });
    this.pushFriends(uid);
    this.pushFriends(target.id);
  }

  private onFriendOp(ctx: Ctx, op: "accept" | "decline" | "remove", otherId: string): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    if (op === "accept") this.store.acceptFriend(uid, otherId);
    else if (op === "decline") this.store.declineFriend(uid, otherId);
    else this.store.removeFriend(uid, otherId);
    this.pushFriends(uid);
    this.pushFriends(otherId);
  }

  private onInvite(ctx: Ctx, friendId: string): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const me = this.store.getById(uid);
    if (!me || !me.friends.includes(friendId)) return send(ctx, { t: "error", reason: "Not your friend." });
    if (this.activeMatch(uid)) return send(ctx, { t: "error", reason: "You're already in a match." });
    if (this.presenceOf(friendId) !== "online") return send(ctx, { t: "error", reason: "That friend isn't available." });
    this.sendToUser(friendId, { t: "invited", from: { userId: uid, handle: me.handle } });
  }

  private onAcceptInvite(ctx: Ctx, fromUserId: string): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const me = this.store.getById(uid);
    if (!me || !me.friends.includes(fromUserId)) return send(ctx, { t: "error", reason: "Not your friend." });
    if (this.activeMatch(uid) || this.activeMatch(fromUserId))
      return send(ctx, { t: "error", reason: "Someone is already in a match." });
    if (this.presenceOf(fromUserId) === "offline") return send(ctx, { t: "error", reason: "They went offline." });
    this.matchmaker.remove(uid);
    this.matchmaker.remove(fromUserId);
    this.createMatch(fromUserId, uid, false); // casual: no Elo
  }

  private onDeclineInvite(ctx: Ctx, fromUserId: string): void {
    const uid = ctx.userId;
    if (!uid) return;
    const me = this.store.getById(uid);
    this.sendToUser(fromUserId, { t: "inviteDeclined", handle: me?.handle ?? "Your friend" });
  }

  // ─── In-match messages ──────────────────────────────────────────────────────
  private onMatchMsg(ctx: Ctx, msg: Extract<ClientMsg, { t: "act" | "resign" | "leaveMatch" }>): void {
    const uid = this.requireUser(ctx);
    if (!uid) return;
    const m = this.activeMatch(uid);
    if (!m) return send(ctx, { t: "error", reason: "Not in a match." });
    const seat = m.seatOf(uid) as PlayerId;
    if (msg.t === "act") m.act(seat, msg.action);
    else if (msg.t === "resign") m.resign(seat);
    else m.leave(seat);
  }

  private onMatchEnd(matchId: string): void {
    const m = this.matches.get(matchId);
    if (m) m.publicUsersAfter(); // push refreshed ratings/records to both clients
    this.matches.delete(matchId);
    const affected: string[] = [];
    for (const [uid, id] of this.userToMatch) if (id === matchId) affected.push(uid);
    for (const uid of affected) this.userToMatch.delete(uid);
    for (const uid of affected) this.notifyPresence(uid); // back to "online" — refresh friends
  }
}

function send(ctx: Ctx, msg: ServerMsg): void {
  if (ctx.ws.readyState === ctx.ws.OPEN) ctx.ws.send(JSON.stringify(msg));
}
