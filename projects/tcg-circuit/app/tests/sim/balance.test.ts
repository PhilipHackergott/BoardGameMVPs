import { describe, it, expect } from "vitest";
import { winRateMatrix, ladderPair, allDeckIds, formatMatrix, mctsVsGreedy } from "../../src/sim/balance";

const GAMES = Number(process.env.SIM_GAMES ?? 40); // bump via SIM_GAMES for a deeper sweep

describe("PRISM balance harness (npm run sim)", () => {
  it("archetype win-rate spread is compressed — no auto-win deck, no dead archetype", () => {
    const m = winRateMatrix(allDeckIds(), GAMES, 0.6);
    // eslint-disable-next-line no-console
    console.log("\nArchetype win-rate matrix (deck on the left vs deck on top), skill 0.6:\n" + formatMatrix(m));
    const rates = m.overall.map((o) => o.winRate);
    const max = Math.max(...rates);
    const min = Math.min(...rates);
    const top = m.overall.find((o) => o.winRate === max)!;
    const bot = m.overall.find((o) => o.winRate === min)!;
    // eslint-disable-next-line no-console
    console.log(`Strongest: ${top.name} ${(max * 100).toFixed(1)}% | Weakest: ${bot.name} ${(min * 100).toFixed(1)}% | spread ${((max - min) * 100).toFixed(1)}pts`);
    expect(max).toBeLessThan(0.72); // no auto-win deck
    expect(min).toBeGreaterThan(0.28); // no dead archetype
  });

  it("the skill scale is monotone — higher skill beats lower (pairwise + smoothly)", () => {
    const deck = "wildfire"; // a fair midrange mirror
    const pairs: [number, number][] = [
      [0.15, 0.45],
      [0.4, 0.7],
      [0.6, 0.92],
    ];
    for (const [lo, hi] of pairs) {
      const wr = ladderPair(deck, lo, hi, GAMES);
      // eslint-disable-next-line no-console
      console.log(`skill ${hi} vs ${lo}: higher wins ${(wr * 100).toFixed(1)}%`);
      expect(wr).toBeGreaterThan(0.55);
    }
    // smooth: a wide gap should dominate more than a narrow one
    const wide = ladderPair(deck, 0.1, 0.95, GAMES);
    const narrow = ladderPair(deck, 0.45, 0.6, GAMES);
    // eslint-disable-next-line no-console
    console.log(`wide gap (0.95 vs 0.1): ${(wide * 100).toFixed(1)}% | narrow (0.6 vs 0.45): ${(narrow * 100).toFixed(1)}%`);
    expect(wide).toBeGreaterThanOrEqual(narrow - 0.05);
  });

  it("determinized MCTS outplays the greedy+eval AI head-to-head (at equal skill)", () => {
    const games = Number(process.env.MCTS_GAMES ?? 24);
    const wr = mctsVsGreedy("wildfire", 0.8, games);
    // eslint-disable-next-line no-console
    console.log(`MCTS vs greedy (wildfire mirror, skill 0.8): MCTS wins ${(wr * 100).toFixed(1)}%`);
    expect(wr).toBeGreaterThan(0.5); // exploring + averaging over determinizations beats the greedy line
  });
});
