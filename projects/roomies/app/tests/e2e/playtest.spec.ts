import { test, expect } from "@playwright/test";

// 1) Human hot-seat: drive a full two-phase game (2 humans) through the real UI to an end screen.
test("hot-seat: humans play a full game end to end", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });

  await page.getByTestId("menu-newgame").click();
  await page.getByRole("button", { name: "Hot-seat ×2" }).click();
  await page.getByTestId("setup-start").click();

  const visible = (sel: string) => page.locator(sel).first().isVisible().catch(() => false);
  for (let i = 0; i < 1500; i++) {
    if (await page.getByTestId("newgame").isVisible().catch(() => false)) break;
    if (await page.getByTestId("reveal").isVisible().catch(() => false)) { await page.getByTestId("reveal").click(); continue; }
    if (await visible(".overlay .btn.ghost")) { await page.locator(".overlay .btn.ghost").click(); continue; }
    if (await visible(".draft-hand .hand-card:not([disabled])")) { await page.locator(".draft-hand .hand-card:not([disabled])").first().click(); continue; }
    if (await visible(".place-screen")) {
      const pool = page.locator(".pool-strip .hand-card:not([disabled])");
      if ((await pool.count()) === 0) { await page.locator(".done-btn").click(); continue; }
      await pool.first().click();
      const target = page.locator(".actions button.target:not([disabled])").first();
      if (await target.isVisible().catch(() => false)) await target.click();
      else await page.locator(".actions button.warn").click();
      continue;
    }
    await page.waitForTimeout(40);
  }
  await expect(page.getByTestId("newgame")).toBeVisible();
  await expect(page.locator(".end-title")).toContainText(/wins|tie/i);
});

// 2) All-AI watch mode: 3 AIs play a full game with no human input; assert it reaches the end.
test("all-AI watch mode plays itself to an end screen", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("roomies.settings", JSON.stringify({ reduceMotion: true, aiSpeedMs: 300 })));
  await page.goto("/");
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });

  await page.getByTestId("menu-newgame").click();
  await page.getByRole("button", { name: "Watch 3 AI" }).click();
  await page.getByTestId("setup-start").click();

  await expect(page.getByTestId("newgame")).toBeVisible({ timeout: 75_000 });
  await expect(page.locator(".end-title")).toContainText(/wins|tie/i);
});
