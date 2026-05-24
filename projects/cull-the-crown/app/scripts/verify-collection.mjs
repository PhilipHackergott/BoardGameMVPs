import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:4173";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 860 } });
await p.goto(url, { waitUntil: "networkidle" });
const click = async (re) => {
  const el = p.getByRole("button", { name: re }).first();
  if (await el.count().catch(() => 0)) { try { await el.click({ timeout: 1500 }); return true; } catch { /* */ } }
  return false;
};
await click(/close|got it|ok/i);
await p.waitForTimeout(300);
await click(/compendium/i);
await p.waitForTimeout(500);
await p.screenshot({ path: "verify-comp-overview.png" });
await click(/suits & powers/i);
await p.waitForTimeout(300);
await p.screenshot({ path: "verify-comp-suits.png" });
await click(/combos & fighting/i);
await p.waitForTimeout(300);
await p.screenshot({ path: "verify-comp-combos.png" });
await click(/^jokers/i);
await p.waitForTimeout(500);
await p.screenshot({ path: "verify-comp-jokers.png" });
await click(/royals & decrees/i);
await p.waitForTimeout(500);
await p.screenshot({ path: "verify-comp-enemies.png" });
console.log("done");
await b.close();
