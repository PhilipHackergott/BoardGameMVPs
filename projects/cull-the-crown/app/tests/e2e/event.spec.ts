import { test, expect, Page } from "@playwright/test";

// A Court Event (P5) presents its choices, and choosing one proceeds to the next fight.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

test("a Court Event presents choices and resolves into combat", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const gotIt = page.getByRole("button", { name: "Close" });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();

  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("event-demo");
    g.setState((s: { run: Record<string, unknown> }) => ({ run: { ...s.run, phase: "event", eventId: "shrine" } }));
  });

  await expect(page.getByText("The Crossroads Shrine")).toBeVisible();
  expect(await page.locator(".event-option").count()).toBe(2);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/event.png" });

  // Choosing the free "pray" option proceeds to the next fight (the board re-appears).
  await page.locator(".event-option").last().click();
  await expect(page.locator("canvas").first()).toBeVisible();
});
