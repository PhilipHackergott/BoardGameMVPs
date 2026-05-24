// Wire protocol shared by the web client and the authoritative server.
// One definition, imported by both (the server imports this file directly from app/),
// so the message shapes can never drift apart.
//
// Transport: a single WebSocket per client carrying JSON messages. A client first
// authenticates (signup / login / resume), then may queue for a ranked match and play.

import type { Action, GameState, PlayerId, Result } from "../engine";

/** A player's public-facing record (never includes the password hash). */
export interface PublicUser {
  id: string;
  handle: string;
  email: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
}

/** What you're told about your opponent in a match. */
export interface OpponentInfo {
  handle: string;
  elo: number;
}

export type Presence = "offline" | "online" | "in-game";

/** A friend / friend-request entry, with live presence. */
export interface FriendInfo {
  userId: string;
  handle: string;
  elo: number;
  presence: Presence;
}

/** Per-seat remaining thinking time (ms), index = PlayerId. */
export type Clocks = number[];

// ─── Client → Server ─────────────────────────────────────────────────────────
export type ClientMsg =
  // auth & account
  | { t: "signup"; email: string; handle: string; password: string }
  | { t: "login"; email: string; password: string }
  | { t: "resume"; token: string }
  | { t: "logout" }
  | { t: "updateAccount"; handle?: string; email?: string }
  | { t: "changePassword"; oldPassword: string; newPassword: string }
  | { t: "deleteAccount"; password: string }
  // ranked matchmaking
  | { t: "findMatch" }
  | { t: "cancelQueue" }
  // friends & invites
  | { t: "addFriend"; handle: string }
  | { t: "acceptFriend"; userId: string }
  | { t: "declineFriend"; userId: string }
  | { t: "removeFriend"; userId: string }
  | { t: "invite"; userId: string }
  | { t: "acceptInvite"; fromUserId: string }
  | { t: "declineInvite"; fromUserId: string }
  // in-match
  | { t: "act"; action: Action }
  | { t: "resign" }
  | { t: "leaveMatch" }
  | { t: "ping" };

// ─── Server → Client ─────────────────────────────────────────────────────────
export type ServerMsg =
  // auth & account
  | { t: "authOk"; token: string; user: PublicUser }
  | { t: "authErr"; reason: string }
  | { t: "accountUpdated"; user: PublicUser }
  | { t: "loggedOut" }
  // matchmaking
  | { t: "queued"; sinceMs: number }
  | { t: "queueCancelled" }
  | {
      t: "matchFound";
      matchId: string;
      youAre: PlayerId;
      opponent: OpponentInfo;
      clockSeconds: number;
      ranked: boolean; // false = casual game with a friend
      state: GameState;
      clocks: Clocks;
    }
  // friends & invites
  | { t: "friends"; friends: FriendInfo[]; reqIn: FriendInfo[]; reqOut: FriendInfo[] }
  | { t: "invited"; from: { userId: string; handle: string } }
  | { t: "inviteDeclined"; handle: string }
  // in-match
  | { t: "state"; matchId: string; state: GameState; clocks: Clocks; current: PlayerId }
  | { t: "clocks"; matchId: string; clocks: Clocks; current: PlayerId }
  | { t: "opponentDisconnected"; graceMs: number }
  | { t: "opponentReconnected" }
  | {
      t: "matchOver";
      matchId: string;
      result: Result;
      youWon: boolean | null; // null = draw
      reason: "completed" | "resign" | "timeout" | "abandon";
      eloChange: number;
      newElo: number;
    }
  // generic
  | { t: "error"; reason: string }
  | { t: "pong" };

// Validation bounds shared by client (pre-check) and server (authoritative).
export const HANDLE_MIN = 2;
export const HANDLE_MAX = 16;
export const HANDLE_RE = /^[A-Za-z0-9_]{2,16}$/;
export const PASSWORD_MIN = 8;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
