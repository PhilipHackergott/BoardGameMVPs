import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

// The DeckPeek matrix (DOM) — the Balatro-style "remaining cards at a glance" table shown mid-combat
// while the pointer is over the draw pile. Drive it via the engine seam (start a run, flip deckHover)
// and assert it renders, then screenshot for an eyeball of the doubled / centred layout.
test("DeckPeek: the remaining-cards table renders on deck hover", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.newRun("peek-test");
    g.setDeckHover(true);
  });

  const peek = page.locator(".deck-peek");
  await expect(peek).toBeVisible({ timeout: 10000 });
  // header has a rank cell per drawn rank; suit rows render their bands
  expect(await page.locator(".dp-rank").count()).toBeGreaterThan(0);
  expect(await page.locator(".dp-row.dp-suit-S").count()).toBe(1);
  await page.screenshot({ path: "screenshots/zz-deck-peek.png" });
});
