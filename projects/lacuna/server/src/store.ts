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
