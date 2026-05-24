import { test, expect, Page } from "@playwright/test";

// Capture each suit's royal so we can confirm they read as distinct designs.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
  }
}

test("the four suit royals look distinct", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const gotIt = page.getByRole("button", { name: "Close" });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  await page.evaluate(() => window.__game.getState().newRun("warmup"));
  await page.locator("canvas").first().waitFor();

  // The run always opens against the Jack of Hearts, so set the current royal's suit directly to
  // capture each suit's design (the board redraws the royal when its suit changes).
  for (const suit of ["H", "D", "C", "S"] as const) {
    const got = await page.evaluate((target: string) => {
      const g = window.__game;
      g.getState().newRun(`suit-${target}`);
      g.setState((s: { run: { combat?: { enemy?: { suit: string } } } }) => {
        const run = structuredClone(s.run);
        if (run.combat?.enemy) run.combat.enemy.suit = target;
        return { run };
      });
      return g.getState().run.combat?.enemy?.suit ?? null;
    }, suit);
    expect(got).toBe(suit);
    await page.waitForTimeout(700); // drawRoyal + plasma + deal settle
    await page.locator("canvas").first().screenshot({ path: `screenshots/enemy-${suit}.png` });
  }
});
