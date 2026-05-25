# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: look.spec.ts >> capture the look: tutorial, combat, cascade, defend, shop
- Location: tests\e2e\look.spec.ts:20:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Settings' })

```

# Page snapshot

```yaml
- generic [ref=e7]:
  - generic:
    - generic:
      - generic: Drag a card up to play · tap to build a combo · hover to inspect
    - generic [ref=e10]:
      - generic [ref=e11]: SORT
      - button "↕ Rank" [ref=e12] [cursor=pointer]
      - button "↕ Suit" [ref=e13] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | // Visual verification of the game-ready look. Drives the engine through the dev seam (window.__game)
  4   | // because the hand lives on a Pixi canvas, then screenshots the canvas element (reliable for WebGL;
  5   | // full-page screenshots can capture an un-preserved drawing buffer as black).
  6   | 
  7   | declare global {
  8   |   interface Window {
  9   |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  10  |     __game: any;
  11  |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  12  |     __preview: any;
  13  |   }
  14  | }
  15  | 
  16  | async function shotCanvas(page: Page, name: string) {
  17  |   await page.locator("canvas").first().screenshot({ path: `screenshots/${name}.png` });
  18  | }
  19  | 
  20  | test("capture the look: tutorial, combat, cascade, defend, shop", async ({ page }) => {
  21  |   const errors: string[] = [];
  22  |   page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  23  | 
  24  |   await page.goto("/");
  25  | 
  26  |   // The tutorial auto-opens on a first visit (fresh localStorage).
  27  |   const dialog = page.getByRole("dialog", { name: "Rules" });
  28  |   await dialog.waitFor();
  29  |   await page.waitForTimeout(300);
  30  |   await page.screenshot({ path: "screenshots/00-help.png" });
  31  |   await page.getByRole("button", { name: "Close" }).click();
  32  | 
  33  |   await expect(page.getByRole("heading", { name: "Cull the Crown" })).toBeVisible();
  34  |   await page.screenshot({ path: "screenshots/01-title.png" });
  35  | 
  36  |   await page.getByRole("button", { name: /New Run|Play/ }).first().click(); // main menu → setup overlay
  37  |   await page.waitForTimeout(250);
  38  |   await page.screenshot({ path: "screenshots/01b-setup.png" }); // the Balatro-style run setup overlay
  39  |   await page.getByRole("button", { name: "PLAY", exact: true }).click(); // start the run
  40  |   await page.locator("canvas").first().waitFor();
  41  |   await page.waitForTimeout(1100);
  42  |   await shotCanvas(page, "02-combat");
  43  |   await page.screenshot({ path: "screenshots/02b-combat-full.png" });
  44  | 
  45  |   // Pause menu (the sidebar Options button is now a Pixi hit-target; drive it via the seam): freezes
  46  |   // the board; rules / settings / save / surrender live in the DOM modal it opens.
  47  |   await page.evaluate(() => window.__game.getState().setPaused(true));
  48  |   await page.waitForTimeout(150);
  49  |   await page.screenshot({ path: "screenshots/09-pause.png" });
> 50  |   await page.getByRole("button", { name: "Settings" }).click();
      |                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
  51  |   await page.waitForTimeout(150);
  52  |   await page.screenshot({ path: "screenshots/10-settings.png" });
  53  |   await page.getByRole("button", { name: "Done" }).click();
  54  |   await page.getByRole("button", { name: "Resume" }).click();
  55  |   await page.waitForTimeout(150);
  56  | 
  57  |   // Hover preview: setting hoverId (with nothing selected) pops the info box — the suit legend +
  58  |   // that card's resolved powers — but no Play/Clear. Driven via the seam (real-pointer hover is
  59  |   // covered by input.spec); the box persists since no mouse move resets it.
  60  |   await page.evaluate(() => {
  61  |     const g = window.__game.getState();
  62  |     const id = g.run.hand[0]?.id;
  63  |     if (id) g.setHoverId(id);
  64  |   });
  65  |   await page.waitForTimeout(250);
  66  |   await page.screenshot({ path: "screenshots/03h-hover-full.png" });
  67  |   await page.evaluate(() => window.__game.getState().setHoverId(null));
  68  | 
  69  |   // Hover the board, select + play a card to capture the hit cascade.
  70  |   await page.mouse.move(640, 480);
  71  |   await page.evaluate(() => {
  72  |     const g = window.__game.getState();
  73  |     const id = g.run.hand[0]?.id;
  74  |     if (id) g.toggleSelect(id);
  75  |   });
  76  |   await page.waitForTimeout(450);
  77  |   await shotCanvas(page, "03-selected");
  78  |   await page.screenshot({ path: "screenshots/03b-selected-full.png" }); // action pop-up overlay
  79  |   await page.evaluate(() => window.__game.getState().playCards());
  80  |   await page.waitForTimeout(180);
  81  |   await shotCanvas(page, "04-cascade");
  82  |   await page.waitForTimeout(900);
  83  |   await shotCanvas(page, "05-defend");
  84  | 
  85  |   // Deck composition modal — opened via the dev seam (robust to the full-screen board's letterboxing,
  86  |   // which makes canvas-pixel coordinates unreliable).
  87  |   await page.evaluate(() => window.__game.getState().setPileModal("deck"));
  88  |   await page.waitForTimeout(250);
  89  |   await page.screenshot({ path: "screenshots/07-deck-modal.png" });
  90  |   await page.getByRole("button", { name: "Close" }).click();
  91  |   await page.waitForTimeout(150);
  92  | 
  93  |   // Seed-search to a winnable kill, then PAUSE on the felled gate (no auto-advance).
  94  |   const result = await page.evaluate(() => {
  95  |     const fightToKill = (): string => {
  96  |       for (let i = 0; i < 200; i++) {
  97  |         const g = window.__game.getState();
  98  |         const r = g.run;
  99  |         if (r.phase !== "combat") return "ended";
  100 |         const c = r.combat;
  101 |         if (c.outcome === "won") return "won"; // stop here — let the gate show
  102 |         if (c.outcome === "lost") return "lost"; // dead end for this seed; try the next
  103 |         if (c.subphase === "defend") {
  104 |           const sorted = [...r.hand].sort((a: { value: number }, b: { value: number }) => a.value - b.value);
  105 |           let sum = 0;
  106 |           const pick: string[] = [];
  107 |           for (const card of sorted) {
  108 |             if (sum >= c.incoming) break;
  109 |             pick.push(card.id);
  110 |             sum += card.value;
  111 |           }
  112 |           g.clearSelect();
  113 |           pick.forEach((id: string) => window.__game.getState().toggleSelect(id));
  114 |           window.__game.getState().discardSelected();
  115 |         } else {
  116 |           let best: string | null = null;
  117 |           let bd = -1;
  118 |           for (const card of r.hand) {
  119 |             const res = window.__preview([card.id]);
  120 |             if (res.valid && res.damage > bd) {
  121 |               bd = res.damage;
  122 |               best = card.id;
  123 |             }
  124 |           }
  125 |           if (best == null) window.__game.getState().yieldTurn();
  126 |           else {
  127 |             window.__game.getState().clearSelect();
  128 |             window.__game.getState().toggleSelect(best);
  129 |             window.__game.getState().playCards();
  130 |           }
  131 |         }
  132 |       }
  133 |       return "timeout";
  134 |     };
  135 |     for (let seed = 0; seed < 40; seed++) {
  136 |       window.__game.getState().newRun("demo" + seed);
  137 |       if (fightToKill() === "won") return "won@" + seed;
  138 |     }
  139 |     return "none";
  140 |   });
  141 |   console.log("FIGHT RESULT:", result);
  142 | 
  143 |   // The battle screen stays on the felled royal; the Continue gate appears after a short delay.
  144 |   await page.waitForTimeout(1350);
  145 |   await page.screenshot({ path: "screenshots/08-felled-gate.png" });
  146 |   await page.getByRole("button", { name: /Claim/ }).click();
  147 |   // coin animation, then advance to shop — wait on the real phase (robust to layout/CSS changes)
  148 |   await page.waitForFunction(() => window.__game.getState().run.phase === "shop", { timeout: 8000 });
  149 |   await page.waitForTimeout(200);
  150 |   await page.screenshot({ path: "screenshots/06-shop.png" });
```