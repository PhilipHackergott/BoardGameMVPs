// Deterministic game setup: seeded scatter of the stars.

import { makeRng } from "./rng";
import type { PowerId } from "./powers";
import { DEFAULT_CONFIG, type GameConfig, type GameState, type PlayerId, type Star } from "./types";

// A config for N players keeping 12 pawns total (2→6, 3→4, 4→3 each).
export function makeConfig(players: number): GameConfig {
  const p = Math.max(2, Math.min(4, Math.round(players)));
  return { ...DEFAULT_CONFIG, players: p, beaconsPerPlayer: 12 / p };
}

// Placement sequence: plain round-robin for every player count — 0,1,…,n-1
// repeated each round (no snake/boustrophedon; every round runs in seat order).
export function placementOrder(players: number, perPlayer: number): PlayerId[] {
  const order: PlayerId[] = [];
  for (let r = 0; r < perPlayer; r++) {
    for (let i = 0; i < players; i++) order.push(i);
  }
  return order;
}

export function createGame(
  seed: number,
  config: GameConfig = DEFAULT_CONFIG,
  startInSetup = false,
  powers: PowerId[][] = [],
  affinity: (number | null)[] = [],
): GameState {
  const rng = makeRng(seed);
  const total = config.colors * config.perColor;
  const placeR = config.fieldR - config.edgeInset - config.starR;
  const minDist2 = config.minCenterDist * config.minCenterDist;

  const positions: { x: number; y: number }[] = [];
  let guard = 0;
  const maxAttempts = total * 2000;
  while (positions.length < total) {
    if (++guard > maxAttempts) {
      throw new Error(
        `setup: could not place ${total} stars (placed ${positions.length}). ` +
          `Loosen minCenterDist or grow fieldR.`,
      );
    }
    // Uniform sample within a disc of radius placeR.
    const r = Math.sqrt(rng.next()) * placeR;
    const theta = rng.next() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    let ok = true;
    for (const p of positions) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < minDist2) {
        ok = false;
        break;
      }
    }
    if (ok) positions.push({ x, y });
  }

  // Assign colors: perColor of each, then shuffle the color labels across positions
  // (Fisher–Yates with the same seeded rng) so colors are spatially mixed.
  const colorBag: number[] = [];
  for (let c = 0; c < config.colors; c++) {
    for (let k = 0; k < config.perColor; k++) colorBag.push(c);
  }
  for (let i = colorBag.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [colorBag[i], colorBag[j]] = [colorBag[j], colorBag[i]];
  }

  const stars: Star[] = positions.map((p, i) => ({
    id: i,
    color: colorBag[i],
    x: p.x,
    y: p.y,
  }));

  const collected: number[][] = Array.from({ length: config.players }, () =>
    new Array(config.colors).fill(0),
  );

  // Nomad always leads: build the order over a seat permutation with Nomad(s) first.
  const seats: PlayerId[] = [];
  for (let p = 0; p < config.players; p++) if ((powers[p] ?? []).includes("nomad")) seats.push(p);
  for (let p = 0; p < config.players; p++) if (!(powers[p] ?? []).includes("nomad")) seats.push(p);
  let order = placementOrder(config.players, config.beaconsPerPlayer).map((i) => seats[i]);

  // Procrastinator starts a turn later: move their first slot to the end of the order.
  for (let p = 0; p < config.players; p++) {
    if ((powers[p] ?? []).includes("procrastinator")) {
      const i = order.indexOf(p);
      if (i >= 0) order = [...order.slice(0, i), ...order.slice(i + 1), p];
    }
  }

  // Nomad now claims a starting flower like everyone else (the skip was a pure cost).
  const phase = startInSetup ? "setup" : "play";

  return {
    config,
    seed,
    stars,
    beacons: [],
    collected,
    current: phase === "setup" ? 0 : order[0],
    order,
    turnIndex: 0,
    passesInARow: 0,
    phase,
    log: [],
    powers: Array.from({ length: config.players }, (_, p) => powers[p] ?? []),
    barriers: [],
    flexPassUsed: new Array(config.players).fill(false),
    flexExtraUsed: new Array(config.players).fill(false),
    patronUsed: new Array(config.players).fill(false),
    freePicks: [],
    lastPlace: null,
    catalystUsed: new Array(config.players).fill(false),
    phantomNext: new Array(config.players).fill(false),
    nomadUsed: new Array(config.players).fill(false),
    repelOrigin: null,
    affinity: Array.from({ length: config.players }, (_, p) => affinity[p] ?? null),
    frozenStars: [],
    duskPending: false,
    abyssPending: false,
    bonusBeacons: new Array(config.players).fill(0),
    momentumColor: new Array(config.players).fill(null),
    momentumStreak: new Array(config.players).fill(0),
    finalByColor: null,
    colorWinners: null,
    discarded: 0,
    result: null,
    territory: null,
  };
}
