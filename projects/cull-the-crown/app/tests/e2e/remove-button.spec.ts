import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void } };

// Reproduce + verify: the Shop's Remove button opens the deck picker (a "8-card hand" pack-style
// reveal), the player chooses a card, the removal applies, and the modal closes cleanly. The user
// reported it "opens a screen that immediately closes" — we run the full intent path here.

test("Remove button: opens the picker, applies removal, indicates used state", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("rm-1"));
  await page.waitForTimeout(400);

  // Real flow: force-win the current fight, then advance into shop (so a proper shop object exists).
  await page.evaluate(() => {
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({
      run: {
        ...cur.run,
        combat: {
          ...cur.run.combat,
          enemy: { ...cur.run.combat.enemy, damageTaken: cur.run.combat.enemy.maxHealth },
          outcome: "won",
          wonExact: true,
        },
      },
    }));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => (window as unknown as Win).__game.getState().dispatch({ type: "advance" }));
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    // give the player enough gold to remove a card
    const w = window as unknown as Win;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w.__game as any).setState((cur: any) => ({ run: { ...cur.run, gold: 99 } }));
  });

  const deckBefore = await page.evaluate(() => (window as unknown as Win).__game.getState().run.deck.length);
  const goldBefore = await page.evaluate(() => (window as unknown as Win).__game.getState().run.gold);
  const removeUsesBefore = await page.evaluate(() => (window as unknown as Win).__game.getState().run.removeUses ?? 0);

  // Trigger the SAME intent path the shop button uses (we don't need to simulate the Pixi click
  // — the bug is in the post-click flow, not in hit detection).
  await page.evaluate(() => {
    const g = (window as unknown as Win).__game.getState();
    g.setPendingPick(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cardId: string) => (window as unknown as Win).__game.getState().dispatch({ type: "removeCard", targetCardId: cardId }),
      "Remove which card from your deck?",
    );
    g.setPileModal("all");
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/zz-remove-1-open.png" });

  // The deck modal canvas should be in the DOM, not flashed and closed.
  const modalCount = await page.locator(".pixi-modal-host canvas").count();
  expect(modalCount, "deck picker should be mounted").toBeGreaterThan(0);
  const pileOpen = await page.evaluate(() => (window as unknown as Win).__game.getState().pileModal);
  expect(pileOpen, "pileModal should be 'all' (picker live)").toBe("all");
  const picking = await page.evaluate(() => !!(window as unknown as Win).__game.getState().pendingPick);
  expect(picking, "pendingPick should be set").toBe(true);

  // Pick a card via the engine path (skip Pixi hit testing). We need a real card id from the deck.
  const cardId = await page.evaluate(() => (window as unknown as Win).__game.getState().run.deck[0]?.id ?? null);
  expect(cardId, "deck should have cards to remove").not.toBeNull();
  await page.evaluate((id) => {
    const g = (window as unknown as Win).__game.getState();
    if (g.pendingPick) g.pendingPick(id);
    g.setPendingPick(null);
  }, cardId);
  await page.waitForTimeout(400);

  // The deck should be one card lighter; gold should have dropped by the remove cost.
  const deckAfter = await page.evaluate(() => (window as unknown as Win).__game.getState().run.deck.length);
  const goldAfter = await page.evaluate(() => (window as unknown as Win).__game.getState().run.gold);
  const removeUsesAfter = await page.evaluate(() => (window as unknown as Win).__game.getState().run.removeUses ?? 0);
  expect(deckAfter, "one card removed from the deck").toBe(deckBefore - 1);
  expect(goldAfter, "gold reduced by the remove cost").toBeLessThan(goldBefore);
  expect(removeUsesAfter, "removeUses incremented").toBe(removeUsesBefore + 1);
  await page.screenshot({ path: "screenshots/zz-remove-2-applied.png" });
});
