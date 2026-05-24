import { expect, test, type Page } from "@playwright/test";

const DIR = "../playtest/round-4";
const SEED = "12345";

interface Pts {
  a: { x: number; y: number };
  near: { x: number; y: number };
  safe: { x: number; y: number };
}

async function firstMovePts(page: Page): Promise<Pts | null> {
  return page.evaluate(() => {
    const nw = (window as any).__nightweave;
    const g = nw?.getState().game;
    if (!g) return null;
    const moves = nw.legalMoves(g);
    if (moves.length === 0) return null;
    const m = moves[0];
    const a = g.stars.find((s: any) => s.id === m.aStarId);
    const b = g.stars.find((s: any) => s.id === m.bStarId);
    const canvas = document.querySelector(".board-host canvas") as HTMLCanvasElement;
    const r = canvas.getBoundingClientRect();
    const c = nw.center as number;
    const size = c * 2;
    const toClient = (x: number, y: number) => ({
      x: r.left + ((c + x) / size) * r.width,
      y: r.top + ((c + y) / size) * r.height,
    });
    const at = (t: number) => toClient(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    let bestT = 0.5;
    let bestD = -1;
    for (let t = 0.2; t <= 0.8; t += 0.05) {
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      let md = Infinity;
      for (const s of g.stars) md = Math.min(md, Math.hypot(s.x - px, s.y - py));
      if (md > bestD) {
        bestD = md;
        bestT = t;
      }
    }
    return { a: toClient(a.x, a.y), near: at(0.3), safe: at(bestT) };
  });
}

test("influence lens toggles and reacts to a hovered placement", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__nightweave);
  await page.evaluate((seed) => (window as any).__nightweave.newGame(seed), SEED);
  await page.waitForSelector(".board-host canvas");
  await page.waitForFunction(() => (window as any).__nightweave.getState().game?.seed === 12345);

  // Setup: claim a starting-bonus flower, then placement begins.
  const claim = await firstMovePts(page);
  if (claim) await page.mouse.click(claim.a.x, claim.a.y);
  await page.waitForFunction(() => (window as any).__nightweave.getState().game?.phase === "play");

  // Place several pawns so both players hold territory.
  for (let i = 0; i < 6; i++) {
    const mv = await firstMovePts(page);
    if (!mv) break;
    await page.mouse.click(mv.a.x, mv.a.y);
    await page.mouse.move(mv.safe.x, mv.safe.y);
    await page.mouse.click(mv.safe.x, mv.safe.y);
  }

  // Turn the lens on — zones of influence shade the water.
  const lensBtn = page.getByRole("button", { name: /Influence Lens/ });
  await lensBtn.click();
  await expect(lensBtn).toContainText("ON");
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${DIR}/08-lens-on.png`, fullPage: true });

  // Begin a placement and glide along a line — the zones must shift to include the
  // would-be pawn at the hovered point.
  const mv = await firstMovePts(page);
  expect(mv).not.toBeNull();
  await page.mouse.click(mv!.a.x, mv!.a.y);
  await page.mouse.move(mv!.near.x, mv!.near.y);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${DIR}/09-lens-hover.png`, fullPage: true });

  expect(errors, `console/page errors:\n${errors.join("\n")}`).toEqual([]);
});
