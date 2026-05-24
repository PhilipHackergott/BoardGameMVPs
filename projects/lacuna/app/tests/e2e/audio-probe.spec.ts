import { test, expect } from "@playwright/test";

type Snap = { ctxState: string; music: boolean; musicVolume: number; musicGain: number | null; droneCount: number; padActive: boolean };

// Regression guard for the background-music controls: a user gesture must start the music
// graph, and the Settings checkbox + volume slider must drive the engine end-to-end. (The
// engine awaits AudioContext.resume() before starting the drones so the autoplay race can't
// leave music permanently silent.)
test("background music: gesture starts it, toggle + slider drive the engine", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__nightweave?.audio);
  const snap = (): Promise<Snap> => page.evaluate(() => (window as any).__nightweave.audio.snapshot());

  // A trusted gesture in a neutral corner (no nav) unlocks + starts the music.
  await page.mouse.click(5, 5);
  await page.waitForTimeout(600);
  const started = await snap();
  expect(started.ctxState).toBe("running");
  expect(started.droneCount).toBeGreaterThan(0); // drones playing
  expect(started.padActive).toBe(true);

  // Drive the REAL UI controls from the Settings view.
  await page.getByRole("button", { name: /settings/i }).click();
  const musicCheckbox = page.getByLabel(/background music/i);

  await musicCheckbox.uncheck();
  await page.waitForTimeout(400);
  expect((await snap()).droneCount).toBe(0); // toggle OFF stops the drones

  await musicCheckbox.check();
  await page.waitForTimeout(400);
  expect((await snap()).droneCount).toBeGreaterThan(0); // toggle ON restarts them

  const slider = page.getByLabel(/music volume/i);
  await slider.fill("20");
  await slider.dispatchEvent("input");
  await page.waitForTimeout(500);
  const vol = await snap();
  expect(vol.musicVolume).toBeCloseTo(0.2, 2);
  expect(vol.musicGain).toBeCloseTo(0.046, 2); // MUSIC_MAX (0.23) * 0.2
});
