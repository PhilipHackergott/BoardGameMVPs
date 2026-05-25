import { test, expect, Page } from "@playwright/test";

// Captures the new combat feel in REAL (paced) play — the per-fighting-style attack animation and the
// fully-blocked parry beat — and asserts no errors during normal play. Screenshots the canvas element
// (reliable for WebGL; full-page WebGL shots can come back black).

async function startRun(page: Page) {
  await page.goto("/");
  const tut = page.getByRole("dialog", { name: "Rules" });
  if (await tut.isVisible().catch(() => false)) await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: /New Run|Play/ }).first().click();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.locator("canvas").first().waitFor();
  await page.waitForTimeout(900);
}

// Screenshot the FELT (the Pixi board canvas, hosted in .pixi-host) — reliable for WebGL.
const shot = (page: Page, name: string) => page.locator(".pixi-host canvas").first().screenshot({ path: `screenshots/${name}.png` });

test("combat: style-strike animation + fully-blocked parry (paced, no errors)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  await startRun(page);

  // 1) Style-strike: play the biggest single card and grab a frame while the strike flies at the royal.
  await page.evaluate(() => {
    const g = window.__game.getState();
    let best: string | null = null, bv = -1;
    for (const c of g.run.hand) { if (c.kind !== "jester" && c.value > bv) { bv = c.value; best = c.id; } }
    if (best) { g.clearSelect(); g.toggleSelect(best); window.__game.getState().playCards(); }
  });
  await page.waitForTimeout(150);
  await shot(page, "combat-style-strike");

  // 2) Fully-blocked parry: a full block needs shield ≥ the royal's attack in ONE turn. The 10♠ (or a
  //    high Spade + Ace of Spades) shields enough to fully absorb a Jack's 10 counter while the royal
  //    (20 HP) survives. Seed-search a fresh run for such an opener, play it (paced → no FX burst), and
  //    capture the parry beat. The play itself sets fxEvent.blocked when the counter is fully turned aside.
  const blocked = await page.evaluate(() => {
    for (let seed = 0; seed < 60; seed++) {
      window.__game.getState().newRun("blk" + seed);
      const g = window.__game.getState();
      const r = g.run;
      if (r.phase !== "combat" || !r.combat) continue;
      const atk = r.combat.enemy.attack;
      const hp = r.combat.enemy.maxHealth - r.combat.enemy.damageTaken;
      // a single Spade whose shield (= value) fully covers the attack but doesn't kill
      const sp = r.hand.find((c: { suit: string | null; kind: string; value: number }) => c.suit === "S" && c.kind !== "jester" && c.value >= atk && c.value < hp);
      if (!sp) continue;
      g.clearSelect(); g.toggleSelect(sp.id); window.__game.getState().playCards();
      if (window.__game.getState().fxEvent?.blocked === true) return true;
    }
    return false;
  });
  if (blocked) {
    await page.waitForTimeout(1150); // wait out the paced enemy turn → the parry beat lands (~1.05s)
    await shot(page, "combat-parry");
  }
  console.log("FULLY-BLOCKED PARRY captured:", blocked);

  expect(blocked, "should be able to stage a fully-blocked attack").toBe(true);
  expect(errors, errors.join("\n")).toEqual([]);
});
