import { test, expect } from '@playwright/test';

// Happy-path smoke: the app boots to the menu and starts a match into the draft. The Stage-5 /test
// stage extends this into a full play-through with screenshots and a visual/rules review.
test('boots to the menu and starts a match into the draft', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Magical Athlete' })).toBeVisible();
  await page.getByRole('button', { name: /Start match/ }).click();
  await expect(page.getByRole('heading', { name: /Draft your team/ })).toBeVisible();
});
