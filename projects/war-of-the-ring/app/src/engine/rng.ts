// Deterministic PRNG (mulberry32) — the ONLY source of randomness in the engine, so a game is
// fully reproducible from { config, seed, action-log }. State is a single uint32 carried in
// GameState.rngState and threaded through every action. (Copied from the Magical Athlete pattern.)

export interface Rng {
  next(): number; // float in [0, 1)
  int(maxExclusive: number): number; // integer in [0, maxExclusive)
  die(): number; // integer in [1, 6]
  state(): number; // current serializable state
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    die: () => 1 + Math.floor(next() * 6),
    state: () => a >>> 0,
  };
}

/** Roll `n` combat/action dice [1..6], returning the rolls. Threads rng state. */
export function rollDice(rng: Rng, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rng.die());
  return out;
}

/** Fisher–Yates shuffle returning a new array (does not mutate input). */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
