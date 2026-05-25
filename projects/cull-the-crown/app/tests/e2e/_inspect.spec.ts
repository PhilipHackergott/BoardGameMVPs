import { test } from "@playwright/test";

test.use({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 1 });

test("inspect shop tray small", async ({ page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("shop-tray");
    g.setState((s: { run: Record<string, unknown> }) => ({
      run: {
        ...s.run, phase: "shop", gold: 28, slots: ["opportunist", "duelist"], held: [{ id: "h1", tarotId: "strength" }],
        shop: {
          packs: [
            { id: "p0", kind: "relic", size: "m", price: 6, contentIds: ["field-medic", "duelist", "sapper"], picksRemaining: 1 },
            { id: "p1", kind: "tarot", size: "xl", price: 10, contentIds: ["strength", "death"], picksRemaining: 2 },
          ],
          looseOffers: [
            { id: "l0", kind: "relic", contentId: "quartermaster", price: 6 },
            { id: "l1", kind: "tarot", contentId: "strength", price: 4 },
            { id: "l2", kind: "card", contentId: "H9", price: 2 },
          ],
          edictOffers: ["kings-ransom"], removeCardCost: 2, rerollCost: 3, openPack: null,
        },
      },
    }));
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "screenshots/zz-tray.png" });
});
