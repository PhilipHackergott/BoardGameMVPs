// Rasterize the card SVG illustrations to PNG (for viewing / verification). Uses the Playwright
// chromium that's already a dev dependency. Run from app/: `node scripts/raster-jokers.mjs`.
import { chromium } from "playwright";
import { readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";

const dirs = [
  resolve("../cull the crown joker illustrations"),
  resolve("../cull the crown fighting style illustrations"),
  resolve("../cull the crown deck illustrations"),
  resolve("../cull the crown tarot illustrations"),
  resolve("../cull the crown spectral illustrations"),
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 560 } });
for (const dir of dirs) {
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  } catch {
    continue; // folder may not exist yet
  }
  for (const f of files) {
    let svg = readFileSync(join(dir, f), "utf8");
    svg = svg.replace("<svg ", '<svg width="240" height="336" '); // upscale (nearest-neighbour stays crisp)
    await page.setContent(
      `<!doctype html><body style="margin:0;display:inline-block;background:#3a2a4e;padding:16px;image-rendering:pixelated">${svg}</body>`,
      { waitUntil: "networkidle" },
    );
    const el = await page.$("svg");
    await el.screenshot({ path: join(dir, f.replace(/\.svg$/, ".png")) });
    console.log("rendered", f);
  }
}
await browser.close();
