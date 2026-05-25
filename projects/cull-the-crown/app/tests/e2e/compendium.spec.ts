import { test, expect, Page } from "@playwright/test";

test("PixiCompendium: rules, gallery, and enemies pages render", async ({ page }: { page: Page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.getByRole("button", { name: /compendium/i }).click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/zz-compendium-overview.png" });

  // nav: content origin (PAD 20, HEADER 50); buttons in the left column (centre x ≈ +95).
  const geo = await page.evaluate(() => ({ cx: (window.innerWidth - 860) / 2 + 20, cy: (window.innerHeight - 580) / 2 + 50 }));
  // Jokers nav item: group2 label at y192, items from y210; Jokers is the first → y≈210 (+14 centre)
  await page.mouse.click(geo.cx + 95, geo.cy + 224);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/zz-compendium-jokers.png" });
  // scroll the gallery
  await page.mouse.move(geo.cx + 500, geo.cy + 300);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/zz-compendium-jokers2.png" });

  // Royals & Decrees: last item in group2 → y ≈ 210 + 6*32 = 402 (+14)
  await page.mouse.click(geo.cx + 95, geo.cy + 416);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/zz-compendium-enemies.png" });

  await page.keyboard.press("Escape");
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });
  expect(errors, errors.join("\n")).toEqual([]);
});
