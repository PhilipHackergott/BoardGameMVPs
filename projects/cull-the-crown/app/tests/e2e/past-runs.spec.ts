import { test, expect, Page } from "@playwright/test";

test("PixiPastRuns: scroll modal mounts with seeded history", async ({ page }: { page: Page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  await page.goto("/");
  // seed a long history so the scroll region has overflow
  await page.evaluate(() => {
    const hist = Array.from({ length: 18 }, (_, i) => ({ seed: `run-${i}`, result: i % 3 === 0 ? "won" : i % 3 === 1 ? "lost" : "surrendered", royals: i % 12, totalRoyals: 12, gold: i * 7, date: Date.now() - i * 1e6 }));
    localStorage.setItem("ctc_history", JSON.stringify(hist));
  });
  await page.reload();
  const tut = page.getByRole("button", { name: "Close" });
  if (await tut.isVisible().catch(() => false)) await tut.click();

  await page.getByRole("button", { name: /Past runs/i }).click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/zz-pastruns.png" });

  // wheel-scroll the list, then close
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/zz-pastruns-scrolled.png" });

  await page.keyboard.press("Escape");
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });
  expect(errors, errors.join("\n")).toEqual([]);
});
