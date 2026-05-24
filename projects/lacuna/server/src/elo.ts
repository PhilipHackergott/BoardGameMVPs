// Reuse the exact Elo math already written + unit-tested for the RL ladder, so trained CPU
// opponents and live humans share one rating scale (baseline 1000).
export { updateElo, expectedScore } from "../../app/src/rl/elo.ts";

export const ELO_K = 32; // standard incremental K-factor for ranked games
