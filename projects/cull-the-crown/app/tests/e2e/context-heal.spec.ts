import { test, expect, Page } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Win = { __game: { getState: () => any }; __stage?: any };

// Guards the "black battle screen" fix: browsers cap live WebGL contexts, and across a long session
// opening modals can evict the felt's context — leaving it a dead black canvas. PixiBoard now listens
// for webglcontextlost and remounts itself (the store is the source of truth, so combat is preserved).
// Here we force the loss the browser would, and assert the felt comes back with a live context.
test("the felt self-heals when its WebGL context is lost", async ({ page }: { page: Page }) => {
  await page.goto("/");
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.evaluate(() => (window as unknown as Win).__game.getState().newRun("ctx-heal"));
  await page.locator(".pixi-host canvas").waitFor();
  await page.waitForTimeout(400);

  // force-lose the felt's GL context (what the browser does under context pressure)
  const forced = await page.evaluate(() => {
    const gl = (window as unknown as Win).__stage?.app?.renderer?.gl;
    const ext = gl?.getExtension?.("WEBGL_lose_context");
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  test.skip(!forced, "WEBGL_lose_context unavailable in this browser");

  // the board remounts → a fresh canvas with a live context; combat state survives (store-driven)
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as Win).__stage?.app?.renderer?.gl?.isContextLost?.() ?? true), { timeout: 6000 })
    .toBe(false);
  await expect(page.locator(".pixi-host canvas")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Win).__game.getState().run.phase)).toBe("combat");
});
