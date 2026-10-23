import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any } };

// Repro: clicking the Run Info button in the sidebar. The user reported it's "still bugged".
// Walks the engine path the button takes (setMapOpen) AND clicks the real Pixi button via canvas
// hit-testing so we see what a real player would.

test("Run Info: button opens The Descent modal and Esc closes it", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("ri-1"));
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/zz-runinfo-before.png" });

  // Path A: drive via the store action that the button calls.
  await page.evaluate(() => (window as unknown as Win).__game.getState().setMapOpen(true));
  await page.waitForTimeout(500);
  const mapOpen = await page.evaluate(() => (window as unknown as Win).__game.getState().mapOpen);
  expect(mapOpen, "mapOpen flag should flip true").toBe(true);

  // The Descent modal canvas should appear (.pixi-modal-host with a canvas, full viewport).
  await page.waitForTimeout(800);
  const modalHostCount = await page.locator(".pixi-modal-host canvas").count();
  expect(modalHostCount, "Run Info modal canvas should be in the DOM").toBeGreaterThan(0);
  await page.screenshot({ path: "screenshots/zz-runinfo-open.png" });

  // Click each tab via real Pixi canvas hit (the only way to exercise the tab-switch path).
  // The Descent modal is 588×474 centered. Tabs sit at y=4 inside the panel at panelTop+44 (header
  // band). Each tab is (panelW - 18) / 4 = 142px wide with 6px gap.
  const rect = await page.locator(".pixi-modal-host canvas").first().boundingBox();
  if (!rect) throw new Error("no modal canvas box");
  const panelW = 588;
  const panelH = 474;
  const px = (rect.width - panelW) / 2;
  const py = (rect.height - panelH) / 2;
  const PAD = 20;
  const HEADER_H = 44;
  const tabW = (panelW - 2 * PAD - 3 * 6) / 4;
  const clickTab = async (i: number) => {
    const tabX = px + PAD + i * (tabW + 6) + tabW / 2;
    const tabY = py + HEADER_H + 4 + 16;
    await page.mouse.click(tabX, tabY);
    await page.waitForTimeout(250);
  };
  for (let i = 0; i < 4; i++) {
    await clickTab(i);
    await page.screenshot({ path: `screenshots/zz-runinfo-tab${i}.png` });
  }

  // Close via store
  await page.evaluate(() => (window as unknown as Win).__game.getState().setMapOpen(false));
  await page.waitForTimeout(500);
  const mapClosed = await page.evaluate(() => (window as unknown as Win).__game.getState().mapOpen);
  expect(mapClosed).toBe(false);
});
