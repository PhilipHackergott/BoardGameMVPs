import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 2 });

test("pixi pause modal", async ({ page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = window.__game;
    g.getState().newRun("pause-look");
    g.getState().setPaused(true);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "screenshots/zz-pause.png" });
  expect(await page.evaluate(() => window.__game.getState().paused)).toBe(true);

  // Surrender → confirm sub-view (panel centred in 1100×760: panelX≈364, content origin y≈282).
  await page.mouse.click(550, 470); // "Surrender Run" button
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/zz-pause-confirm.png" });

  // backdrop click (far outside the panel) dismisses the modal
  await page.mouse.click(60, 60);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__game.getState().paused)).toBe(false);
});
