import { test, expect, Page } from "@playwright/test";

// Verifies the Compendium panel is a fixed size across tabs AND that galleries are PAGINATED
// (a fixed page of tiles + a pager) rather than scrolled. Pure DOM, so element screenshots are reliable.

async function openCompendium(page: Page) {
  await page.goto("/");
  const tut = page.getByRole("dialog", { name: "Rules" });
  if (await tut.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Close" }).click();
  }
  await page.getByRole("button", { name: /Compendium/ }).click();
  await page.locator(".comp-panel").waitFor();
}

test("compendium paginates long tabs at a fixed panel size", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  await openCompendium(page);
  const panel = page.locator(".comp-panel");

  // Short tab (Overview): same panel size, no pager.
  await page.locator(".comp-nav-item", { hasText: "Overview" }).click();
  await page.waitForTimeout(150);
  const shortBox = await panel.boundingBox();
  await panel.screenshot({ path: "screenshots/compendium-short-overview.png" });

  // Long tab (Jokers): paginated — a pager appears, and the grid does NOT overflow (no scroll).
  await page.locator(".comp-nav-item", { hasText: "Jokers" }).click();
  await page.waitForTimeout(200);
  const longBox = await panel.boundingBox();
  await panel.screenshot({ path: "screenshots/compendium-jokers-p1.png" });

  const pager = page.locator(".comp-pager");
  await expect(pager).toBeVisible();
  const info1 = (await page.locator(".comp-pager-info").textContent())?.trim() ?? "";
  console.log("PANEL HEIGHTS  overview:", shortBox?.height, " jokers:", longBox?.height);
  console.log("JOKERS PAGER:", info1);

  // the grid fits its box (paginated, not scrolled)
  const overflow = await page.locator(".coll-grid").evaluate((el) => el.scrollHeight - el.clientHeight);
  console.log("JOKERS GRID OVERFLOW px:", overflow);

  // Next page advances the indicator.
  await page.getByRole("button", { name: /Next/ }).click();
  await page.waitForTimeout(150);
  const info2 = (await page.locator(".comp-pager-info").textContent())?.trim() ?? "";
  console.log("JOKERS PAGER after Next:", info2);
  await panel.screenshot({ path: "screenshots/compendium-jokers-p2.png" });

  // assertions
  expect(shortBox).not.toBeNull();
  expect(longBox).not.toBeNull();
  expect(Math.abs(shortBox!.height - longBox!.height)).toBeLessThanOrEqual(1); // same size across tabs
  expect(Math.abs(shortBox!.width - longBox!.width)).toBeLessThanOrEqual(1);
  expect(info1).toMatch(/Page 1 \/ \d+/);
  expect(overflow).toBeLessThanOrEqual(2); // the page fits — no scroll
  expect(info2).toMatch(/Page 2 \/ \d+/); // Next advanced
  expect(errors, errors.join("\n")).toEqual([]);
});
