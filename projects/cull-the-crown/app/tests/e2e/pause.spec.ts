import { test, expect, Page } from "@playwright/test";

// The Pixi pause modal (PixiPauseMenu on ModalStage): opens when paused, and a click on the backdrop
// (outside the centred panel) dismisses it — exercises ModalStage's click-outside dismiss contract on a
// real dismissable modal.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

test("pause modal opens and a backdrop click dismisses it", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.newRun("pause-test");
    g.setPaused(true);
  });
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().paused)).toBe(true);

  // a real click in the far corner is always outside the centred panel → the backdrop → dismiss
  await page.mouse.click(40, 40);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().paused)).toBe(false);
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });
});
