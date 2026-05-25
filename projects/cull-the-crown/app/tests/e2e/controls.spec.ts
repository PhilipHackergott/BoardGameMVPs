import { test, expect, Page } from "@playwright/test";

// Guards the FeltControls migration: the combat action controls (Sort, the defend block prompt, the
// wildcard suit-picker, the pending-pick banner, the block pill) are now drawn IN the Pixi felt rather
// than as floating DOM overlays. The headline risk of that move is interactivity — a Pixi button is
// just pixels unless its hit-test fires — so this drives a REAL pointer click onto the on-felt "Auto"
// button and asserts it ran the engine intent (auto-select a covering block). Card input itself is
// covered by input.spec; this proves the migrated chrome is wired.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

test("the on-felt combat controls are interactive (Auto button fires via real pointer)", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("controls-demo"));
  await page.locator(".pixi-host canvas").waitFor();

  // Drive into the defend sub-phase: yield until the royal's strike forces a block.
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    for (let i = 0; i < 8 && g.run.combat?.subphase !== "defend"; i++) g.yieldTurn();
  });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().run.combat?.subphase)).toBe("defend");

  // Real-pointer click on the Pixi "Auto" button. Felt is 480×360, the canvas is width-driven contain,
  // so screen = canvasOrigin + feltCoord × (canvasWidth / 480). Auto sits on the bottom strip:
  // stripY = 360−24 = 336 (centre +9); x0 = 85, label 150 wide, Auto 52 wide → centre ≈ 261.
  const before = await page.evaluate(() => (window as unknown as Win).__game.getState().selected.length);
  const rect = await page.locator(".pixi-host canvas").first().boundingBox();
  if (!rect) throw new Error("felt canvas has no box");
  const scale = rect.width / 480;
  await page.mouse.click(rect.x + 261 * scale, rect.y + (336 + 9) * scale);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => (window as unknown as Win).__game.getState().selected.length);

  expect(after).toBeGreaterThan(before); // the Pixi button's hit-test fired autoBlock()
});
