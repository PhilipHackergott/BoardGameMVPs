import { expect, test } from "@playwright/test";

// Stage 5 (test/iterate) smoke check: the single-screen sandbox deals a pond on
// load and invites a flower selection.
test("title loads and a pond is dealt", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__nightweave);
  // The app opens on the main menu now; the dev seam deals a game directly.
  await page.evaluate(() => (window as any).__nightweave.newGame("12345"));
  await page.waitForSelector(".board-host canvas");
  await expect(page.getByText(/starting bonus/i)).toBeVisible();
});
