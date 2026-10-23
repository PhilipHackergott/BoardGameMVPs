import { test, Page } from "@playwright/test";

// Deck × stake playtest sweep. Each combo runs 2 seeded full-runs end-to-end and console.logs a
// JSON summary the operator can grep from the test output for the per-epoch balance pass.
// Parallelised across browser workers (each test = its own browser → no WebGL-context conflicts).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void }; __preview: (ids: string[]) => any };

// 8 decks covering the variety axes: starter, +gold, +hand, +slot, suit-restricted, sigil-pre,
// pouch-focused, and starting-relic. Enough breadth to surface the balance issues without ballooning
// the sweep matrix beyond what fits a tight balance-pass cycle.
const DECKS = [
  "royal", "merchant", "bannerman", "warband",
  "iron", "vital", "fools-pouch", "enchanter",
];
const STAKES = ["white", "gold"];

interface FightLog {
  index: number;
  tier: string;
  plays: number;
  damageDealt: number;
  outcome: "won" | "lost" | "stuck";
}
interface RunResult {
  deck: string;
  stake: string;
  seed: string;
  endPhase: string;
  fightsWon: number;
  gold: number;
  fights: FightLog[];
}

async function autoFight(page: Page): Promise<{ outcome: "won" | "lost" | "stuck"; plays: number; damageDealt: number }> {
  return await page.evaluate(async () => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const get = () => w.__game.getState() as any;
    let plays = 0;
    const startDmg = get().run.combat?.enemy.damageTaken ?? 0;
    for (let i = 0; i < 800; i++) {
      const r = get().run;
      if (r.phase !== "combat") return { outcome: "stuck" as const, plays, damageDealt: 0 };
      const c = r.combat;
      if (!c) return { outcome: "stuck" as const, plays, damageDealt: 0 };
      if (c.outcome === "won") return { outcome: "won" as const, plays, damageDealt: c.enemy.damageTaken - startDmg };
      if (c.outcome === "lost") return { outcome: "lost" as const, plays, damageDealt: c.enemy.damageTaken - startDmg };
      if (c.subphase === "defend") {
        const sorted = [...r.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
        let sum = 0;
        const pick: string[] = [];
        for (const card of sorted) {
          if (sum >= c.incoming) break;
          pick.push(card.id);
          sum += card.value;
        }
        get().clearSelect();
        pick.forEach((id: string) => get().toggleSelect(id));
        get().discardSelected();
      } else {
        const hand = r.hand;
        const n = Math.min(hand.length, 8);
        let bestIds: string[] | null = null;
        let bestDmg = -1;
        let bestSize = 99;
        for (let mask = 1; mask < (1 << n); mask++) {
          const ids: string[] = [];
          for (let j = 0; j < n; j++) if (mask & (1 << j)) ids.push(hand[j].id);
          if (ids.length > 5) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res: any = w.__preview(ids);
          if (!res.valid) continue;
          if (res.damage > bestDmg || (res.damage === bestDmg && ids.length < bestSize)) {
            bestDmg = res.damage;
            bestIds = ids;
            bestSize = ids.length;
          }
        }
        plays++;
        if (!bestIds) get().yieldTurn();
        else {
          get().clearSelect();
          bestIds.forEach((id) => get().toggleSelect(id));
          get().playCards();
        }
      }
      await new Promise((r) => setTimeout(r, 1));
    }
    return { outcome: "stuck" as const, plays, damageDealt: 0 };
  });
}

// Shopping AI: lean heuristic — buy ONE affordable joker/relic loose offer per shop (long-term
// value). Skip packs (too slow / state-loop hazards in the test rig) and edicts (per-act, one-shot).
// Faster than full shop usage and still exercises the joker pool so the balance pass has signal.
async function shopWithAI(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = w.__game.getState();
    const r = g.run;
    if (r.phase !== "shop" || !r.shop) return;
    const cheapRelic = (r.shop.looseOffers || []).find((o: { kind: string; price: number }) =>
      (o.kind === "relic" || o.kind === "joker") && r.gold >= o.price);
    if (cheapRelic) g.dispatch({ type: "buyLoose", offerId: cheapRelic.id });
  });
}

async function advance(page: Page): Promise<string> {
  // Use the engine path (faster than gate clicks; same end-state).
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = w.__game.getState();
    if (s.run.phase === "combat" && s.run.combat?.outcome) s.dispatch({ type: "advance" });
  });
  await page.waitForTimeout(50);
  let phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  // From shop or event, shop a bit then push to next fight.
  for (let i = 0; i < 4 && phase !== "combat" && phase !== "won" && phase !== "lost"; i++) {
    if (phase === "shop") {
      await shopWithAI(page);
      await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "nextFight" }));
    } else if (phase === "event") {
      await page.evaluate(() => {
        const g = (window as unknown as Win).__game.getState();
        const evt = g.run.eventId;
        if (evt) g.dispatch({ type: "eventChoice", optionId: evt + ":0" });
      });
    }
    await page.waitForTimeout(50);
    phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  }
  return phase;
}

async function playRun(page: Page, deck: string, stake: string, seed: string): Promise<RunResult> {
  await page.evaluate(({ d, s, sd }) => {
    (window as unknown as Win).__game.getState().newRun(sd, d, s);
  }, { d: deck, s: stake, sd: seed });
  await page.waitForTimeout(150);
  const result: RunResult = { deck, stake, seed, endPhase: "?", fightsWon: 0, gold: 0, fights: [] };
  for (let fight = 1; fight <= 16; fight++) {
    const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
    if (phase === "won" || phase === "lost") break;
    if (phase !== "combat") {
      const next = await advance(page);
      if (next !== "combat") break;
    }
    const state = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
    if (state.phase !== "combat") break;
    const tier = state.combat?.enemy?.tier ?? "?";
    const r = await autoFight(page);
    result.fights.push({ index: fight, tier, plays: r.plays, damageDealt: r.damageDealt, outcome: r.outcome });
    if (r.outcome === "won") {
      result.fightsWon++;
      const post = await advance(page);
      if (post === "won" || post === "lost") break;
    } else break;
  }
  const final = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
  result.endPhase = final.phase;
  result.gold = final.gold;
  return result;
}

for (const deck of DECKS) {
  for (const stake of STAKES) {
    test(`sweep ${deck} @ ${stake}`, async ({ page }: { page: Page }) => {
      test.setTimeout(240_000);
      await page.goto("/");
      const close = page.getByRole("button", { name: "Close" });
      if (await close.isVisible().catch(() => false)) await close.click();
      await page.waitForTimeout(300);
      const seeds = [`${deck}-${stake}-a`, `${deck}-${stake}-b`];
      const runs: RunResult[] = [];
      for (const seed of seeds) runs.push(await playRun(page, deck, stake, seed));
      // Tag for easy grep: lines starting with PLAYTEST_RESULT are collected by the operator and
      // grouped per epoch for the balance pass.
      for (const r of runs) {
        // eslint-disable-next-line no-console
        console.log(`PLAYTEST_RESULT ${JSON.stringify(r)}`);
      }
    });
  }
}
