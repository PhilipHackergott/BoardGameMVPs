import { expect, type Page, test } from '@playwright/test';

// Fail the test on any uncaught page error (Pixi runtime issues, etc.).
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

// Dismiss the "pass the device" handoff overlay if it's up (it appears when control changes side).
async function ack(page: Page) {
  const btn = page.getByTestId('handoff-ack');
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

test('title → new game → board renders, dice roll, a full phase loop runs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'War of the Ring' })).toBeVisible();

  // start a deterministic game
  await page.getByTestId('seed').fill('12345');
  await page.getByTestId('new-game').click();

  // board canvas mounts
  await expect(page.getByTestId('map-canvas').locator('canvas')).toBeVisible();

  // run phase 1 (recover & draw)
  await ack(page);
  await page.getByTestId('act-recoverAndDraw').click();
  // fellowship phase → end
  await ack(page);
  await expect(page.getByTestId('act-endPhase')).toBeVisible();
  await page.getByTestId('act-endPhase').click();
  // hand to Shadow for hunt allocation
  await ack(page);
  await page.getByTestId('act-endPhase').click();
  // action roll → roll dice
  await ack(page);
  await page.getByTestId('act-rollDice').click();

  // we should now be in action resolution with a dice tray
  await ack(page);
  await expect(page.getByTestId('dice-tray')).toBeVisible();

  // capture the board for the visual record
  await page.screenshot({ path: 'test-results/board.png', fullPage: false });
});

test('hidden-info: viewing as Shadow conceals Fellowship detail in the panel', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-game').click();
  // advance to a Shadow-viewed phase (hunt allocation) and confirm the concealment copy shows
  await ack(page);
  await page.getByTestId('act-recoverAndDraw').click();
  await ack(page);
  await page.getByTestId('act-endPhase').click(); // fellowship -> hunt allocation (shadow views)
  await ack(page); // hand the device to Shadow
  await expect(page.getByText(/concealed from the Shadow/i)).toBeVisible();
});
