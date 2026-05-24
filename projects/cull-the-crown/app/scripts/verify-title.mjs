import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:4173";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 860 } });
await p.goto(url, { waitUntil: "networkidle" });
// dismiss the first-run tutorial if it auto-opened
const close = p.getByRole("button", { name: /close|got it|ok/i }).first();
if (await close.count().catch(() => 0)) { try { await close.click({ timeout: 1500 }); } catch { /* */ } }
await p.waitForTimeout(400);
await p.screenshot({ path: "verify-title.png" });
console.log("title menu buttons:");
for (const t of await p.getByRole("button").allInnerTexts()) console.log("  •", t.replace(/\n/g, " "));
await b.close();
