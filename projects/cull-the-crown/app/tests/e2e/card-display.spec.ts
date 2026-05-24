import { test, expect, Page } from "@playwright/test";

// Two DOM-card behaviours that previously regressed: (1) card packs reveal the actual card face
// (shared <CardFace>, not an emblem); (2) the global <TooltipLayer> bubble escapes the scrollable
// deck view and clamps inside the viewport instead of clipping at an edge.

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

  await expect(page.getByText(/Card Pack/)).toBeVisible();
  // every pick renders a card face; the engraved ones carry a wax-seal sigil
  expect(await page.locator(".pack-pick .card.small.pack-card").count()).toBe(5);
  expect(await page.locator(".pack-pick .card-sigil").count()).toBe(2);
});

test("a sigil tooltip escapes the deck scroll box and clamps to the viewport", async ({ page }: { page: Page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("sigil-demo");
    g.setState((s: { run: { deck: { sigils?: string[]; extraSuit?: string }[] } }) => {
      const run = structuredClone(s.run);
      const d = run.deck;
      if (d[0]) d[0].sigils = ["keen"];
      if (d[1]) {
        d[1].sigils = ["extra"];
        d[1].extraSuit = "S";
      }
      return { run };
    });
    g.getState().setPileModal("all");
  });

  await expect(page.locator(".deck-view")).toBeVisible();
  await page.locator(".card-sigil").first().hover();
  const tip = page.locator(".tip-pop");
  await expect(tip).toBeVisible();

  // the bubble must sit fully inside the viewport (the old ::after clipped at the top/edges)
  const box = await tip.boundingBox();
  const vw = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vw.height);
});
