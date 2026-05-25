import { test, expect, Page } from "@playwright/test";

// Guards the PixiDeckModal migration's headline risk: the card grid is drawn in Pixi (buildCardFace),
// so picking a card relies on ModalStage hit-testing. This arms a pending pick and drives a REAL
// pointer click onto the first card of the Spades row, asserting the pick fired. (Mount/close is
// covered by card-display.spec.)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any }; __picked?: string };

test("PixiDeckModal: a card in the Pixi grid is pickable via real pointer", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("deck-pick"));
  await page.locator(".pixi-host canvas").waitFor();

  // arm a pending pick that records the chosen id, then open the picker over the full deck
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.setPendingPick((id: string) => {
      (window as unknown as Win).__picked = id;
    }, "Remove a card");
    g.setPileModal("all");
  });
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);

  // Full-window canvas → Pixi global coords == screen coords. Panel 940×540 centred; content origin
  // (PAD 20, HEADER 50); grid starts after the stats col (150) + rank col (12+44+16); first card
  // centre ≈ +272 across / row-1 centre ≈ +100 down.
  const p = await page.evaluate(() => ({ x: (window.innerWidth - 940) / 2 + 20 + 272, y: (window.innerHeight - 540) / 2 + 50 + 100 }));
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as unknown as Win).__picked), "the Pixi card grid fired the pending pick").toBeTruthy();
});
