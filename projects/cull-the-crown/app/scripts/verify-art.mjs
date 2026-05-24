// Screenshot the title + run-setup to confirm the deck art renders in-game. Run against a server:
//   npx vite preview --port 4173   (then)   node scripts/verify-art.mjs
import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:4173";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 780 } });
await p.goto(url, { waitUntil: "networkidle" });
const click = async (re) => {
  const el = p.getByRole("button", { name: re }).first();
  if (await el.count().catch(() => 0)) {
    try {
      await el.click({ timeout: 1500 });
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
};
// close any opening modal (Rules / how-to)
await click(/close|got it|ok|×/i);
await p.waitForTimeout(400);
await p.screenshot({ path: "verify-title.png" });
// open the New Run setup, then advance the deck carousel a couple times to show different art
await click(/new run|^play$|start/i);
await p.waitForTimeout(500);
for (let i = 0; i < 3; i++) {
  await click(/next deck/i);
  await p.waitForTimeout(150);
}
await p.waitForTimeout(400);
await p.screenshot({ path: "verify-setup.png" });
console.log("screenshots written");
await b.close();
