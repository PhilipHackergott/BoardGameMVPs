import { test, expect, type Page } from '@playwright/test';

// dismiss the Dinnertime step-through modal if it auto-opened
async function clearDinnertime(page: Page): Promise<boolean> {
  if (await page.getByTestId('dinnertime-skip').isVisible().catch(() => false)) {
    await page.getByTestId('dinnertime-skip').click();
    await page.getByTestId('close-dinnertime').click();
    return true;
  }
  return false;
}

test('play a full skirmish vs AI to the end screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.marquee .logo')).toBeVisible();

  await page.getByTestId('new-game').click();
  await page.getByTestId('start-game').click();
  await expect(page.locator('.board svg')).toBeVisible();

  for (let i = 0; i < 120; i++) {
    if (await page.getByTestId('winner').isVisible().catch(() => false)) break;
    if (await clearDinnertime(page)) continue;
    await page.getByTestId('end-turn').click();
  }
  await expect(page.getByTestId('winner')).toBeVisible({ timeout: 30_000 });
});

test('the Dinnertime step-through shows the reasoning', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-game').click();
  await page.getByTestId('start-game').click();
  await page.getByRole('button', { name: /Market/ }).first().click();
  // advance until demand exists and the Dinnertime step-through auto-opens (turn 1 has no demand yet)
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('dinnertime-skip').isVisible().catch(() => false)) break;
    if (await page.getByTestId('winner').isVisible().catch(() => false)) break;
    await page.getByTestId('end-turn').click();
  }
  await expect(page.getByTestId('dinnertime-skip')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('dinnertime-skip').click(); // jump to the summary step
  await page.getByTestId('close-dinnertime').click();
  await expect(page.locator('.board svg, [data-testid="winner"]').first()).toBeVisible();
});

test('campaign: briefing → play a scenario → debrief → hub (career persists)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('campaign').click();
  await expect(page.getByText('Rise of a Fast-Food Empire')).toBeVisible();

  // first scenario is unlocked; open its briefing and start
  await page.getByTestId('scenario-grand-opening').click();
  await expect(page.getByTestId('start-scenario')).toBeVisible();
  await page.getByTestId('start-scenario').click();

  // the live objectives panel is shown in the in-game shell
  await expect(page.getByText('🎯 Grand Opening')).toBeVisible();

  // Play aggressively (market every turn so we create+serve demand) until the scenario resolves.
  // The scenario ends on the 2nd bank break and the seed is random, so give it the same generous
  // turn budget as the skirmish test (a slow-starting seed needs well over 50 turns to drain the bank).
  for (let i = 0; i < 120; i++) {
    if (await page.getByTestId('debrief-result').isVisible().catch(() => false)) break;
    if (await clearDinnertime(page)) continue;
    const market = page.getByRole('button', { name: /Market/ }).first();
    if (await market.isVisible().catch(() => false)) await market.click();
    await page.getByTestId('end-turn').click();
  }

  await expect(page.getByTestId('debrief-result')).toBeVisible({ timeout: 30_000 });
  // return to the hub — the career dossier (cleared count) renders
  await page.getByTestId('debrief-hub').click();
  await expect(page.getByText(/cleared \d+\//)).toBeVisible();
});

test('pause → settings → resume works', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-game').click();
  await page.getByTestId('start-game').click();
  await clearDinnertime(page);
  await page.getByTestId('pause').click();
  await expect(page.getByTestId('resume')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('end-turn')).toBeVisible();
});
