import { expect, test, type Page } from "@playwright/test";

// Ship-review visual pass: screenshots the wave-3 UI surfaces that unit tests can't
// cover — main menu, config-gated draft zones, the left/right flanking layout for
// 3-4 players, player-panel affinity text + collapsible flowers, the game-log modal
// (flower icons), and the all-AI Pause/Play control. Drives setup through the store
// exposed by the dev seam (window.__nightweave.getState() returns zustand actions).
const DIR = "../playtest/round-4";

async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__nightweave);
}

// Start a game/draft with a config override, via the store (skips menu widgets).
async function start(page: Page, over: Record<string, unknown>) {
  await page.evaluate((o) => {
    const s = (window as any).__nightweave.getState();
    s.startGame({ ...s.config, ...o });
  }, over);
}

// Resolve a whole draft by repeatedly taking the first available option.
async function resolveDraft(page: Page) {
  await page.evaluate(() => {
    const nw = (window as any).__nightweave;
    for (let i = 0; i < 60; i++) {
      const st = nw.getState();
      if (st.screen !== "draft" || !st.draft) break;
      const d = st.draft;
      if (d.mode === "powers") st.draftPower(d.pool[0]);
      else st.draftAffinity(d.affinityPool[0]);
    }
  });
}

// First legal move's flowers mapped to client px (for clicking on the canvas).
async function firstMovePts(page: Page) {
  return page.evaluate(() => {
    const nw = (window as any).__nightweave;
    const g = nw?.getState().game;
    if (!g) return null;
    const moves = nw.legalMoves(g);
    if (moves.length === 0) return null;
    const m = moves[0];
    const a = g.stars.find((s: any) => s.id === m.aStarId);
    const b = g.stars.find((s: any) => s.id === m.bStarId);
    const canvas = document.querySelector(".board-host canvas") as HTMLCanvasElement;
    const r = canvas.getBoundingClientRect();
    const c = nw.center as number;
    const size = c * 2;
    const toClient = (x: number, y: number) => ({
      x: r.left + ((c + x) / size) * r.width,
      y: r.top + ((c + y) / size) * r.height,
    });
    let bestT = 0.5;
    let bestD = -1;
    for (let t = 0.2; t <= 0.8; t += 0.05) {
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      let md = Infinity;
      for (const s of g.stars) md = Math.min(md, Math.hypot(s.x - px, s.y - py));
      if (md > bestD) {
        bestD = md;
        bestT = t;
      }
    }
    return { a: toClient(a.x, a.y), safe: toClient(a.x + (b.x - a.x) * bestT, a.y + (b.y - a.y) * bestT) };
  });
}

test("landing menu navigates between views", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await expect(page.getByRole("button", { name: /New Game/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue/ })).toBeDisabled();
  await page.waitForTimeout(200); // let a couple plasma frames paint
  await page.screenshot({ path: `${DIR}/18-landing.png`, fullPage: true });

  await page.getByRole("button", { name: /New Game/ }).click();
  await expect(page.locator(".menu-sheet")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start game|Draft & start/ })).toBeVisible();
  await page.screenshot({ path: `${DIR}/19-newgame-sheet.png`, fullPage: true });

  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.getByText("Animated background")).toBeVisible();
  await page.screenshot({ path: `${DIR}/20-settings.png`, fullPage: true });

  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("button", { name: /Past Runs/ }).click();
  await expect(page.locator(".menu-sheet")).toBeVisible();
  await page.screenshot({ path: `${DIR}/21-pastruns.png`, fullPage: true });

  expect(errors, errors.join("\n")).toEqual([]);
});

