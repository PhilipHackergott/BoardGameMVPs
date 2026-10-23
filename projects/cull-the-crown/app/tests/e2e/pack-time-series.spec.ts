import { test, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void } };

// Repro: user says the pack "renders for a very short amount of time, then breaks down to an empty
// screen." Take a screenshot at 100, 300, 600, 1000, 1500, 2200, 3000 ms after opening a real
// pack, so we can see exactly when the canvas blanks.

test("pack time-series: capture canvas state at 100/300/600/1000/1500/2200/3000 ms", async ({ page }: { page: Page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("pts-1"));
  await page.waitForTimeout(500);
  // Force-win and advance to shop.
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({
      run: cur.run.combat ? {
        ...cur.run,
        gold: 999,
        combat: {
          ...cur.run.combat,
          enemy: { ...cur.run.combat.enemy, damageTaken: cur.run.combat.enemy.maxHealth },
          outcome: "won",
          wonExact: true,
        },
      } : cur.run,
    }));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" }));
  await page.waitForTimeout(700);
  // Open first pack via engine dispatch (mirrors the shop's buy-pack click).
  const packId = await page.evaluate(() => (window as unknown as Win).__game.getState().run.shop?.packs?.[0]?.id ?? null);
  if (!packId) throw new Error("no pack to open");
  await page.evaluate((id) => (window as unknown as Win).__game.getState().dispatch({ type: "openPack", packId: id }), packId);
  const intervals = [100, 300, 600, 1000, 1500, 2200, 3000];
  let prev = 0;
  for (const t of intervals) {
    await page.waitForTimeout(t - prev);
    prev = t;
    await page.screenshot({ path: `screenshots/zz-pack-ts-${t}ms.png` });
    // eslint-disable-next-line no-console
    console.log(`snap @${t}ms — openPack:`, await page.evaluate(() => (window as unknown as Win).__game.getState().run.shop?.openPack ? "set" : "null"));
  }
});
