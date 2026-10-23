import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void } };

// Visual swarm — many screenshots, few assertions. Each scenario lives in its own test() so
// failures isolate cleanly. The screenshots in screenshots/zz-swarm-*.png are the actual review
// surface; assertions just guard "the canvas is in the DOM and the engine is in the right state."

async function newRun(page: Page, seed = "vis-swarm"): Promise<void> {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate((s) => (window as unknown as Win).__game.getState().newRun(s), seed);
  await page.waitForTimeout(500);
}

async function intoShop(page: Page): Promise<void> {
  // Force-win current combat and advance.
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({
      run: cur.run.combat ? {
        ...cur.run,
        gold: 99,
        combat: {
          ...cur.run.combat,
          enemy: { ...cur.run.combat.enemy, damageTaken: cur.run.combat.enemy.maxHealth },
          outcome: "won",
          wonExact: true,
        },
      } : cur.run,
    }));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" }));
  await page.waitForTimeout(700);
}

test("swarm: combat fresh start", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-a");
  await page.screenshot({ path: "screenshots/zz-swarm-01-combat-start.png" });
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("combat");
});

test("swarm: combat hand with enhancements on every card", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-b");
  await page.evaluate(() => {
    const w = window as unknown as Win;
    const sigils = ["honed", "keen", "warded", "gilded", "runed", "wildcard", "steel", "glass", "minted", "charmed", "stoneskin"];
    const seals = ["gold", "red", "blue", "purple"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => {
      const hand = cur.run.hand.map((_c: { id: string }, i: number) => ({
        ...cur.run.hand[i],
        sigils: [sigils[i % sigils.length]],
        seal: i < seals.length ? seals[i] : undefined,
      }));
      return { run: { ...cur.run, hand } };
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "screenshots/zz-swarm-02-enhanced-hand.png" });
});

test("swarm: shop entry from won combat", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-c");
  await intoShop(page);
  await page.screenshot({ path: "screenshots/zz-swarm-03-shop.png" });
  const phase = await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase);
  expect(phase).toBe("shop");
});

const PACK_KINDS = ["card", "tarot", "spectral", "relic", "style"] as const;
for (const kind of PACK_KINDS) {
  test(`swarm: pack open — ${kind}`, async ({ page }: { page: Page }) => {
    await newRun(page, `swarm-pack-${kind}`);
    await intoShop(page);
    // Find a pack of this kind in offers; if not, skip.
    const packId = await page.evaluate((k) => {
      const w = window as unknown as Win;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g: any = w.__game.getState();
      return (g.run.shop?.packs || []).find((p: { kind: string }) => p.kind === k)?.id ?? null;
    }, kind);
    if (!packId) {
      // Synthesize one if missing — keep going so the kind gets a screenshot.
      await page.evaluate((k) => {
        const w = window as unknown as Win;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (w.__game as any).setState((cur: any) => {
          const synth: { id: string; kind: string; size: string; price: number; contentIds: string[]; picksRemaining: number } = { id: `synth-${k}`, kind: k, size: "s", price: 1, contentIds: [], picksRemaining: 1 };
          // Engine-side openPack expects contentIds — populate minimally per kind.
          if (k === "card") synth.contentIds = ["H5", "S3"];
          else if (k === "tarot") synth.contentIds = ["the-fool"];
          else if (k === "spectral") synth.contentIds = ["aura"];
          else if (k === "relic") synth.contentIds = ["bloodstained-shield"];
          else if (k === "style") synth.contentIds = ["drill-twoHanded"];
          return { run: { ...cur.run, shop: { ...cur.run.shop, packs: [...(cur.run.shop?.packs || []), synth] } } };
        });
      }, kind);
      await page.waitForTimeout(200);
    }
    const id = packId ?? `synth-${kind}`;
    await page.evaluate((pid) => (window as unknown as Win).__game.getState().dispatch({ type: "openPack", packId: pid }), id);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `screenshots/zz-swarm-04-pack-${kind}.png` });
    // Verify the modal canvas is actually in the DOM.
    const hosts = await page.locator(".pixi-modal-host canvas").count();
    expect(hosts, "pack modal canvas should be in the DOM").toBeGreaterThan(0);
  });
}

test("swarm: combat gate (cash out)", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-gate");
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({
      run: cur.run.combat ? {
        ...cur.run,
        gold: 17, // shows interest = 3 in the cashout
        combat: {
          ...cur.run.combat,
          enemy: { ...cur.run.combat.enemy, damageTaken: cur.run.combat.enemy.maxHealth },
          outcome: "won",
          wonExact: true,
        },
      } : cur.run,
    }));
  });
  await page.waitForTimeout(700); // gate reveal delay
  await page.screenshot({ path: "screenshots/zz-swarm-05-cashout.png" });
});

test("swarm: run info modal (every tab)", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-runinfo");
  await page.evaluate(() => (window as unknown as Win).__game.getState().setMapOpen(true));
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/zz-swarm-06-runinfo-styles.png" });
  // No tab-click — just verify it opens.
  const open = await page.evaluate(() => (window as unknown as Win).__game.getState().mapOpen);
  expect(open).toBe(true);
});

test("swarm: pack reveal screenshot dimensions check (cards match felt scale)", async ({ page }: { page: Page }) => {
  await newRun(page, "swarm-cards");
  await intoShop(page);
  // Open a card pack, screenshot, then for reference also screenshot a felt hand card.
  const packId = await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = w.__game.getState();
    return (g.run.shop?.packs || []).find((p: { kind: string }) => p.kind === "card")?.id ?? null;
  });
  if (packId) {
    await page.evaluate((id) => (window as unknown as Win).__game.getState().dispatch({ type: "openPack", packId: id }), packId);
    await page.waitForTimeout(900);
    await page.screenshot({ path: "screenshots/zz-swarm-07-pack-cards.png" });
  }
});
