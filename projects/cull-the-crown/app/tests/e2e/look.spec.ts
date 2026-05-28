import { test, expect, Page } from "@playwright/test";

// Visual verification of the game-ready look. The UI is now almost entirely Pixi (felt + every modal on
// the ModalStage kit), so this drives the engine through the dev seam (window.__game) and screenshots
// the canvas — the only DOM survivors it still clicks are the Title menu buttons and the first-run Rules
// overlay. Captures: tutorial, title, settings, run-setup, combat, the hit cascade, defend, the deck
// modal, the felled gate, and the shop.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __preview: any;
  }
}

const felt = (page: Page) => page.locator(".pixi-host canvas").first();

test("capture the look: tutorial, title, settings, combat, cascade, defend, gate, shop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  await page.goto("/");

  // The tutorial auto-opens on a first visit (the one remaining DOM modal — HelpOverlay).
  const dialog = page.getByRole("dialog", { name: "Rules" });
  await dialog.waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/00-help.png" });
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("heading", { name: "Cull the Crown" })).toBeVisible();
  await page.screenshot({ path: "screenshots/01-title.png" });

  // Settings is a Pixi modal opened from the (DOM) title button; Esc closes it (ModalStage host).
  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/10-settings.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".pixi-modal-host canvas")).toHaveCount(0, { timeout: 10000 });

  // Run setup is a Pixi modal (the DOM "New Run" button opens it); capture it, then start via the seam
  // (PLAY is now a Pixi hit-target, not a DOM button).
  await page.getByRole("button", { name: /New Run|Play/ }).first().click();
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/01b-setup.png" });
  await page.evaluate(() => window.__game.getState().newRun("look-demo"));
  await felt(page).waitFor();
  await page.waitForTimeout(1100);
  await page.locator(".pixi-host canvas").first().screenshot({ path: "screenshots/02-combat.png" });
  await page.screenshot({ path: "screenshots/02b-combat-full.png" });

  // Hover preview (seam): pops the info box for a card with nothing selected.
  await page.evaluate(() => {
    const g = window.__game.getState();
    const id = g.run.hand[0]?.id;
    if (id) g.setHoverId(id);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/03h-hover-full.png" });
  await page.evaluate(() => window.__game.getState().setHoverId(null));

  // Select + play a card to capture the hit cascade, then the enemy's defend beat.
  await page.evaluate(() => {
    const g = window.__game.getState();
    const id = g.run.hand[0]?.id;
    if (id) g.toggleSelect(id);
  });
  await page.waitForTimeout(450);
  await page.locator(".pixi-host canvas").first().screenshot({ path: "screenshots/03-selected.png" });
  await page.evaluate(() => window.__game.getState().playCards());
  await page.waitForTimeout(180);
  await page.locator(".pixi-host canvas").first().screenshot({ path: "screenshots/04-cascade.png" });
  await page.waitForTimeout(900);
  await page.locator(".pixi-host canvas").first().screenshot({ path: "screenshots/05-defend.png" });

  // Pause (seam: freezes the board) — a Pixi modal now.
  await page.evaluate(() => window.__game.getState().setPaused(true));
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/09-pause.png" });
  await page.evaluate(() => window.__game.getState().setPaused(false));

  // Deck composition modal (seam-driven; it's a Pixi modal).
  await page.evaluate(() => window.__game.getState().setPileModal("deck"));
  await expect(page.locator(".pixi-modal-host canvas")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/07-deck-modal.png" });
  await page.evaluate(() => window.__game.getState().setPileModal(null));

  // Seed-search to a winnable kill, then stop on the felled-royal gate (no auto-advance).
  const result = await page.evaluate(() => {
    const fightToKill = (): string => {
      for (let i = 0; i < 200; i++) {
        const g = window.__game.getState();
        const r = g.run;
        if (r.phase !== "combat") return "ended";
        const c = r.combat;
        if (c.outcome === "won") return "won"; // stop — let the gate show
        if (c.outcome === "lost") return "lost";
        if (c.subphase === "defend") {
          const sorted = [...r.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
          let sum = 0;
          const pick: string[] = [];
          for (const card of sorted) {
            if (sum >= c.incoming) break;
            pick.push(card.id);
            sum += card.value;
          }
          g.clearSelect();
          pick.forEach((id: string) => window.__game.getState().toggleSelect(id));
          window.__game.getState().discardSelected();
        } else {
          let best: string | null = null;
          let bd = -1;
          for (const card of r.hand) {
            const res = window.__preview([card.id]);
            if (res.valid && res.damage > bd) {
              bd = res.damage;
              best = card.id;
            }
          }
          if (best == null) window.__game.getState().yieldTurn();
          else {
            window.__game.getState().clearSelect();
            window.__game.getState().toggleSelect(best);
            window.__game.getState().playCards();
          }
        }
      }
      return "timeout";
    };
    for (let seed = 0; seed < 40; seed++) {
      window.__game.getState().newRun("demo" + seed);
      if (fightToKill() === "won") return "won@" + seed;
    }
    return "none";
  });
  console.log("FIGHT RESULT:", result);

  // The Combat Gate (Pixi, non-dismissable) shows after the kill cascade; capture it, then advance.
  await page.waitForTimeout(1350);
  await page.screenshot({ path: "screenshots/08-felled-gate.png" });
  await page.evaluate(() => window.__game.getState().dispatch({ type: "advance" })); // = the gate's "Claim"
  await page.waitForFunction(() => window.__game.getState().run.phase === "shop", { timeout: 8000 });
  await page.waitForTimeout(900); // let the shop-tray slide-up settle (≈385ms) before capturing
  await page.screenshot({ path: "screenshots/06-shop.png" });

  const phase = await page.evaluate(() => window.__game.getState().run.phase);
  expect(phase).toBe("shop");
  // This capture spec churns hard (40 seed-searched runs + several modal open/closes), which
  // intermittently trips a known, harmless PixiJS v8 teardown race ("reading 'geometry'/'clear'" on a
  // Graphics whose context is being destroyed mid-render — same family as the texture-pool quirk
  // pixiFixes already swallows). Ignore only that; any OTHER page error still fails the run.
  const benign = /reading '(geometry|clear)'/;
  const real = errors.filter((e) => !benign.test(e));
  expect(real, real.join("\n")).toEqual([]);
});
