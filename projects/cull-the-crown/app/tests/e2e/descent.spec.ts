import { test, expect, Page } from "@playwright/test";

// "The Descent" run-info modal is now a Pixi modal (full-window canvas in .pixi-modal-host), opened via
// the ⌖ Run Info button / M key (store.mapOpen). The four tabs (Styles/Opponents/Edicts/Stake) and the
// current-court royals/decrees are drawn on the canvas — the underlying data (gauntletView, decrees) is
// covered by the engine unit tests; here we verify the modal mounts on open and tears down on close.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

test("The Descent (Pixi run-info) modal opens and closes", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const gotIt = page.getByRole("button", { name: "Close" });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  await page.evaluate(() => window.__game.getState().newRun("descent-demo"));
  await page.locator("canvas").first().waitFor();

  // Open via the store (mirrors the ⌖ Run Info button / the M shortcut).
  await page.evaluate(() => window.__game.getState().setMapOpen(true));
  // generous timeout — the modal app awaits WebGL init + fonts, which can be slow under parallel load
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => window.__game.getState().mapOpen)).toBe(true);

  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/descent.png" });

  // Closing the modal tears the Pixi app down (the host + its canvas unmount).
  await page.evaluate(() => window.__game.getState().setMapOpen(false));
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });
});
