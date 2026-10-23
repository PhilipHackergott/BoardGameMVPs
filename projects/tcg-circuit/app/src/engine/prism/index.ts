// Public API of the PRISM duel engine. UI / render / AI / sim import from here.
export * from "./types";
export { createDuel } from "./setup";
export type { DuelConfig } from "./setup";
export { reduce, checkWin, hasKw, cloneDuel } from "./reduce";
export { legalMoves, deployIllegalReason } from "./legalMoves";
export { evaluate, NEUTRAL_PERSONA } from "./evaluate";
export type { Persona } from "./evaluate";
