import { test, expect, Page } from "@playwright/test";

// The Descent run-overview modal (P2): opens, shows the three Courts + decrees, and closes.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

test("The Descent modal opens, lists royals + decrees, and closes", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const gotIt = page.getByRole("button", { name: "Close" });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  await page.evaluate(() => window.__game.getState().newRun("descent-demo"));
  await page.locator("canvas").first().waitFor();

  // Open via the store (mirrors the stat button / the M shortcut).
  await page.evaluate(() => window.__game.getState().setMapOpen(true));
  const modal = page.getByRole("dialog", { name: /The Descent/ });
  await expect(modal).toBeVisible();

  // All three Courts and all 12 royals are present.
  await expect(page.getByText(/The Jack Court/)).toBeVisible();
  await expect(page.getByText(/The Queen Court/)).toBeVisible();
  await expect(page.getByText(/The King Court/)).toBeVisible();
  expect(await page.locator(".descent-royal").count()).toBe(12);
  // At least one royal advertises a decree (royals past the first carry one).
  expect(await page.locator(".dr-decree.has").count()).toBeGreaterThan(0);

  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/descent.png" });

  await modal.getByRole("button", { name: "Close" }).click();
  await expect(modal).toBeHidden();
});
