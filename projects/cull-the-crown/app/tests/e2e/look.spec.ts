import { test, expect, Page } from "@playwright/test";

// Visual verification of the game-ready look. Drives the engine through the dev seam (window.__game)
// because the hand lives on a Pixi canvas, then screenshots the canvas element (reliable for WebGL;
// full-page screenshots can capture an un-preserved drawing buffer as black).

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __preview: any;
  }
}

async function shotCanvas(page: Page, name: string) {
  await page.locator("canvas").first().screenshot({ path: `screenshots/${name}.png` });
}

test("capture the look: tutorial, combat, cascade, defend, shop", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  await page.goto("/");

  // The tutorial auto-opens on a first visit (fresh localStorage).
  const dialog = page.getByRole("dialog", { name: "Rules" });
  await dialog.waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshots/00-help.png" });
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("heading", { name: "Cull the Crown" })).toBeVisible();
  await page.screenshot({ path: "screenshots/01-title.png" });

  await page.getByRole("button", { name: /New Run|Play/ }).first().click(); // main menu → setup overlay
  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/01b-setup.png" }); // the Balatro-style run setup overlay
  await page.getByRole("button", { name: "PLAY", exact: true }).click(); // start the run
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(1100);
  await shotCanvas(page, "02-combat");
  await page.screenshot({ path: "screenshots/02b-combat-full.png" });

  // Pause menu (the sidebar Options button in combat): freezes the board; rules / settings / save /
  // surrender live here.
  await page.getByRole("button", { name: "Options" }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: "screenshots/09-pause.png" });
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: "screenshots/10-settings.png" });
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  await page.waitForTimeout(150);

  // Hover preview: setting hoverId (with nothing selected) pops the info box — the suit legend +
  // that card's resolved powers — but no Play/Clear. Driven via the seam (real-pointer hover is
  // covered by input.spec); the box persists since no mouse move resets it.
  await page.evaluate(() => {
    const g = window.__game.getState();
    const id = g.run.hand[0]?.id;
    if (id) g.setHoverId(id);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/03h-hover-full.png" });
  await page.evaluate(() => window.__game.getState().setHoverId(null));

  // Hover the board, select + play a card to capture the hit cascade.
  await page.mouse.move(640, 480);
  await page.evaluate(() => {
    const g = window.__game.getState();
    const id = g.run.hand[0]?.id;
    if (id) g.toggleSelect(id);
  });
  await page.waitForTimeout(450);
  await shotCanvas(page, "03-selected");
  await page.screenshot({ path: "screenshots/03b-selected-full.png" }); // action pop-up overlay
  await page.evaluate(() => window.__game.getState().playCards());
  await page.waitForTimeout(180);
  await shotCanvas(page, "04-cascade");
  await page.waitForTimeout(900);
  await shotCanvas(page, "05-defend");

  // Deck composition modal — opened via the dev seam (robust to the full-screen board's letterboxing,
  // which makes canvas-pixel coordinates unreliable).
  await page.evaluate(() => window.__game.getState().setPileModal("deck"));
  await page.waitForTimeout(250);
  await page.screenshot({ path: "screenshots/07-deck-modal.png" });
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(150);

  // Seed-search to a winnable kill, then PAUSE on the felled gate (no auto-advance).
  const result = await page.evaluate(() => {
    const fightToKill = (): string => {
      for (let i = 0; i < 200; i++) {
        const g = window.__game.getState();
        const r = g.run;
        if (r.phase !== "combat") return "ended";
        const c = r.combat;
        if (c.outcome === "won") return "won"; // stop here — let the gate show
        if (c.outcome === "lost") return "lost"; // dead end for this seed; try the next
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

  // The battle screen stays on the felled royal; the Continue gate appears after a short delay.
  await page.waitForTimeout(1350);
  await page.screenshot({ path: "screenshots/08-felled-gate.png" });
  await page.getByRole("button", { name: /Claim/ }).click();
  // coin animation, then advance to shop — wait on the real phase (robust to layout/CSS changes)
  await page.waitForFunction(() => window.__game.getState().run.phase === "shop", { timeout: 8000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/06-shop.png" });
  // best-effort art crops (don't fail the run if the shop layout is mid-change)
  await page.locator(".shop-stage").screenshot({ path: "screenshots/06b-shop-art.png", timeout: 4000 }).catch(() => {});
  const offers = page.locator(".offers");
  await offers.nth(0).screenshot({ path: "screenshots/06c-jokers.png", timeout: 4000 }).catch(() => {});
  await offers.nth(1).screenshot({ path: "screenshots/06d-consumables.png", timeout: 4000 }).catch(() => {});
  const phase = await page.evaluate(() => window.__game.getState().run.phase);
  console.log("PHASE AFTER CONTINUE:", phase);

  expect(phase).toBe("shop");
  expect(errors, errors.join("\n")).toEqual([]);
});
