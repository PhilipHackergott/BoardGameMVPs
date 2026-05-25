import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

test("PixiRunSetup: mounts, seed input, PLAY starts a run", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.getByRole("button", { name: /new run|play/i }).first().click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/zz-setup.png" });

  // headerless panel 620×440; content origin (px+20, py+20)
  const geo = await page.evaluate(() => ({ px: (window.innerWidth - 620) / 2, py: (window.innerHeight - 440) / 2 }));
  // Seeded toggle: content (0,302,180,34) → centre ≈ (90,319); screen = px+20+90, py+20+319
  await page.mouse.click(geo.px + 110, geo.py + 339);
  await page.waitForTimeout(200);
  await expect(page.locator("input[aria-label='Seed']")).toBeVisible(); // DOM seed field appears
  await page.locator("input[aria-label='Seed']").fill("hello");
  await page.screenshot({ path: "screenshots/zz-setup-seeded.png" });

  // PLAY: content (0, 346, w, 46) → centre ≈ (w/2, 369); screen = px+20+290, py+20+369
  await page.mouse.click(geo.px + 310, geo.py + 389);
  await page.waitForTimeout(300);
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("combat"); // PLAY started the run
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().run.seedLabel)).toBe("hello");
});
