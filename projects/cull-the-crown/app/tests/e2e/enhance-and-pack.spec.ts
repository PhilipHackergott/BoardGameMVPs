import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any; setState: (u: any) => void } };

// Visual verification for card enhancements: every sigil and seal should produce a WHOLE-CARD
// overlay (Balatro-style Mult/Bonus/Steel treatment), not just a corner letter. We mutate a fresh
// hand to give each card a different sigil/seal, then screenshot the felt for review.

test("enhancements: every sigil/seal draws a whole-card overlay", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.getByRole("button", { name: /new run|play/i }).first().click();
  await page.waitForTimeout(800);

  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("vis-1"));
  await page.waitForTimeout(700);

  // Apply one distinct sigil per hand card so the test exercises every visual treatment we added.
  const handLen = await page.evaluate(() => {
    const w = window as unknown as Win;
    const sigils = ["honed", "keen", "warded", "gilded", "runed", "wildcard", "steel", "glass", "minted", "charmed", "stoneskin"];
    const seals = ["gold", "red", "blue", "purple"];
    const s = w.__game.getState();
    const r = s.run;
    const hand = r.hand.map((_c: { id: string }, i: number) => ({
      ...r.hand[i],
      sigils: [sigils[i % sigils.length]],
      seal: i < seals.length ? seals[i] : undefined,
    }));
    w.__game.setState({ run: { ...r, hand } });
    return hand.length;
  });
  expect(handLen).toBeGreaterThan(0);

  // Hover a card with the "honed" sigil so the tooltip surface also shows in the screenshot.
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/zz-enhanced-hand.png", fullPage: false });
});
