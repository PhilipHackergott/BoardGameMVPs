import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any }; __preview: (ids: string[]) => any; __stage?: any };

// Multi-cycle shop↔battle transition audit. Drives a full real-combat fight, advances to shop,
// nextFight back to combat, repeats — and asserts the felt mode + hand + shop tray track the engine
// at every step. Surfaces "stuck shop tray during combat", "leftover hand in shop", "mode out of
// sync", etc. — anything the engine-only shop tests miss.

async function findWinSeed(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const fight = (): string => {
      for (let i = 0; i < 200; i++) {
        const g = w.__game.getState();
        const r = g.run;
        if (r.phase !== "combat") return "ended";
        const c = r.combat;
        if (c.outcome === "won") return "won";
        if (c.outcome === "lost") return "lost";
        if (c.subphase === "defend") {
          const sorted = [...r.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
          let sum = 0; const pick: string[] = [];
          for (const card of sorted) { if (sum >= c.incoming) break; pick.push(card.id); sum += card.value; }
          g.clearSelect(); pick.forEach((id: string) => w.__game.getState().toggleSelect(id));
          w.__game.getState().discardSelected();
        } else {
          let best: string | null = null; let bd = -1;
          for (const card of r.hand) {
            const res = w.__preview([card.id]);
            if (res.valid && res.damage > bd) { bd = res.damage; best = card.id; }
          }
          if (best == null) w.__game.getState().yieldTurn();
          else { w.__game.getState().clearSelect(); w.__game.getState().toggleSelect(best); w.__game.getState().playCards(); }
        }
      }
      return "timeout";
    };
    for (let seed = 0; seed < 40; seed++) {
      w.__game.getState().newRun("xn-" + seed);
      if (fight() === "won") return true;
    }
    return false;
  });
}

test("shop↔battle: real combat → shop → next combat, felt + shop tray + hand track the engine", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  // === Round 1: real fight → win ===
  const won1 = await findWinSeed(page);
  expect(won1, "search should find a winning seed in 40 tries").toBe(true);
  await page.waitForTimeout(1500); // gate animation
  // engine reports won, in combat phase with outcome
  let state = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
  expect(state.phase).toBe("combat");
  expect(state.combat?.outcome).toBe("won");

  // Claim → shop
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" }));
  await page.waitForTimeout(1500);
  state = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
  expect(state.phase, "after claim, phase should be shop").toBe("shop");
  // Stage should be in shop mode + the shop layer should be visible
  let stage = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (window as unknown as Win).__stage;
    return s ? { mode: s.mode, shopVisible: s.shopLayer?.visible, cards: s.cards?.size } : null;
  });
  expect(stage?.mode, "felt should be in shop mode").toBe("shop");
  expect(stage?.shopVisible, "shop tray should be on").toBe(true);
  expect(stage?.cards ?? 0, "no leftover felt hand cards in shop").toBe(0);
  await page.screenshot({ path: "screenshots/zz-trans-shop1.png" });

  // === Round 2: nextFight → combat ===
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "nextFight" }));
  await page.waitForTimeout(800);
  state = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
  // Note: nextFight may route through an "event" screen between fights — accept both.
  expect(["combat", "event"]).toContain(state.phase);

  // If we're in an event, choose option 1 to push back to combat.
  if (state.phase === "event") {
    await page.evaluate(() => {
      const g = (window as unknown as Win).__game.getState();
      const evt = g.run.eventId;
      if (evt) g.dispatch({ type: "eventChoice", optionId: g.run.eventId + ":0" });
    });
    await page.waitForTimeout(600);
    state = await page.evaluate(() => (window as unknown as Win).__game.getState().run);
  }
  // engine should now be in combat with a fresh hand
  expect(state.phase).toBe("combat");
  expect(state.hand?.length ?? 0, "next-fight should deal a fresh hand").toBeGreaterThan(0);
  stage = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (window as unknown as Win).__stage;
    return s ? { mode: s.mode, shopVisible: s.shopLayer?.visible, cards: s.cards?.size } : null;
  });
  expect(stage?.mode, "felt should be in combat mode").toBe("combat");
  expect(stage?.shopVisible, "shop tray should be off").toBe(false);
  expect(stage?.cards ?? 0, "combat should have hand cards on the felt").toBeGreaterThan(0);
  await page.screenshot({ path: "screenshots/zz-trans-combat2.png" });
});
