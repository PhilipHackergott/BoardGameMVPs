import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

// Plant a drill into held, then REAL-CLICK its HUD pouch tile (top-right of the felt) and assert that
// styleLevels actually bumps — i.e. the click path through HudLayer → PixiBoard → store dispatch works.
// Drill held items have no /art/tarots/drill-*.svg, so the HUD falls back to the fighting-style icon;
// this also guards that the click target stays clickable (not just an invisible blank tile).
test("clicking a fighting-style drill in the HUD pouch bumps styleLevels", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.newRun("drill-click");
    g.setDebug(true);
    g.dispatch({ type: "debugDefeat" });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" })); // → shop
  await page.locator(".pixi-host canvas").waitFor();
  await page.waitForTimeout(900);

  // Plant a drill directly into held so we can test the click path (independent of shop-buy seeding).
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
