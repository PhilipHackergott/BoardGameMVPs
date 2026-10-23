import { test, Page } from "@playwright/test";

// (we use `(window as any).__game` directly inside evaluate callbacks; no Win type alias needed)

// Visual audit of: (a) the in-combat card face when sigils + a seal are applied (each enhancement
// should produce a full-card overlay, not only a corner code), and (b) the pack-opening take-over
// when a Tarot/Style pack is dispatched (the shop tray should slide down off-felt, the picks should
// sit against the plasma at battle-card size with no backdrop panel). Pure screenshot capture —
// confirms the visual changes survived in a real headless render.

async function startRun(page: Page): Promise<void> {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).__game.getState();
    g.newRun("visual-1");
  });
  await page.waitForTimeout(600);
}

test("combat hand: every sigil + seal produces a whole-card visual overlay", async ({ page }: { page: Page }) => {
  await startRun(page);

  await page.evaluate(() => {
    const sigils = ["keen", "warded", "gilded", "runed", "honed", "steel", "glass", "minted", "charmed", "stoneskin", "wildcard"];
    const seals: ("gold" | "red" | "blue" | "purple")[] = ["gold", "red", "blue", "purple"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__game.setState((s: any) => {
      const hand = [...s.run.hand];
      for (let i = 0; i < hand.length; i++) {
        const sg = sigils[i % sigils.length];
        const seal = i < seals.length ? seals[i] : undefined;
        hand[i] = { ...hand[i], sigils: [sg], seal };
      }
      return { run: { ...s.run, hand } };
    });
  });
  await page.waitForTimeout(900); // let CardNode rebuild via sigStr change
  await page.screenshot({ path: "screenshots/zz-visual-hand-enhancements.png" });
});

test("pack opening: shop tray slides off-felt, picks sit on plasma at battle-card size", async ({ page }: { page: Page }) => {
  await startRun(page);

  // Win the current fight artificially so we go to shop.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__game.setState((s: any) => {
      const c = s.run.combat;
      if (!c) return {};
      return { run: { ...s.run, combat: { ...c, enemy: { ...c.enemy, damageTaken: c.enemy.maxHealth }, outcome: "won" } } };
    });
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__game.getState().dispatch({ type: "advance" });
  });
  await page.waitForTimeout(1500);
  // We should be in shop now — take a baseline screenshot first
  await page.screenshot({ path: "screenshots/zz-visual-shop-baseline.png" });

  // Open a tarot pack synthetically by dispatching openPack on a fabricated pack offer in the shop.
  // The shop offers structure varies; instead, dispatch directly via the run action.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__game.setState((s: any) => {
      const r = s.run;
      if (r.phase !== "shop" || !r.shop) return {};
      // Mock a pack open: tarot pack with two picks (size "M") — picks pulled from any 2 tarot ids
      // present in the engine. We just need the take-over to fire so we can screenshot it.
      const openPack = {
        kind: "tarot" as const,
        size: "M" as const,
        contentIds: ["the-fool", "the-magician"],
        picksRemaining: 1,
        priceWas: 4,
      };
      return { run: { ...r, shop: { ...r.shop, openPack } } };
    });
  });
  await page.waitForTimeout(900); // let the tray cover animation + pack mount finish
  await page.screenshot({ path: "screenshots/zz-visual-pack-tarot.png" });

  // Now switch to a style (Training) pack and re-screenshot
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__game.setState((s: any) => {
      const openPack = {
        kind: "style" as const,
        size: "S" as const,
        contentIds: ["drill-mage", "drill-mounted"],
        picksRemaining: 1,
        priceWas: 4,
      };
      return { run: { ...s.run, shop: { ...s.run.shop, openPack } } };
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/zz-visual-pack-style.png" });
});
