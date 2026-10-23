// Shop tournaments — DATA. A bracket is a sequence of AI duels vs ascending-skill ROSTER opponents;
// the store orchestrates the matches (one PRISM duel per round) and applies the rewards. Repeatable
// once the FNM story beat is cleared. (Bigger regional/national events are Act II+ — deferred.)

import { LocationId } from "../career/types";

export interface TournamentDef {
  id: string;
  name: string;
  venue: LocationId;
  entryFee: number;
  rounds: { opponentId: string }[]; // ROSTER ids, ascending difficulty
  prizeMoneyPerWin: number;
  prizeFamePerWin: number;
  championBonusMoney: number;
  championFame: number;
  championPack?: string; // pack id awarded for winning the whole thing
  reqFame?: number; // gated by scene reputation
}

export const TOURNAMENTS: TournamentDef[] = [
  {
    id: "fnm",
    name: "Friday Night PRISM",
    venue: "shop",
    entryFee: 5,
    rounds: [{ opponentId: "nan" }, { opponentId: "bram" }, { opponentId: "cora" }],
    prizeMoneyPerWin: 4,
    prizeFamePerWin: 2,
    championBonusMoney: 14,
    championFame: 6,
    championPack: "pr1_booster",
  },
  {
    id: "shopcup",
    name: "Pip's Shop Cup",
    venue: "shop",
    entryFee: 12,
    rounds: [{ opponentId: "vex" }, { opponentId: "rook" }, { opponentId: "iris" }, { opponentId: "dane" }],
    prizeMoneyPerWin: 7,
    prizeFamePerWin: 3,
    championBonusMoney: 30,
    championFame: 12,
    championPack: "pr1_booster",
    reqFame: 12,
  },
];

export function getTournament(id: string): TournamentDef {
  const t = TOURNAMENTS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tournament: ${id}`);
  return t;
}
