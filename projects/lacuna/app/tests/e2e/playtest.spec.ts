import { expect, test, type Page } from "@playwright/test";

const DIR = "../playtest/round-4";
const SEED = "12345";

interface ClientPt {
  x: number;
  y: number;
}
interface MovePts {
  a: ClientPt;
  b: ClientPt;
  near: ClientPt; // ~22% along A→B — demonstrates free placement off the midpoint
  safe: ClientPt; // point on the line farthest from any other flower (safe to click)
}

// Map the first legal move's two flowers (and points along their line) to client px.
async function firstLegalMovePts(page: Page): Promise<MovePts | null> {
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
    // Pick the spot on the line that sits farthest from EVERY flower (including the
    // two endpoints), so a click there can't be swallowed by a flower's hit circle.
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
    return { a: toClient(a.x, a.y), b: toClient(b.x, b.y), near: at(0.22), safe: at(bestT) };
  });
}

async function gamePhase(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as any).__nightweave?.getState().game?.phase ?? null);
}

test("visual playtest: red/green lines, snap placement, full game", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__nightweave);

  // Deal a deterministic pond via the dev seam (skips the main menu), then render.
  await page.evaluate((seed) => (window as any).__nightweave.newGame(seed), SEED);
  await page.waitForSelector(".board-host canvas");
  await page.waitForFunction(() => (window as any).__nightweave.getState().game?.seed === 12345);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/01-initial-pond.png`, fullPage: true });

  // Setup: the first player picks one starting-bonus flower.
  const claim = await firstLegalMovePts(page);
  expect(claim).not.toBeNull();
  await page.mouse.click(claim!.a.x, claim!.a.y);
  await page.waitForFunction(() => (window as any).__nightweave.getState().game?.phase === "play");

  // Click a flower → red + green guide lines fan out from it.
  const first = await firstLegalMovePts(page);
  expect(first).not.toBeNull();
  await page.mouse.click(first!.a.x, first!.a.y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${DIR}/02-lines-revealed.png`, fullPage: true });

  // Glide along the green line — the pawn preview snaps to it — then click to drop.
  await page.mouse.move(first!.near.x, first!.near.y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${DIR}/03-snap-preview.png`, fullPage: true });
  await page.mouse.move(first!.safe.x, first!.safe.y);
  await page.mouse.click(first!.safe.x, first!.safe.y);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${DIR}/04-pawn-placed.png`, fullPage: true });

  // Play out the rest: select a flower, glide onto its line, click to place.
  let guard = 0;
  while ((await gamePhase(page)) === "play" && guard < 80) {
    guard++;
    const mv = await firstLegalMovePts(page);
    if (!mv) {
      const pass = page.getByRole("button", { name: /No moves/ });
      if (await pass.count()) await pass.click();
      else break;
      continue;
    }
    await page.mouse.click(mv.a.x, mv.a.y);
    await page.mouse.move(mv.safe.x, mv.safe.y);
    await page.mouse.click(mv.safe.x, mv.safe.y);
    if (guard === 4) await page.screenshot({ path: `${DIR}/05-midgame.png`, fullPage: true });
  }

  await page.waitForFunction(() => (window as any).__nightweave.getState().game?.phase === "ended");
  // Mid-harvest: leftover flowers are being assigned to their nearest pawns.
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/06-harvest.png`, fullPage: true });

  // Wait for the harvest animation to finish, then the winner is declared.
  await page.waitForFunction(() => {
    const s = (window as any).__nightweave.getState();
    return s.reveal >= (s.game?.territory?.length ?? 0);
  });
  await expect(page.getByText(/wins the pond|tied night/i)).toBeVisible();
  await page.screenshot({ path: `${DIR}/07-final.png`, fullPage: true });

  // Victory overlay (confetti + WINS) is up; dismiss it with the ✕ to study the board.
  await expect(page.locator(".victory-card")).toBeVisible();
  await page.screenshot({ path: `${DIR}/08-victory.png`, fullPage: true });
  await page.getByRole("button", { name: /Dismiss/ }).click();
  await expect(page.locator(".victory-card")).toHaveCount(0);
  await page.screenshot({ path: `${DIR}/09-victory-dismissed.png`, fullPage: true });

  // Harvest timeline: scrub back through the territory assignment to browse how the
  // winner was decided, then verify Replay re-arms the animation.
  const scrub = page.locator(".harvest-range");
  await expect(scrub).toBeVisible();
  const max = await scrub.getAttribute("max");
  await scrub.fill("4");
  await expect(page.locator(".harvest-count")).toContainText(`4 / ${max}`);
  await expect.poll(() => page.evaluate(() => (window as any).__nightweave.getState().reveal)).toBe(4);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${DIR}/10-harvest-scrub.png`, fullPage: true });
  await page.getByRole("button", { name: /Replay/ }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__nightweave.getState().revealAuto)).toBe(true);

  expect(errors, `console/page errors:\n${errors.join("\n")}`).toEqual([]);
});
