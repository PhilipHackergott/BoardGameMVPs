import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

// Plant a drill into held DURING COMBAT, then REAL-CLICK its HUD pouch tile and assert that
// styleLevels bumps — the click path through HudLayer → PixiBoard → store dispatch works in the
// contexts where the pouch is usable (combat or while a pack is open). The pouch is intentionally
// view-only on the bare shop page, so we exercise it mid-fight here.
test("clicking a fighting-style drill in the HUD pouch bumps styleLevels (combat context)", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.newRun("drill-click");
  });
  await page.waitForTimeout(800);

  // Plant a drill into held WHILE in combat (where the pouch is usable).
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.run.held.push({ id: "drill-x", tarotId: "drill-spear" });
    g.setHoverId(null);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/zz-drill-held.png" });
  const before = await page.evaluate(() => (window as unknown as Win).__game.getState().run.styleLevels.spear);

  // Pouch tile: stageW (480) - EDGE(14) - TILE_W(40) = 426, TOP_Y(8) → centre ≈ (446, 36) in felt coords.
  const rect = await page.locator(".pixi-host canvas").first().boundingBox();
  if (!rect) throw new Error("no felt canvas box");
  const scale = rect.width / 480;
  await page.mouse.click(rect.x + 446 * scale, rect.y + 36 * scale);
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => (window as unknown as Win).__game.getState().run.styleLevels.spear);
  const heldAfter = await page.evaluate(() => (window as unknown as Win).__game.getState().run.held.length);
  console.log("DRILL CLICK:", { before, after, heldAfter });
  expect(after).toBe(before + 1);
  expect(heldAfter).toBe(0);
});
