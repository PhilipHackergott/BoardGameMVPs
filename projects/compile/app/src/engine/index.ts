// Public engine surface. The UI imports from here; it never reaches into individual modules so the
// internals (effect runtime, AI, field math) can change without touching the presentation layer.

export * from "./types";
export { Engine, newGame, draftPick, draftTurn, legalActions, passiveActive } from "./game";
export {
  cardValue,
  lineValue,
  linesLed,
  compilableLines,
  uncovered,
  opponent,
  hasWon,
} from "./field";
export { getDef, CARD_DEFS, protocolDefIds } from "./cards";
