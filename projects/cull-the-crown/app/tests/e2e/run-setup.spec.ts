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

  const geo = await page.evaluate(() => ({ px: (window.innerWidth - 600) / 2, py: (window.innerHeight - 460) / 2 }));
  // Seeded toggle: content (0,274,170,32) → centre ≈ (85,290); screen = px+20+85, py+50+290
  await page.mouse.click(geo.px + 105, geo.py + 340);
  await page.waitForTimeout(200);
  await expect(page.locator("input[aria-label='Seed']")).toBeVisible(); // DOM seed field appears
  await page.locator("input[aria-label='Seed']").fill("hello");
  await page.screenshot({ path: "screenshots/zz-setup-seeded.png" });

  // PLAY: content (0, 316, w, 38) → centre ≈ (w/2, 335); screen = px+20+280, py+50+335
  await page.mouse.click(geo.px + 300, geo.py + 385);
  await page.waitForTimeout(300);
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("combat"); // PLAY started the run
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().run.seedLabel)).toBe("hello");
});