test("menu, config-gated drafts, and player panels", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await page.screenshot({ path: `${DIR}/10-menu.png`, fullPage: true });

  // Dual draft: powers + affinities both enabled, all human so it waits.
  await start(page, { players: 2, draftPicks: 2, affinitiesOn: true, ai: [null, null] });
  await page.waitForSelector(".draft-columns");
  await expect(page.locator(".draft-zone")).toHaveCount(2);
  await page.screenshot({ path: `${DIR}/11-draft-dual.png`, fullPage: true });

  // Affinities only: the Powers zone must NOT render (config-gated, single column).
  await page.evaluate(() => (window as any).__nightweave.getState().returnToMenu());
  await start(page, { players: 2, draftPicks: 0, affinitiesOn: true, ai: [null, null] });
  await page.waitForSelector(".draft-columns.single");
  await expect(page.locator(".draft-zone")).toHaveCount(1);
  await page.screenshot({ path: `${DIR}/12-draft-affinities-only.png`, fullPage: true });

  // Resolve it into a game; player panels should show affinity name + blurb.
  await resolveDraft(page);
  await page.waitForSelector(".board-host canvas");
  await expect(page.locator(".pc-affinity").first()).toBeVisible();
  await page.screenshot({ path: `${DIR}/13-panels-affinity.png`, fullPage: true });

  // Collapse a flower breakdown.
  await page.locator(".pc-flowers-toggle").first().click();
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${DIR}/14-flowers-collapsed.png`, fullPage: true });

  expect(errors, errors.join("\n")).toEqual([]);
});

test("four-player flanking layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await start(page, { players: 4, draftPicks: 0, affinitiesOn: false, ai: [null, null, null, null] });
  await page.waitForSelector(".board-host canvas");
  // Two flanks, two columns each — boards beside the pond, not beneath.
  await expect(page.locator(".board-main > .side")).toHaveCount(2);
  await expect(page.locator(".player-col")).toHaveCount(4);
  await page.screenshot({ path: `${DIR}/15-fourplayer-layout.png`, fullPage: true });

  expect(errors, errors.join("\n")).toEqual([]);
});

test("game log shows flower icons", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await page.evaluate(() => (window as any).__nightweave.newGame("12345"));
  await page.waitForSelector(".board-host canvas");

  // Claim + place a few pawns so the log has flower entries.
  for (let i = 0; i < 5; i++) {
    const mv = await firstMovePts(page);
    if (!mv) break;
    await page.mouse.click(mv.a.x, mv.a.y);
    await page.mouse.move(mv.safe.x, mv.safe.y);
    await page.mouse.click(mv.safe.x, mv.safe.y);
    await page.waitForTimeout(60);
  }

  await page.getByRole("button", { name: "Log" }).click();
  await expect(page.locator(".log-list")).toBeVisible();
  await expect(page.locator(".log-glyph").first()).toBeVisible();
  await page.screenshot({ path: `${DIR}/16-game-log.png`, fullPage: true });

  expect(errors, errors.join("\n")).toEqual([]);
});

test("all-AI match shows a Pause control", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await start(page, { players: 2, draftPicks: 0, affinitiesOn: false, ai: ["low", "low"] });
  await page.waitForSelector(".board-host canvas");

  const pause = page.getByRole("button", { name: /Pause/ });
  await expect(pause).toBeVisible();
  await page.screenshot({ path: `${DIR}/17-allai-pause.png`, fullPage: true });

  // Toggling pause sets the store flag and the button flips to Play.
  await pause.click();
  await expect(page.getByRole("button", { name: /Play/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__nightweave.getState().paused)).toBe(true);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("zodiac theme reskins the menu and board", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await ready(page);
  await page.evaluate(() => (window as any).__nightweave.getState().setSettings({ theme: "zodiac" }));
  await expect(page.getByText("A watercolor star-chart")).toBeVisible();
  await page.waitForTimeout(300); // let a couple plasma frames paint
  await page.screenshot({ path: `${DIR}/22-zodiac-menu.png`, fullPage: true });

  // Start a base game; claim a starting star so a planet name shows in a panel.
  await start(page, { players: 2, draftPicks: 0, affinitiesOn: false, ai: [null, null] });
  await page.waitForSelector(".board-host canvas");
  const claim = await firstMovePts(page);
  if (claim) await page.mouse.click(claim.a.x, claim.a.y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/23-zodiac-board.png`, fullPage: true });
  await expect(page.getByText(/Sol|Luna|Mercury|Venus|Mars|Jupiter|Saturn/)).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
