// Balance harness core (tcg-design §4.4) — the AI is the balance instrument. Headless AI-vs-AI:
//   • archetype win-rate matrix (every deck vs every other, seats alternated to cancel play/draw)
//   • a skill-monotonicity sweep (higher skill must beat lower, pairwise + smoothly)
// Pure + deterministic. Driven by tests/sim/balance.test.ts (`npm run sim`).

import { playMatch } from "../ai/match";
import { DECKS, expandDeck, getDeck } from "../engine/content/decks";
import { PERSONAS } from "../engine/content/opponents";
import { Archetype } from "../engine/content/decks";

const personaForArchetype: Record<Archetype, keyof typeof PERSONAS> = {
  aggro: "aggro",
  tempo: "tempo",
  ramp: "ramp",
  attrition: "attrition",
  lockdown: "lockdown",
  midrange: "midrange",
  control: "control",
};

function personaOf(deckId: string) {
  return PERSONAS[personaForArchetype[getDeck(deckId).archetype]];
}

export interface MatrixResult {
  ids: string[];
  names: string[];
  table: number[][]; // table[i][j] = win rate of deck i vs deck j
  overall: { id: string; name: string; winRate: number }[];
}

/** Every deck vs every other, `games` per pairing (seats alternated). Excludes the mirror. */
export function winRateMatrix(deckIds: string[], games: number, skill = 0.6): MatrixResult {
  const n = deckIds.length;
  const table: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const wins = Array(n).fill(0);
  const played = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        table[i][j] = 0.5;
        continue;
      }
      const a = expandDeck(getDeck(deckIds[i]));
      const b = expandDeck(getDeck(deckIds[j]));
      const pa = personaOf(deckIds[i]);
      const pb = personaOf(deckIds[j]);
      let iWins = 0;
      for (let g = 0; g < games; g++) {
        const first = (g % 2) as 0 | 1; // alternate who's on the play
        const r = playMatch({
          deckA: a, deckB: b, skillA: skill, skillB: skill,
          personaA: pa, personaB: pb, seed: `m-${i}-${j}-${g}`, firstPlayer: first,
        });
        if (r.winner === 0) iWins++;
      }
      table[i][j] = iWins / games;
      wins[i] += iWins;
      played[i] += games;
    }
  }
  const overall = deckIds.map((id, i) => ({
    id,
    name: getDeck(id).name,
    winRate: played[i] ? wins[i] / played[i] : 0.5,
  }));
  return { ids: deckIds, names: deckIds.map((d) => getDeck(d).name), table, overall };
}

/** Mirror-match a deck at two skills, alternating seats; return the higher-skill seat's win rate. */
export function ladderPair(deckId: string, lo: number, hi: number, games: number): number {
  const list = expandDeck(getDeck(deckId));
  const persona = personaOf(deckId);
  let hiWins = 0;
  for (let g = 0; g < games; g++) {
    const hiOnA = g % 2 === 0;
    const r = playMatch({
      deckA: list, deckB: list,
      skillA: hiOnA ? hi : lo,
      skillB: hiOnA ? lo : hi,
      personaA: persona, personaB: persona,
      seed: `ladder-${deckId}-${lo}-${hi}-${g}`,
      firstPlayer: (g % 2) as 0 | 1,
    });
    if ((hiOnA && r.winner === 0) || (!hiOnA && r.winner === 1)) hiWins++;
  }
  return hiWins / games;
}

export function allDeckIds(): string[] {
  return DECKS.map((d) => d.id);
}

/** MCTS-vs-greedy at EQUAL skill (mirror deck, seats alternated): the MCTS win rate. >0.5 ⇒ stronger. */
export function mctsVsGreedy(deckId: string, skill: number, games: number): number {
  const list = expandDeck(getDeck(deckId));
  const persona = personaOf(deckId);
  let mctsWins = 0;
  for (let g = 0; g < games; g++) {
    const mctsOnA = g % 2 === 0;
    const r = playMatch({
      deckA: list, deckB: list, skillA: skill, skillB: skill, personaA: persona, personaB: persona,
      policyA: mctsOnA ? "mcts" : "greedy", policyB: mctsOnA ? "greedy" : "mcts",
      seed: `h2h-${deckId}-${g}`, firstPlayer: (g % 2) as 0 | 1,
    });
    if ((mctsOnA && r.winner === 0) || (!mctsOnA && r.winner === 1)) mctsWins++;
  }
  return mctsWins / games;
}

export function formatMatrix(m: MatrixResult): string {
  const pad = (s: string, w: number) => s.padEnd(w).slice(0, w);
  const w = 12;
  let out = pad("", w) + m.names.map((nm) => pad(nm, w)).join("") + pad("OVERALL", w) + "\n";
  for (let i = 0; i < m.ids.length; i++) {
    let row = pad(m.names[i], w);
    for (let j = 0; j < m.ids.length; j++) row += pad((m.table[i][j] * 100).toFixed(0) + "%", w);
    row += pad((m.overall[i].winRate * 100).toFixed(1) + "%", w);
    out += row + "\n";
  }
  return out;
}
