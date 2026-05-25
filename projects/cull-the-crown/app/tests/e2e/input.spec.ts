import { test, expect, Page } from "@playwright/test";

// Real-pointer input regression: tap-to-select and drag-to-play (the hand is a Pixi canvas, so
// these exercise the stage's geometry-based hit testing, not the dev seam).

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __preview: any;
  }
}

async function cardScreenPos(page: Page, index: number) {
  // the felt is no longer the first canvas on the page (the Pixi run-sidebar precedes it) — target it.
  const box = (await page.locator(".pixi-host canvas").boundingBox())!;
  const n = await page.evaluate(() => window.__game.getState().run.hand.length);
  const spacing = Math.min(42, 300 / Math.max(1, n));
  const totalW = spacing * (n - 1);
  const stageX = 480 / 2 - totalW / 2 + index * spacing;
  const t = n > 1 ? index / (n - 1) - 0.5 : 0;
  const stageY = 360 - 64 + t * t * 16; // HAND_Y = STAGE_H - 64 (cards lifted for the felt sort bar)
  return { x: box.x + (stageX / 480) * box.width, y: box.y + (stageY / 360) * box.height, box };
}

async function enterCombat(page: Page) {
  await page.goto("/");
  const gotIt = page.getByRole("button", { name: "Close" });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  // Start via the engine seam — New Run / PLAY are now Pixi canvas, not DOM buttons.
  await page.evaluate(() => window.__game.getState().newRun("input-demo"));
  await page.locator(".pixi-host canvas").first().waitFor();
  await page.waitForTimeout(1000);
}

test("tap selects a card", async ({ page }) => {
  await enterCombat(page);
  const c0 = await cardScreenPos(page, 0);
  await page.mouse.click(c0.x, c0.y);
  await page.waitForTimeout(120);
  const selected = await page.evaluate(() => window.__game.getState().selected);
  expect(selected.length).toBe(1);
});

test("drag a card into the play zone plays it", async ({ page }) => {
  await enterCombat(page);
  const before = await page.evaluate(() => ({ hand: window.__game.getState().run.hand.length, log: window.__game.getState().run.log.length }));
  const c0 = await cardScreenPos(page, 0);
  await page.mouse.move(c0.x, c0.y);
  await page.mouse.down();
  await page.mouse.move(c0.box.x + c0.box.width / 2, c0.box.y + c0.box.height * 0.28, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({ hand: window.__game.getState().run.hand.length, log: window.__game.getState().run.log.length }));
  expect(after.log).toBeGreaterThan(before.log);
  expect(after.hand).toBeLessThan(before.hand);
});

async function dragCardUp(page: Page, index: number) {
  const c = await cardScreenPos(page, index);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.box.x + c.box.width * (0.4 + 0.05 * index), c.box.y + c.box.height * 0.25, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);
}

test("drag cards up in defend blocks the strike", async ({ page }) => {
  await enterCombat(page);
  // play the lowest card so the royal survives and counter-attacks -> defend subphase
  await page.evaluate(() => {
    const g = window.__game.getState();
    let lo = g.run.hand[0]?.id;
    let lv = 99;
    for (const c of g.run.hand) if (c.value < lv) { lv = c.value; lo = c.id; }
    g.clearSelect();
    g.toggleSelect(lo);
    g.playCards();
  });
  await page.waitForTimeout(900); // strike animation
  expect(await page.evaluate(() => window.__game.getState().run.combat?.subphase)).toBe("defend");

  // throw distinct cards onto the block by dragging them up; stop once it resolves
  for (let i = 0; i < 6; i++) {
    const sub = await page.evaluate(() => window.__game.getState().run.combat?.subphase);
    if (sub !== "defend") break;
    await dragCardUp(page, i);
  }
  expect(await page.evaluate(() => window.__game.getState().run.combat?.subphase)).toBe("play");
});

test("a fatal blow shows a YOU FALL gate — no instant game over", async ({ page }) => {
  await enterCombat(page);
  // seed-search for a first fight the greedy loses; stop the instant it turns lethal (outcome 'lost')
  const found = await page.evaluate(() => {
    const fight = (): string => {
      for (let i = 0; i < 200; i++) {
        const g = window.__game.getState();
        const c = g.run.combat;
        if (g.run.phase !== "combat" || !c) return "ended";
        if (c.outcome === "lost") return "lost";
        if (c.outcome === "won") return "won";
        if (c.subphase === "defend") {
          const sorted = [...g.run.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
          let sum = 0;
          const pick: string[] = [];
          for (const card of sorted) { if (sum >= c.incoming) break; pick.push(card.id); sum += card.value; }
          g.clearSelect();
          pick.forEach((id: string) => window.__game.getState().toggleSelect(id));
          window.__game.getState().discardSelected();
        } else {
          let best: string | null = null;
          let bd = -1;
          for (const card of g.run.hand) { const r = window.__preview([card.id]); if (r.valid && r.damage > bd) { bd = r.damage; best = card.id; } }
          if (best == null) window.__game.getState().yieldTurn();
          else { window.__game.getState().clearSelect(); window.__game.getState().toggleSelect(best); window.__game.getState().playCards(); }
        }
      }
      return "timeout";
    };
    for (let seed = 0; seed < 60; seed++) {
      window.__game.getState().newRun("lose" + seed);
      if (fight() === "lost") return "lost@" + seed;
    }
    return "none";
  });
  expect(found.startsWith("lost")).toBe(true);

  // the run must NOT have auto-switched — still in combat, deferred
  expect(await page.evaluate(() => window.__game.getState().run.phase)).toBe("combat");
  await page.waitForTimeout(1700); // killing-blow animation, then the (Pixi) gate
  await page.screenshot({ path: "screenshots/09-you-fall.png" });
  // the gate is now a Pixi modal (no DOM button) — "See the end" advances via dispatch(advance)
  await page.evaluate(() => window.__game.getState().dispatch({ type: "advance" }));
  expect(await page.evaluate(() => window.__game.getState().run.phase)).toBe("lost");
});
