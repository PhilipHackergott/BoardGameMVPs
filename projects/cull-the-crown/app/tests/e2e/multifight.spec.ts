import { test, expect } from "@playwright/test";

// Regression: every fight must begin with a full hand and a fresh (un-won) combat. Two bugs lived
// here — the hand was never re-dealt between fights (it depleted to 0 by fight 3), and a stale
// "kill" FX event from the previous fight could re-fire "OVERTHROWN" on the new fight's first turn.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __game: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __preview: any;
  }
}

test("the second fight opens with a full hand and an un-won combat", async ({ page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();

  const result = await page.evaluate(() => {
    const G = () => window.__game.getState();
    const fightToKill = (): string => {
      for (let i = 0; i < 300; i++) {
        const r = G().run;
        if (r.phase !== "combat") return r.phase;
        const c = r.combat;
        if (c.outcome) return c.outcome;
        if (c.subphase === "defend") {
          const sorted = [...r.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
          let sum = 0;
          const pick: string[] = [];
          for (const card of sorted) {
            if (sum >= c.incoming) break;
            pick.push(card.id);
            sum += card.value;
          }
          G().clearSelect();
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
    for (let seed = 0; seed < 60; seed++) {
      window.__game.getState().newRun("mf" + seed);
      if (fightToKill() !== "won") continue;
      window.__game.getState().dispatch({ type: "advance" }); // Claim → shop
      if (G().run.phase !== "shop") continue;
      window.__game.getState().dispatch({ type: "nextFight" }); // enemyIndex 1 is never an event
      const r = G().run;
      if (r.phase !== "combat") continue;
      return { hand: r.hand.length, max: r.config.handMax, outcome: r.combat.outcome };
    }
    return null;
  });

  expect(result, "reached a second fight").not.toBeNull();
  expect(result!.outcome, "fresh combat is not pre-won").toBeNull();
  expect(result!.hand, "second fight has a full starting hand").toBe(result!.max);
});
