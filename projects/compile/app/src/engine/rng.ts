// Deterministic PRNG (mulberry32). The generator state is a single uint32 carried on GameState so
// shuffles/draws are reproducible from a seed. This is the only randomness in the engine.

export function rngNext(state: number): { value: number; state: number } {
  let a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a >>> 0 };
}

export function shuffle<T>(arr: readonly T[], state: number): { arr: T[]; state: number } {
  const out = arr.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = rngNext(s);
    s = r.state;
    const j = Math.floor(r.value * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return { arr: out, state: s };
}

export function seedFromString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
