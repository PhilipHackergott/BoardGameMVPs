// Screenshot harness for 07-build-overview.md. Drives the real built app through every major screen
// and saves PNGs to projects/food-chain-magnate/screenshots/. Not a correctness test — it asserts
// only enough to fail loudly if a screen never appears. Run with: npx playwright test screenshots
//
// History + a partially-completed career are SEEDED via localStorage so the History list and the
// Campaign hub render in a realistic, representative state without long playthroughs (the app itself
// produces exactly these shapes). The debrief-with-medal shot is a genuine live playthrough.

import { test, expect, type Page } from '@playwright/test';

const DIR = '../screenshots'; // relative to the app/ cwd → projects/food-chain-magnate/screenshots
const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` });

test.use({ viewport: { width: 1440, height: 900 } });

const SEED_HISTORY = JSON.stringify([
  { date: '2026-05-26', turns: 21, winner: 'Burgertown Inc.', standings: [{ name: 'Burgertown Inc.', cash: 212 }, { name: 'Patty Vanderburg', cash: 188 }] },
  { date: '2026-05-26', turns: 28, winner: 'Mad Sterling', standings: [{ name: 'Mad Sterling', cash: 240 }, { name: 'Burgertown Inc.', cash: 196 }, { name: 'Dollar Bill', cash: 151 }] },
  { date: '2026-05-25', turns: 24, winner: 'Burgertown Inc.', standings: [{ name: 'Burgertown Inc.', cash: 205 }, { name: 'V. P. Crane', cash: 173 }] },
]);
const SEED_CAREER = JSON.stringify({
  company: { name: 'Burgertown Inc.', color: 1, crest: 1 },
  medals: { 'grand-opening': 'gold', 'word-of-mouth': 'silver' },
  cleared: ['grand-opening', 'word-of-mouth'],
  unlocks: ['crest:diner-star', 'map:crossroads'],
  dossier: { scenariosCleared: 2, gamesWon: 5, bestTurns: 17, lifetimeCash: 1240 },
});

async function clearDinnertime(page: Page): Promise<boolean> {
  if (await page.getByTestId('dinnertime-skip').isVisible().catch(() => false)) {
    await page.getByTestId('dinnertime-skip').click();
    await page.getByTestId('close-dinnertime').click();
    return true;
  }
  return false;
}
async function recruit(page: Page, defId: string) {
  await page.selectOption('#hire', defId).catch(() => {});
  await page.getByRole('button', { name: '+ Recruit' }).click();
}
async function endTurn(page: Page) {
  await clearDinnertime(page);
  await page.getByTestId('end-turn').click();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Static screens (menu, settings, history, campaign hub + briefing) — seeded.
// ─────────────────────────────────────────────────────────────────────────────
test('static screens', async ({ page, context }) => {
  await context.addInitScript(([h, c]) => {
    localStorage.setItem('fcm_history', h);
    localStorage.setItem('fcm_career', c);
  }, [SEED_HISTORY, SEED_CAREER]);

  await page.goto('/');
  await expect(page.locator('.marquee .logo')).toBeVisible();
  await shot(page, '01-main-menu');

  // Settings (opened from the menu)
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Mute all sound')).toBeVisible();
  await shot(page, '07-settings');
  await page.getByTestId('settings-done').click();

  // Past Games (history)
  await page.getByTestId('history').click();
  await expect(page.getByRole('heading', { name: /Past Games/ })).toBeVisible();
  await shot(page, '08-history');
  await page.getByRole('button', { name: 'Close' }).click();

  // Campaign hub
  await page.getByTestId('campaign').click();
  await expect(page.getByText('Rise of a Fast-Food Empire')).toBeVisible();
  await shot(page, '09-campaign-hub');

  // Campaign briefing (first scenario)
  await page.getByTestId('scenario-grand-opening').click();
  await expect(page.getByTestId('start-scenario')).toBeVisible();
  await shot(page, '10-campaign-briefing');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Skirmish flow — setup, shell early + mid, Dinnertime step-through, pause,
//    in-game settings, end screen.
// ─────────────────────────────────────────────────────────────────────────────
test('skirmish flow', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');

  // New-game setup (show a full 4-seat table)
  await page.getByTestId('new-game').click();
  await page.getByRole('button', { name: '4', exact: true }).click();
  await expect(page.getByText('New Game — Skirmish')).toBeVisible();
  await shot(page, '02-new-game-setup');

  // Start → shell, early turn
  await page.getByTestId('start-game').click();
  await expect(page.locator('.board svg')).toBeVisible();
  await shot(page, '03-shell-early');

  // Build a little economy: recruit a marketeer + cook + waitress, then market every turn.
  await recruit(page, 'marketing-trainee');
  await recruit(page, 'kitchen-trainee');
  await endTurn(page);
  await recruit(page, 'waitress');
  await page.getByRole('button', { name: /^Market/ }).first().click();
  await endTurn(page);

  // Play several turns marketing each turn so demand, marketing pieces, standings + log populate.
  // Stop on the first turn whose Dinnertime step-through has houses (so we can shoot the modal).
  let captured = false;
  for (let i = 0; i < 14 && !captured; i++) {
    if (await page.getByTestId('dinnertime-skip').isVisible().catch(() => false)) {
      // House 1 of the step-through
      await shot(page, '05-dinnertime-step1');
      await page.getByRole('button', { name: /Next/ }).click();
      await shot(page, '06-dinnertime-step2');
      await page.getByTestId('dinnertime-skip').click(); // jump to the after-houses summary
      await shot(page, '06b-dinnertime-summary');
      await page.getByTestId('close-dinnertime').click();
      captured = true;
      break;
    }
    if (await page.getByTestId('winner').isVisible().catch(() => false)) break;
    const market = page.getByRole('button', { name: /^Market/ }).first();
    if (await market.isVisible().catch(() => false)) await market.click();
    await page.getByTestId('end-turn').click();
  }

  // Capture the populated shell + pause + in-game settings NOW, while the game is still live
  // (a 4-seat game drains the bank fast, so do this before playing on to the end).
  await clearDinnertime(page);
  await expect(page.getByTestId('end-turn')).toBeVisible();
  await shot(page, '04-shell-midgame');

  // Pause menu
  await page.getByTestId('pause').click();
  await expect(page.getByTestId('resume')).toBeVisible();
  await shot(page, '11-pause-menu');
  // In-game settings (from the pause menu)
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Mute all sound')).toBeVisible();
  await shot(page, '07b-settings-ingame');
  await page.getByTestId('settings-done').click();
  await page.getByTestId('resume').click();

  // Play to the end → End screen
  for (let i = 0; i < 130; i++) {
    if (await page.getByTestId('winner').isVisible().catch(() => false)) break;
    await endTurn(page);
  }
  await expect(page.getByTestId('winner')).toBeVisible({ timeout: 30_000 });
  await shot(page, '12-end-screen');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Campaign flow — in-game objectives panel + debrief (played live for a medal).
// ─────────────────────────────────────────────────────────────────────────────
test('campaign flow', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByTestId('campaign').click();
  await page.getByTestId('scenario-grand-opening').click();
  await page.getByTestId('start-scenario').click();
  await expect(page.getByText('🎯 Grand Opening')).toBeVisible();

  // Build an economy so the objectives panel ticks and we win with a medal.
  await recruit(page, 'marketing-trainee');
  await recruit(page, 'kitchen-trainee');
  await endTurn(page);
  await recruit(page, 'waitress');
  await page.getByRole('button', { name: /^Market/ }).first().click();
  await endTurn(page);

  // A couple more turns, then shoot the in-game objectives panel.
  for (let i = 0; i < 2; i++) {
    await clearDinnertime(page);
    await page.getByRole('button', { name: /^Market/ }).first().click();
    await page.getByTestId('end-turn').click();
  }
  await clearDinnertime(page);
  if (!(await page.getByTestId('debrief-result').isVisible().catch(() => false))) {
    await shot(page, '13-campaign-ingame-objectives');
  }

  // Play to the scenario debrief.
  for (let i = 0; i < 120; i++) {
    if (await page.getByTestId('debrief-result').isVisible().catch(() => false)) break;
    if (await clearDinnertime(page)) continue;
    const market = page.getByRole('button', { name: /^Market/ }).first();
    if (await market.isVisible().catch(() => false)) await market.click();
    await page.getByTestId('end-turn').click();
  }
  await expect(page.getByTestId('debrief-result')).toBeVisible({ timeout: 30_000 });
  await shot(page, '14-campaign-debrief');
});
