// Persistence: a tiny JSON-file store for player accounts + finished-match history.
// Self-contained (no external DB/service). All state lives in server/data/. Single-threaded
// Node + write-through-on-mutation with atomic temp-file rename keeps it simple and safe at
// prototype scale; swap this module for Postgres later without touching callers.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Result } from "../../app/src/engine/index.ts";
import type { PublicUser } from "../../app/src/net/protocol.ts";

export interface PlayerRecord {
  id: string;
  email: string; // stored lowercased; unique
  handle: string; // unique (case-insensitive)
  passHash: string; // hex (scrypt)
  passSalt: string; // hex
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  friends: string[]; // accepted friend user-ids
  reqIn: string[]; // incoming friend requests (their user-ids)
  reqOut: string[]; // outgoing friend requests (their user-ids)
}

export interface MatchRecord {
  id: string;
  ts: number;
  mode: "ranked";
  seed: number;
  result: Result;
  reason: string;
  players: { id: string; handle: string; seat: number; eloBefore: number; eloAfter: number }[];
}

const STARTING_ELO = 1000; // matches rl/matchmaking baseline + fitElo anchorMean

function atomicWriteJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, path);
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export class Store {
  private playersPath: string;
  private matchesPath: string;
  private players: PlayerRecord[];
  private matches: MatchRecord[];

  constructor(dataDir: string) {
    this.playersPath = join(dataDir, "players.json");
    this.matchesPath = join(dataDir, "matches.json");
    this.players = readJson<PlayerRecord[]>(this.playersPath, []);
    this.matches = readJson<MatchRecord[]>(this.matchesPath, []);
    // Migrate older records that predate the friends fields.
    for (const p of this.players) {
      p.friends ??= [];
      p.reqIn ??= [];
      p.reqOut ??= [];
    }
  }

  private savePlayers(): void {
    atomicWriteJson(this.playersPath, this.players);
  }
  private saveMatches(): void {
    atomicWriteJson(this.matchesPath, this.matches);
  }

  getByEmail(email: string): PlayerRecord | undefined {
    const e = email.toLowerCase();
    return this.players.find((p) => p.email === e);
  }
  getByHandle(handle: string): PlayerRecord | undefined {
    const h = handle.toLowerCase();
    return this.players.find((p) => p.handle.toLowerCase() === h);
  }
  getById(id: string): PlayerRecord | undefined {
    return this.players.find((p) => p.id === id);
  }

  createPlayer(input: { email: string; handle: string; passHash: string; passSalt: string }): PlayerRecord {
    const rec: PlayerRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      handle: input.handle,
      passHash: input.passHash,
      passSalt: input.passSalt,
      elo: STARTING_ELO,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: Date.now(),
      friends: [],
      reqIn: [],
      reqOut: [],
    };
    this.players.push(rec);
    this.savePlayers();
    return rec;
  }

  updatePlayer(id: string, patch: Partial<PlayerRecord>): PlayerRecord | undefined {
    const p = this.getById(id);
    if (!p) return undefined;
    Object.assign(p, patch);
    this.savePlayers();
    return p;
  }

  deletePlayer(id: string): boolean {
    const i = this.players.findIndex((p) => p.id === id);
    if (i < 0) return false;
    this.players.splice(i, 1);
    this.savePlayers();
    return true;
  }

  // ─── Friends ────────────────────────────────────────────────────────────────
  /** Record an outgoing friend request from -> to (idempotent). */
  friendRequest(fromId: string, toId: string): { ok: boolean; error?: string } {
    const from = this.getById(fromId);
    const to = this.getById(toId);
    if (!from || !to) return { ok: false, error: "User not found." };
    if (fromId === toId) return { ok: false, error: "You can't friend yourself." };
    if (from.friends.includes(toId)) return { ok: false, error: "Already friends." };
    if (to.reqIn.includes(fromId)) return { ok: false, error: "Request already sent." };
    // If they already requested us, accept instead of duplicating.
    if (from.reqIn.includes(toId)) {
      this.acceptFriend(fromId, toId);
      return { ok: true };
    }
    if (!from.reqOut.includes(toId)) from.reqOut.push(toId);
    if (!to.reqIn.includes(fromId)) to.reqIn.push(fromId);
    this.savePlayers();
    return { ok: true };
  }

  acceptFriend(userId: string, fromId: string): boolean {
    const me = this.getById(userId);
    const them = this.getById(fromId);
    if (!me || !them) return false;
    me.reqIn = me.reqIn.filter((id) => id !== fromId);
    them.reqOut = them.reqOut.filter((id) => id !== userId);
    if (!me.friends.includes(fromId)) me.friends.push(fromId);
    if (!them.friends.includes(userId)) them.friends.push(userId);
    this.savePlayers();
    return true;
  }

  declineFriend(userId: string, fromId: string): void {
    const me = this.getById(userId);
    const them = this.getById(fromId);
    if (me) {
      me.reqIn = me.reqIn.filter((id) => id !== fromId);
      me.reqOut = me.reqOut.filter((id) => id !== fromId);
    }
    if (them) {
      them.reqOut = them.reqOut.filter((id) => id !== userId);
      them.reqIn = them.reqIn.filter((id) => id !== userId);
    }
    this.savePlayers();
  }

  removeFriend(userId: string, otherId: string): void {
    const me = this.getById(userId);
    const them = this.getById(otherId);
    if (me) me.friends = me.friends.filter((id) => id !== otherId);
    if (them) them.friends = them.friends.filter((id) => id !== userId);
    this.savePlayers();
  }

  addMatch(rec: MatchRecord): void {
    this.matches.unshift(rec);
    if (this.matches.length > 5000) this.matches.length = 5000;
    this.saveMatches();
  }

  /** Top-N by Elo (for a leaderboard). */
  leaderboard(limit = 50): PublicUser[] {
    return [...this.players]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
      .map(toPublicUser);
  }
}

export function toPublicUser(p: PlayerRecord): PublicUser {
  return {
    id: p.id,
    handle: p.handle,
    email: p.email,
    elo: p.elo,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
    games: p.wins + p.losses + p.draws,
  };
}

export { STARTING_ELO };
