# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: descent.spec.ts >> The Descent modal opens, lists royals + decrees, and closes
- Location: tests\e2e\descent.spec.ts:12:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/The Queen Court/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/The Queen Court/)

```

```yaml
- text: Drag a card up to play · tap to build a combo · hover to inspect SORT
- button "↕ Rank"
- button "↕ Suit"
- dialog "The Descent — run info":
  - heading "The Descent (0/12 felled · ◆4)" [level=2]
  - button "Close"
  - tablist:
    - tab "Fighting Styles"
    - tab "Opponents" [selected]
    - tab "Edicts"
    - tab "Stake"
  - banner:
    - heading "Act I · The Jack Court" [level=3]
    - text: The lesser royals — your proving ground. — the current court.
  - text: "#1 ▶ now J ♥ ♥20 ⚔10 disables ♥ Hearts — no decree — #2 … next J ♠ ♥30 ⚔10 disables ♠ Spades ⚜ The Iron Wall #3 ❓ event … next J ♦ ♥20 ⚔10 disables ♦ Diamonds ⚜ The Vampire King #4 … next J ♣ ♥20 ⚔10 disables ♣ Clubs ⚜ Thick Hide"
```

# Test source

```ts
  1  | import { test, expect, Page } from "@playwright/test";
  2  | 
  3  | // The Descent run-overview modal (P2): opens, shows the three Courts + decrees, and closes.
  4  | 
  5  | declare global {
  6  |   interface Window {
  7  |     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  8  |     __game: any;
  9  |   }
  10 | }
  11 | 
  12 | test("The Descent modal opens, lists royals + decrees, and closes", async ({ page }: { page: Page }) => {
  13 |   await page.goto("/");
  14 |   const gotIt = page.getByRole("button", { name: "Close" });
  15 |   if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  16 |   await page.evaluate(() => window.__game.getState().newRun("descent-demo"));
  17 |   await page.locator("canvas").first().waitFor();
  18 | 
  19 |   // Open via the store (mirrors the stat button / the M shortcut).
  20 |   await page.evaluate(() => window.__game.getState().setMapOpen(true));
  21 |   const modal = page.getByRole("dialog", { name: /The Descent/ });
  22 |   await expect(modal).toBeVisible();
  23 | 
  24 |   // The run-info modal is tabbed now; the Courts/royals live on the "Opponents" tab.
  25 |   await modal.getByRole("tab", { name: "Opponents" }).click();
  26 | 
  27 |   // All three Courts and all 12 royals are present.
  28 |   await expect(page.getByText(/The Jack Court/)).toBeVisible();
> 29 |   await expect(page.getByText(/The Queen Court/)).toBeVisible();
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  30 |   await expect(page.getByText(/The King Court/)).toBeVisible();
  31 |   expect(await page.locator(".descent-royal").count()).toBe(12);
  32 |   // At least one royal advertises a decree (royals past the first carry one).
  33 |   expect(await page.locator(".dr-decree.has").count()).toBeGreaterThan(0);
  34 | 
  35 |   await page.waitForTimeout(250);
  36 |   await page.screenshot({ path: "screenshots/descent.png" });
  37 | 
  38 |   await modal.getByRole("button", { name: "Close" }).click();
  39 |   await expect(modal).toBeHidden();
  40 | });
  41 | 
```