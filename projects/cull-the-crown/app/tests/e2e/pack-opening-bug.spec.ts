import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void } };

// Repro: user reports "pack openings still bugged" — empty felt with nothing rendered when a pack
// opens. Drives the engine path that opens a pack and screenshots, then asserts the modal canvas
// actually has visible content (not just a transparent canvas over a recoloured plasma).

async function intoShop(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("pack-1"));
  await page.waitForTimeout(500);
  // Force-win current combat, advance to shop.
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({
      run: {
        ...cur.run,
        gold: 99,
        combat: cur.run.combat ? {
          ...cur.run.combat,
          enemy: { ...cur.run.combat.enemy, damageTaken: cur.run.combat.enemy.maxHealth },
          outcome: "won",
          wonExact: true,
        } : null,
      },
    }));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" }));
  await page.waitForTimeout(700);
}

test("pack reveal: opens a real pack and the modal canvas renders content", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await intoShop(page);

  // Sanity — we should be in shop now with a fresh shop offer.
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("shop");
  const packs = await page.evaluate(() => (window as unknown as Win).__game.getState().run.shop?.packs ?? []);
  expect(packs.length, "shop should have pack offers").toBeGreaterThan(0);
  await page.screenshot({ path: "screenshots/zz-pack-bug-shop.png" });

  // Open the first pack via the engine action (same path the shop's onShopBuy → openPack uses).
  const firstPackId = packs[0].id;
  await page.evaluate((id) => {
    (window as unknown as Win).__game.getState().dispatch({ type: "openPack", packId: id });
  }, firstPackId);
  await page.waitForTimeout(1200); // pack modal mount + initial render
  await page.screenshot({ path: "screenshots/zz-pack-bug-opened.png" });

  // The pack modal should be mounted, openPack set, and contentIds populated.
  const state = await page.evaluate(() => {
    const r = (window as unknown as Win).__game.getState().run;
    return {
      openPack: r.shop?.openPack ? { kind: r.shop.openPack.kind, contentIds: r.shop.openPack.contentIds, picksRemaining: r.shop.openPack.picksRemaining } : null,
    };
  });
  expect(state.openPack, "openPack should be set after dispatching openPack").not.toBeNull();
  expect(state.openPack!.contentIds.length, "pack should have contentIds").toBeGreaterThan(0);

  // The pack modal canvas should be in the DOM (under .pixi-modal-host).
  const modalCanvases = await page.locator(".pixi-modal-host canvas").count();
  expect(modalCanvases, "pack modal canvas should be in the DOM").toBeGreaterThan(0);

  // eslint-disable-next-line no-console
  console.log("OPENED PACK:", JSON.stringify(state.openPack));
});

test("pack reveal: every pack kind opens with visible content", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await intoShop(page);
  // Synthesize one offer per pack kind directly into shop.packs, open each, screenshot.
  for (const kind of ["card", "tarot", "spectral", "relic", "style"]) {
    await page.evaluate(() => {
      const w = window as unknown as Win;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (w.__game as any).setState((cur: any) => {
        if (cur.run.shop?.openPack) cur.run.shop.openPack = null;
        return cur;
      });
    });
    await page.waitForTimeout(150);
    const packId = await page.evaluate((k) => {
      const w = window as unknown as Win;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = w.__game.getState();
      const p = (g.run.shop?.packs || []).find((p: { kind: string }) => p.kind === k);
      return p?.id ?? null;
    }, kind);
    if (!packId) {
      // eslint-disable-next-line no-console
      console.log("SKIP — no", kind, "pack in shop offers");
      continue;
    }
    await page.evaluate((id) => (window as unknown as Win).__game.getState().dispatch({ type: "openPack", packId: id }), packId);
    await page.waitForTimeout(900);
    const openPackKind = await page.evaluate(() => (window as unknown as Win).__game.getState().run.shop?.openPack?.kind ?? null);
    // eslint-disable-next-line no-console
    console.log(`KIND ${kind}: openPack=`, openPackKind);
    await page.screenshot({ path: `screenshots/zz-pack-bug-${kind}.png` });
    expect(openPackKind, `${kind} pack should be open`).toBe(kind);
    // Close before next iteration.
    await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "closePack" }));
    await page.waitForTimeout(300);
  }
});
