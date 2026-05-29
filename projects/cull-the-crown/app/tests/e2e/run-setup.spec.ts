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

  // compact panel 520×420; content origin (px+20, py+20)
  const geo = await page.evaluate(() => ({ px: (window.innerWidth - 520) / 2, py: (window.innerHeight - 420) / 2 }));
  // Seeded toggle: content (0, 252, 140, 30) → centre ≈ (70, 267); screen = px+20+70, py+20+267
  await page.mouse.click(geo.px + 90, geo.py + 287);
  await page.waitForTimeout(200);
  await expect(page.locator("input[aria-label='Seed']")).toBeVisible(); // DOM seed field appears
  await page.locator("input[aria-label='Seed']").fill("hello");
  await page.screenshot({ path: "screenshots/zz-setup-seeded.png" });

  // PLAY: content (0, 294, w=480, 46) → centre ≈ (240, 317); screen = px+20+240, py+20+317
  await page.mouse.click(geo.px + 260, geo.py + 337);
  await page.waitForTimeout(300);
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("combat"); // PLAY started the run
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().run.seedLabel)).toBe("hello");
});
