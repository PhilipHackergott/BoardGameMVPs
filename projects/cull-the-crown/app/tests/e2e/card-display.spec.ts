import { test, expect, Page } from "@playwright/test";

// Card-rendering surfaces: (1) a card pack reveals real card faces (not procedural emblems), with
// engraved picks carrying their sigil; (2) the full-deck view is now a Pixi modal (PixiDeckModal on
// ModalStage) — one full-window canvas, no DOM card/stats elements — that mounts on open and closes.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

async function boot(page: Page) {
  await page.goto("/");
  // Kill ambient animations (the cards' idle float) so DOM cards are a stable hover/click target.
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none !important;transition:none !important}" });
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
}

test("a card pack reveals real card faces, not emblems", async ({ page }: { page: Page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("face-demo");
    g.setState((s: { run: Record<string, unknown> }) => ({
      run: {
        ...s.run,
        phase: "shop",
        gold: 30,
        shop: {
          packs: [
            { id: "p0", kind: "card", size: "jumbo", price: 6, contentIds: ["S10", "H7", "D5:keen", "CA", "S8:honed"], picksRemaining: 1 },
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

  // a card pack opens as a Pixi modal (PixiPackModal) — its picks are real card faces drawn on the
  // canvas (buildCardFace, the same model as the felt), not DOM emblems
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: "screenshots/zz-pack-card.png" });
});

test("the full-deck view is a Pixi modal that mounts on open and closes", async ({ page }: { page: Page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("deck-demo");
    g.getState().setPileModal("all");
  });

  // the deck view is now one full-window Pixi modal canvas — no DOM card elements / stats panel
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  expect(await page.locator(".deck-view").count()).toBe(0);
  expect(await page.locator(".card.small").count()).toBe(0);

  // closing tears the Pixi modal down
  await page.evaluate(() => window.__game.getState().setPileModal(null));
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });
});
