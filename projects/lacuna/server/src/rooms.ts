// An authoritative ranked match. The server owns the game state: it runs the SAME pure
// engine the client does, validates every action (the engine throws on anything illegal),
// keeps the chess clock, handles disconnect/reconnect, and settles Elo when the game ends.

import { randomUUID } from "node:crypto";
import {
  applyAction,
  createGame,
  makeConfig,
} from "../../app/src/engine/index.ts";
import type { Action, GameState, PlayerId, Result } from "../../app/src/engine/index.ts";
import type { Clocks, ServerMsg } from "../../app/src/net/protocol.ts";
import { ELO_K, updateElo } from "./elo.ts";
import { type Store, toPublicUser } from "./store.ts";

export type Send = (msg: ServerMsg) => void;
type EndReason = "completed" | "resign" | "timeout" | "abandon";

interface Seat {
  userId: string;
  handle: string;
  eloBefore: number;
  send: Send | null; // null while disconnected
  graceTimer: ReturnType<typeof setTimeout> | null;
}

const CLOCK_TICK_MS = 250;
const CLOCK_BROADCAST_MS = 1000;
const DISCONNECT_GRACE_MS = 45_000;

export interface MatchPlayerInit {
  userId: string;
  handle: string;
  elo: number;
}

export class Match {
  readonly id = randomUUID();
  readonly clockSeconds: number;
  readonly seed: number;
  private state: GameState;
  private seats: [Seat, Seat];
  private clocks: Clocks;
  private store: Store;
  private onEnd: (matchId: string) => void;

  private ticker: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private lastClockBroadcast = 0;
  private ended = false;

  constructor(opts: {
    players: [MatchPlayerInit, MatchPlayerInit]; // index = seat
    clockSeconds: number;
    store: Store;
    onEnd: (matchId: string) => void;
  }) {
    this.clockSeconds = opts.clockSeconds;
    this.store = opts.store;
    this.onEnd = opts.onEnd;
    this.seed = (Math.random() * 0xffffffff) >>> 0;

    // Base game (powers/affinities cut): empty power/affinity slots, start in setup so seat 0
    // takes the opening flower exactly like local play.
    this.state = createGame(this.seed, makeConfig(2), true, [[], []], [null, null]);
    this.clocks = [this.clockSeconds * 1000, this.clockSeconds * 1000];
    this.seats = [
      { ...seatFrom(opts.players[0]) },
      { ...seatFrom(opts.players[1]) },
    ];

    this.startClock();
  }

  // ─── Identity / lookup helpers ──────────────────────────────────────────────
  seatOf(userId: string): PlayerId | -1 {
    if (this.seats[0].userId === userId) return 0;
    if (this.seats[1].userId === userId) return 1;
    return -1;
  }
  opponentInfo(seat: PlayerId): { handle: string; elo: number } {
    const o = this.seats[other(seat)];
    return { handle: o.handle, elo: o.eloBefore };
  }
  getState(): GameState {
    return this.state;
  }
  getClocks(): Clocks {
    return this.clocks;
  }

  // ─── Connection lifecycle ─────────────────────────────────────────────────--
  attach(seat: PlayerId, send: Send): void {
    const s = this.seats[seat];
    const wasDisconnected = s.send === null;
    s.send = send;
    if (s.graceTimer) {
      clearTimeout(s.graceTimer);
      s.graceTimer = null;
    }
    if (wasDisconnected && !this.ended) this.send(other(seat), { t: "opponentReconnected" });
  }

  detach(seat: PlayerId): void {
    const s = this.seats[seat];
    s.send = null;
    if (this.ended) return;
    this.send(other(seat), { t: "opponentDisconnected", graceMs: DISCONNECT_GRACE_MS });
    s.graceTimer = setTimeout(() => this.endMatch(other(seat), "abandon"), DISCONNECT_GRACE_MS);
  }

  // ─── Gameplay ─────────────────────────────────────────────────────────────--
  act(seat: PlayerId, action: Action): void {
    if (this.ended) return;
    if (this.state.current !== seat) {
      this.send(seat, { t: "error", reason: "Not your turn." });
      return;
    }
    let next: GameState;
    try {
      next = applyAction(this.state, action);
    } catch (err) {
      this.send(seat, { t: "error", reason: err instanceof Error ? err.message : "Illegal move." });
      return;
    }
    this.state = next;
    this.lastTick = Date.now(); // the mover's time stops the instant the move lands
    if (next.phase === "ended") {
      this.broadcastState(); // let both clients render the final board + harvest…
      this.endMatch(next.result ?? "draw", "completed"); // …then settle Elo + notify
    } else {
      this.broadcastState();
    }
  }

