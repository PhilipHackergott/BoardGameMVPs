import { test, expect, Page } from "@playwright/test";

// The ONE shared tooltip surface (ui/tooltip): DOM `data-tip`, the Pixi felt, and the Pixi modals all
// feed a single `.tip-pop` bubble. This drives the newest path — a Pixi modal (Compendium gallery tile)
// hover → ModalStage.onHover → the shared store → the bubble — and asserts the bubble shows/hides.

test("a Compendium gallery tile hover surfaces the one shared tooltip", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.getByRole("button", { name: /compendium/i }).click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);

  // nav → Jokers (content origin PAD 20 / HEADER 50; group-2 first item ≈ y210, centre x ≈ +95)
  const geo = await page.evaluate(() => ({ cx: (window.innerWidth - 860) / 2 + 20, cy: (window.innerHeight - 580) / 2 + 50 }));
  await page.mouse.click(geo.cx + 95, geo.cy + 224);
  await page.waitForTimeout(400);

  // hover a gallery tile (first row, left-ish of the 3-col grid that starts after the nav column)
  await page.mouse.move(geo.cx + 320, geo.cy + 90);
  await expect(page.locator(".tip-pop")).toBeVisible({ timeout: 4000 });
  expect((await page.locator(".tip-pop .tip-body").innerText()).length).toBeGreaterThan(0);
  await page.screenshot({ path: "screenshots/zz-tooltip.png" }); // eyeball: bubble paints OVER the modal canvas

  // move off the tiles → the shared bubble hides
  await page.mouse.move(geo.cx - 5, geo.cy + 90); // into the nav column (no tile)
  await expect(page.locator(".tip-pop")).toHaveCount(0, { timeout: 4000 });

  await page.keyboard.press("Escape");
});
