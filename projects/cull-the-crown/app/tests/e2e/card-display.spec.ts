import { test, expect, Page } from "@playwright/test";

// Card-rendering surfaces, now that cards are drawn with the Pixi model (PixiCard / PixiDeckRows)
// presented as data-URL <img>s: (1) a card pack reveals real card faces (not procedural emblems),
// with engraved picks carrying their sigil; (2) the full-deck view renders every card via the Pixi
// deck-rows canvas, with the DOM stats panel summarising the deck.

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
  const picks = page.locator(".pack-pick .pack-card");
  await expect(picks).toHaveCount(5);
  // every pick renders a real Pixi card face (a data-URL image), not a procedural emblem
  await expect(picks.locator("img").first()).toHaveAttribute("src", /^data:image/);
  const faces = await picks.locator("img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
  expect(faces.every((s) => s.startsWith("data:image"))).toBe(true);
  // the two engraved picks (D5:keen, S8:honed) carry their sigil in the accessible label
  const labels = await picks.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
  expect(labels.filter((l) => l.includes(",")).length).toBe(2);
});

test("the full-deck view renders every card via the Pixi deck-rows canvas", async ({ page }: { page: Page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("deck-demo");
    g.getState().setPileModal("all");
  });

  await expect(page.locator(".deck-view")).toBeVisible();
  // the deck is now one Pixi canvas (PixiDeckRows) — no DOM card elements / DOM scroll box
  await expect(page.locator(".deck-view .pixi-deck-rows canvas")).toBeVisible();
  expect(await page.locator(".deck-view .card.small").count()).toBe(0);

  // the DOM stats panel summarises the same deck the engine holds (∑ Total is the last base-card stat)
  const total = await page.evaluate(() => {
    const r = window.__game.getState().run;
    return r.deck.length + r.hand.length + r.discard.length + r.table.length;
  });
  await expect(page.locator(".deck-stats .ds-bc").last().locator("b")).toHaveText(String(total));
});
