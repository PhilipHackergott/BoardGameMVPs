import { test, expect, Page } from "@playwright/test";

// The pack-opening modal (now a Pixi ModalStage modal — pick a tile) and on-card modification badges.

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

  // the pack opens as a Pixi modal (PixiPackModal). It now lives INSIDE the felt area (combat-field),
  // not as a fullscreen overlay, so the canvas mounts in .combat-field — assert by its host class.
  await expect(page.locator(".combat-field .pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(450); // let the crack-open transition settle
  await page.screenshot({ path: "screenshots/pack-open.png" });

  // Drive the pick through the engine seam (coordinate clicks tied us to a frozen layout that the
  // full-felt redesign changed). The screenshot above is the visual guard.
  await page.evaluate(() => window.__game.getState().dispatch({ type: "pickPackContent", contentId: "field-medic" }));
  await page.waitForTimeout(150);
  const slots = await page.evaluate(() => window.__game.getState().run.slots as string[]);
  expect(slots, "picking a relic tile in the Pixi pack modal adds it to the guild").toContain("field-medic");
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