  resign(seat: PlayerId): void {
    if (this.ended) return;
    this.endMatch(other(seat), "resign");
  }

  /** A player explicitly leaves an active match — treated as a resignation. */
  leave(seat: PlayerId): void {
    if (this.ended) return;
    this.endMatch(other(seat), "abandon");
  }

  // ─── Clock ────────────────────────────────────────────────────────────────--
  private startClock(): void {
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), CLOCK_TICK_MS);
  }

  private tick(): void {
    if (this.ended) return;
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    const cur = this.state.current;
    this.clocks[cur] = Math.max(0, this.clocks[cur] - dt);
    if (this.clocks[cur] <= 0) {
      this.endMatch(other(cur), "timeout");
      return;
    }
    if (now - this.lastClockBroadcast >= CLOCK_BROADCAST_MS) {
      this.lastClockBroadcast = now;
      this.broadcast({ t: "clocks", matchId: this.id, clocks: this.clocks, current: cur });
    }
  }

  // ─── End + Elo settlement ───────────────────────────────────────────────────
  private endMatch(result: Result, reason: EndReason): void {
    if (this.ended) return;
    this.ended = true;
    if (this.ticker) clearInterval(this.ticker);
    for (const s of this.seats) if (s.graceTimer) clearTimeout(s.graceTimer);

    const e0 = this.seats[0].eloBefore;
    const e1 = this.seats[1].eloBefore;
    const score0 = result === 0 ? 1 : result === "draw" ? 0.5 : 0;
    const [new0, new1] = updateElo(e0, e1, score0, ELO_K).map(Math.round) as [number, number];

    this.settlePlayer(0, new0, result);
    this.settlePlayer(1, new1, result);

    this.store.addMatch({
      id: this.id,
      ts: Date.now(),
      mode: "ranked",
      seed: this.seed,
      result,
      reason,
      players: [
        { id: this.seats[0].userId, handle: this.seats[0].handle, seat: 0, eloBefore: e0, eloAfter: new0 },
        { id: this.seats[1].userId, handle: this.seats[1].handle, seat: 1, eloBefore: e1, eloAfter: new1 },
      ],
    });

    for (const seat of [0, 1] as PlayerId[]) {
      const newElo = seat === 0 ? new0 : new1;
      const before = seat === 0 ? e0 : e1;
      const youWon = result === "draw" ? null : result === seat;
      this.send(seat, {
        t: "matchOver",
        matchId: this.id,
        result,
        youWon,
        reason,
        eloChange: newElo - before,
        newElo,
      });
    }
    this.onEnd(this.id);
  }

  private settlePlayer(seat: PlayerId, newElo: number, result: Result): void {
    const s = this.seats[seat];
    const p = this.store.getById(s.userId);
    if (!p) return;
    const won = result !== "draw" && result === seat;
    const drew = result === "draw";
    this.store.updatePlayer(s.userId, {
      elo: newElo,
      wins: p.wins + (won ? 1 : 0),
      losses: p.losses + (!won && !drew ? 1 : 0),
      draws: p.draws + (drew ? 1 : 0),
    });
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────--
  private broadcastState(): void {
    this.broadcast({
      t: "state",
      matchId: this.id,
      state: this.state,
      clocks: this.clocks,
      current: this.state.current,
    });
  }
  private broadcast(msg: ServerMsg): void {
    this.seats[0].send?.(msg);
    this.seats[1].send?.(msg);
  }
  private send(seat: PlayerId, msg: ServerMsg): void {
    this.seats[seat].send?.(msg);
  }

  /** For the server's introspection (e.g., public-user refresh after settlement). */
  publicUsersAfter(): void {
    for (const s of this.seats) {
      const p = this.store.getById(s.userId);
      if (p && s.send) s.send({ t: "accountUpdated", user: toPublicUser(p) });
    }
  }
}

function seatFrom(p: MatchPlayerInit): Seat {
  return { userId: p.userId, handle: p.handle, eloBefore: p.elo, send: null, graceTimer: null };
}
function other(seat: PlayerId): PlayerId {
  return (seat === 0 ? 1 : 0) as PlayerId;
}
