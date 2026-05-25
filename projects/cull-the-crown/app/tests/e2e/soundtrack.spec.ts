import { test, expect } from "@playwright/test";

// The Settings soundtrack picker: one dropdown per main screen (Menu / Combat / Shop), each choosing
// a song from the catalog. Selecting updates the live audio engine + persists, and (for the active
// screen) restarts the score so the change is heard at once.
test("per-screen soundtrack dropdowns select + persist songs", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  await page.goto("/");
  const tut = page.getByRole("dialog", { name: "Rules" });
  if (await tut.isVisible().catch(() => false)) await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

  const selects = page.locator(".track-select");
  await expect(selects).toHaveCount(3); // one per main screen
  await page.screenshot({ path: "screenshots/settings-soundtracks.png" });

  // defaults: menu→court, combat→iron, shop→market
  expect(await selects.nth(0).inputValue()).toBe("court");
  expect(await selects.nth(1).inputValue()).toBe("iron");
  expect(await selects.nth(2).inputValue()).toBe("market");

  // change the MENU song (the screen playing on the title) → engine + persistence update live
  await selects.nth(0).selectOption("gauntlet");
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => (window as unknown as { __ctcAudio: { screenSong: Record<string, string> } }).__ctcAudio.screenSong.menu)).toBe("gauntlet");

  // change the COMBAT song
  await selects.nth(1).selectOption("gilded");
  await page.waitForTimeout(120);

  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("ctc_screen_songs") ?? "{}"));
  expect(persisted.menu).toBe("gauntlet");
  expect(persisted.combat).toBe("gilded");

  expect(errors, errors.join("\n")).toEqual([]);
});
