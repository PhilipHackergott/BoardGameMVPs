import { test } from '@playwright/test';

// Stage-5 visual playtest: drive a full match in headless Chrome and screenshot each meaningful
// state into projects/magical-athlete/playtest/round-1/ for review against the spec + rules.
// (cwd is the app dir when run via `npm run test:e2e`, so '../playtest/...' is the project folder.
// Playwright's screenshot() auto-creates parent directories.)
const DIR = '../playtest/round-11';

test('full match playthrough with screenshots', async ({ page }) => {
  test.setTimeout(360_000); // full 4-race match; two-step die adds per-turn animation, headless software-renders
  let n = 0;
  const snap = async (name: string) => {
    await page.screenshot({ path: `${DIR}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true });
  };

  await page.goto('/');
  await snap('menu');

  await page.getByTestId('start').click();
  await page.getByTestId('draft-pick').first().waitFor();
  await snap('draft');

  let shotPrompt = false;
  let shotAfterRace = false;
  let shotRace = false;
  let shotReveal = false;
  let shotWild = false;
  let shotTrigger = false;

  for (let i = 0; i < 1000; i++) {
    if (await page.getByTestId('end-screen').count()) break;

    if (!shotWild && (await page.getByText('Wild Wilds').count()) && (await page.getByTestId('die').count())) {
      await snap('wild-race');
      shotWild = true;
    }

    if (await page.getByTestId('trigger-confirm').count()) {
      if (!shotTrigger) {
        await snap('trigger');
        shotTrigger = true;
      }
      await page.getByTestId('trigger-confirm').click();
    } else if (await page.getByTestId('prompt-option').count()) {
      if (!shotPrompt) {
        await snap('power-prompt');
        shotPrompt = true;
      }
      await page.getByTestId('prompt-option').first().click();
    } else if (await page.getByTestId('next-race').count()) {
      if (!shotAfterRace) {
        await snap('after-race');
        shotAfterRace = true;
      }
      await page.getByTestId('next-race').click();
    } else if (await page.getByTestId('roll').count()) {
      // 'rolled' state: commit the turn
      await page.getByTestId('roll').click();
    } else if (await page.getByTestId('die').count()) {
      // 'idle' state: click the die, then wait for the roll animation to surface "Take turn"
      if (!shotRace) {
        await snap('race');
        shotRace = true;
      }
      await page.getByTestId('die').click();
      await page.getByTestId('roll').waitFor({ timeout: 8000 }).catch(() => {});
    } else if (await page.getByTestId('reveal-pick').count()) {
      if (!shotReveal) {
        await snap('reveal');
        shotReveal = true;
      }
      await page.getByTestId('reveal-pick').first().click();
    } else if (await page.getByTestId('draft-pick').count()) {
      await page.getByTestId('draft-pick').first().click();
    } else {
      break;
    }
    await page.waitForTimeout(15); // let React flush before re-checking state
  }

  await page.getByTestId('end-screen').waitFor({ timeout: 10_000 });
  await snap('end');
});
