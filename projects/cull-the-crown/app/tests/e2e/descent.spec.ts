import { test, expect, Page } from "@playwright/test";

// The Descent run-overview modal (P2): opens, shows the CURRENT Court + its royals/decrees, and closes.
// (The Opponents tab was redesigned to focus on the court you're in — Act I/II/III — rather than listing
// all three at once, so the run-info modal stays scannable as the run deepens.)

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

  // The run-info modal is tabbed now; the royals live on the "Opponents" tab.
  await modal.getByRole("tab", { name: "Opponents" }).click();

  // At run start you're in Act I, so the tab shows The Jack Court and its four royals (one court at a
  // time — Queen/King courts surface as the run advances into them).
  await expect(page.getByText(/The Jack Court/)).toBeVisible();
  expect(await page.locator(".descent-royal").count()).toBe(4);
  // At least one royal advertises a decree (royals past the first carry one).
  expect(await page.locator(".dr-decree.has").count()).toBeGreaterThan(0);

  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/descent.png" });

  await modal.getByRole("button", { name: "Close" }).click();
  await expect(modal).toBeHidden();
});
