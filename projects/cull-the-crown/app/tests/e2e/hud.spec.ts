import { test, expect, Page } from "@playwright/test";

// The guild/pouch HUD band is rendered in Pixi ON the felt (HudLayer). It shares the felt canvas, so
// these exercise its geometry-based hit testing: a joker tile is sellable in the shop (click → sell).

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

// felt logical (480×360) → screen, via the felt canvas box (same mapping as input.spec's cards).
async function feltPos(page: Page, lx: number, ly: number) {
  const box = (await page.locator(".pixi-host canvas").boundingBox())!;
  return { x: box.x + (lx / 480) * box.width, y: box.y + (ly / 360) * box.height };
}

test("a joker in the shop sells when its HUD tile is clicked", async ({ page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("hud-sell");
    g.setState((s: { run: Record<string, unknown> }) => ({
      run: {
        ...s.run, phase: "shop", gold: 10, slots: ["opportunist", "duelist", "field-medic"], held: [{ id: "h1", tarotId: "strength" }],
        shop: { packs: [], looseOffers: [], edictOffers: [], removeCardCost: 2, rerollCost: 3, openPack: null },
      },
    }));
  });
  await page.locator(".pixi-host canvas").waitFor();
  await page.waitForTimeout(700);

  const before = await page.evaluate(() => {
    const r = window.__game.getState().run;
    return { slots: r.slots.length, gold: r.gold };
  });
  // first joker tile centre ≈ felt logical (31, 31) — the band hugs the top-left
  const p = await feltPos(page, 31, 31);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const r = window.__game.getState().run;
    return { slots: r.slots.length, gold: r.gold };
  });
  expect(after.slots).toBe(before.slots - 1);
  expect(after.gold).toBeGreaterThan(before.gold);
});
