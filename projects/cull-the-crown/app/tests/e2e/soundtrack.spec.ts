import { test, expect } from "@playwright/test";

// Settings is now a Pixi modal (PixiSettings on ModalStage). The per-screen soundtrack <select>s became
// ◂ name ▸ cycle steppers drawn on the canvas. This opens Settings (the title button is still DOM),
// verifies the Pixi modal mounts, and real-pointer-clicks the Menu row's ▸ stepper — asserting the live
// audio engine + localStorage update (the change is heard at once on the active screen).
test("the soundtrack steppers change + persist the per-screen song", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  await page.goto("/");
  const tut = page.getByRole("dialog", { name: "Rules" });
  if (await tut.isVisible().catch(() => false)) await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "screenshots/settings-soundtracks.png" });

  type Au = { __ctcAudio: { screenSong: Record<string, string> } };
  // default: the Menu screen plays "court"
  expect(await page.evaluate(() => (window as unknown as Au).__ctcAudio.screenSong.menu)).toBe("court");

  // Real-pointer ▸ on the Menu row. Panel 540 wide; with 3 screens + debug off, panelH = 408 (formula:
  // 50 + (150 + 22 + 3*34 + 12) + 56 + 16). Content origin (PAD 20, HEADER 50); Menu row y 150, ▸ at
  // content-x (innerW 500 − 28) → centre ≈ 485, y ≈ 164.
  const p = await page.evaluate(() => ({ x: (window.innerWidth - 540) / 2 + 20 + 485, y: (window.innerHeight - 408) / 2 + 50 + 164 }));
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);

  // the stepper advanced the Menu song off the default, live + persisted
  expect(await page.evaluate(() => (window as unknown as Au).__ctcAudio.screenSong.menu)).not.toBe("court");
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("ctc_screen_songs") ?? "{}"));
  expect(persisted.menu).not.toBe("court");
  expect(persisted.menu).toBeTruthy();

  expect(errors, errors.join("\n")).toEqual([]);
});
