import { test, expect, Page } from "@playwright/test";

// The pack-opening modal (crack-open + pick) and on-card modification badges in combat.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

test("opening a booster pack reveals its picks", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("pack-demo");
    g.setState((s: { run: Record<string, unknown> }) => ({
      run: {
        ...s.run,
        phase: "shop",
        gold: 30,
        shop: {
          packs: [
            { id: "p0", kind: "relic", size: "jumbo", price: 6, contentIds: ["field-medic", "duelist", "sapper", "quartermaster", "whetstone"], picksRemaining: 1 },
          ],
          looseOffers: [],
          edictOffers: [],
          removeCardCost: 2,
          rerollCost: 2,
          openPack: null,
        },
      },
    }));
    g.getState().dispatch({ type: "openPack", packId: "p0" });
  });

  await expect(page.getByText(/Joker Pack/)).toBeVisible();
  expect(await page.locator(".pack-pick").count()).toBe(5);
  await page.waitForTimeout(450); // let the reveal animation settle
  await page.screenshot({ path: "screenshots/pack-open.png" });
});

test("card modifications show on the combat hand", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("badge-demo");
    g.setState((s: { run: { hand: { sigils?: string[]; extraSuit?: string }[] } }) => {
      const run = structuredClone(s.run);
      if (run.hand[0]) run.hand[0].sigils = ["keen"];
      if (run.hand[1]) run.hand[1].sigils = ["honed", "gilded"];
      if (run.hand[2]) {
        run.hand[2].sigils = ["extra"];
        run.hand[2].extraSuit = "S";
      }
      if (run.hand[3]) run.hand[3].sigils = ["wildcard"];
      return { run };
    });
  });

  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(900); // cards deal in + settle
  await page.locator("canvas").first().screenshot({ path: "screenshots/combat-badges.png" });
});
