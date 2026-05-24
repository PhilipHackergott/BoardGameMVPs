// Deterministic PRNG (mulberry32), written in a *pure functional* style: the generator
// state is a single uint32 carried inside RunState, so every reducer stays pure and a run
// is exactly reproducible from { seed, action-log }. This is the ONLY randomness in the engine.

export interface Roll {
  value: number; // float in [0, 1)
  state: number; // next generator state (uint32)
}

/** Advance the generator one step. Pure: same input state -> same output. */
export function rngNext(state: number): Roll {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a >>> 0 };
}

/** Integer in [0, n). */
export function rngInt(state: number, n: number): { value: number; state: number } {
  const r = rngNext(state);
  return { value: Math.floor(r.value * n), state: r.state };
}

/** Fisher-Yates shuffle returning a NEW array plus the advanced generator state. */
export function shuffle<T>(arr: readonly T[], state: number): { arr: T[]; state: number } {
  const out = arr.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = rngInt(s, i + 1);
    s = r.state;
    const j = r.value;
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { arr: out, state: s };
}

/** Hash an arbitrary seed string to a uint32 generator state (xfnv1a-ish). */
export function seedFromString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // a couple of extra mixes so short seeds spread out
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
