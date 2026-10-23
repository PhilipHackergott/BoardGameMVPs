import { test, expect, Page } from "@playwright/test";

// Disable CSS animations so Playwright actionability "stable" checks pass fast (build-gotchas: Roomies).
async function freeze(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function state(page: Page): Promise<any> {
  return page.evaluate(() => (window as unknown as { __prism: { state: () => unknown } }).__prism.state());
}

test("boots to the menu and the shell screens render", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await freeze(page);

  await expect(page.locator(".menu-title")).toHaveText("PRISM");
  await page.screenshot({ path: "screenshots/01-menu.png" });

  // gallery
  await page.getByRole("button", { name: /Card Gallery/ }).click();
  await expect(page.locator(".set-grid .card").first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "screenshots/02-gallery.png" });
  await page.getByRole("button", { name: /Back/ }).first().click();

  // deckbuilder
  await page.getByRole("button", { name: /Deck Builder/ }).click();
  await expect(page.locator(".pool-grid .card").first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "screenshots/03-deckbuilder.png" });

  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("a duel plays a turn through real pointer input", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await freeze(page);

  // Quick Play -> Starter duel
  await page.getByRole("button", { name: /Quick Play/ }).click();
  await page.getByRole("button", { name: /Starter Duel/ }).click();

  // the board + hand render
  await expect(page.locator(".board .lane")).toHaveCount(3);
  await expect(page.locator('[data-testid="hand"] .card').first()).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "screenshots/04-duel.png" });

  const before = (await state(page)) as { duel: { turn: number } };

  // Try to deploy: click the first selectable hand card, then a droppable lane if one appears.
  const sel = page.locator('[data-testid="hand"] .card.selectable').first();
  if (await sel.count()) {
    await sel.click();
    const drop = page.locator(".slot.droppable").first();
    if (await drop.count()) {
      await drop.click();
      await page.screenshot({ path: "screenshots/05-deployed.png" });
    }
  }

  // End the turn and let the AI act; the turn counter must advance (full round) without errors.
  await page.getByRole("button", { name: /End Turn/ }).click();
  await expect
    .poll(async () => ((await state(page)) as { duel: { turn: number } | null }).duel?.turn ?? 0, { timeout: 15000 })
    .toBeGreaterThan(before.duel.turn);

  await page.screenshot({ path: "screenshots/06-after-round.png" });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("Act I world renders and a story interaction advances the beat", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await freeze(page);

  await page.getByRole("button", { name: /Story . Act I/ }).click();
  // pick a year-level context, then opening dialogue + the room
  await page.locator(".mode-card").first().click();
  await expect(page.locator(".dialogue-box")).toBeVisible({ timeout: 10000 });
  for (let i = 0; i < 4; i++) await page.evaluate(() => (window as unknown as { __prism: { state: () => { advanceDialogue: () => void } } }).__prism.state().advanceDialogue());
  await expect(page.locator(".overworld-canvas")).toBeVisible();
  await expect(page.locator(".ow-objective")).toContainText(/sister/i);
  await page.screenshot({ path: "screenshots/07-world-home.png" });

  // drive the first story interaction (deterministic — movement is verified by hand/screens)
  const beat0 = (await state(page)).career.beat as number;
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { worldInteract: (id: string) => void } } }).__prism.state().worldInteract("sis"));
  await expect(page.locator(".dialogue-box")).toBeVisible();
  for (let i = 0; i < 6; i++) await page.evaluate(() => (window as unknown as { __prism: { state: () => { advanceDialogue: () => void } } }).__prism.state().advanceDialogue());
  await expect.poll(async () => (await state(page)).career.beat as number, { timeout: 8000 }).toBeGreaterThan(beat0);

  // exercise the movement loop (smoke) and screenshot
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowDown");
  await page.screenshot({ path: "screenshots/08-world.png" });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("economy + life-sim overlays render (status, market, pack reveal)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await freeze(page);

  // start a story directly via the seam (deterministic), then drive overlays
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { startStory: (c?: string) => void } } }).__prism.state().startStory("hs_senior"));
  await expect(page.locator(".overworld-canvas")).toBeVisible({ timeout: 10000 });
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { advanceDialogue: () => void } } }).__prism.state().advanceDialogue());
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { advanceDialogue: () => void } } }).__prism.state().advanceDialogue());

  // status overlay
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { openOverlay: (o: string) => void } } }).__prism.state().openOverlay("status"));
  await expect(page.locator(".stat-row").first()).toBeVisible();
  await page.screenshot({ path: "screenshots/09-status.png" });
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { closeOverlay: () => void } } }).__prism.state().closeOverlay());

  // earn money (work shifts), then buy + open a pack
  for (let i = 0; i < 3; i++) await page.evaluate(() => (window as unknown as { __prism: { state: () => { doActivity: (id: string) => void } } }).__prism.state().doActivity("work"));
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { buyPack: (id: string) => void } } }).__prism.state().buyPack("pr1_booster"));
  await expect(page.locator(".pack-card").first()).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "screenshots/10-pack.png" });
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { closePackReveal: () => void } } }).__prism.state().closePackReveal());

  // market app
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { openOverlay: (o: string) => void } } }).__prism.state().openOverlay("market"));
  await expect(page.locator(".market-row").first()).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "screenshots/11-market.png" });

  // tournament sign-up board
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { openOverlay: (o: string) => void } } }).__prism.state().openOverlay("tournament"));
  await expect(page.getByText("Friday Night PRISM")).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "screenshots/12-tournament.png" });

  // community (PrismNexus): news / forum / blog
  await page.evaluate(() => (window as unknown as { __prism: { state: () => { openOverlay: (o: string) => void } } }).__prism.state().openOverlay("community"));
  await expect(page.locator(".news-item").first()).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: "screenshots/13-community.png" });

  expect(errors, errors.join("\n")).toHaveLength(0);
});
