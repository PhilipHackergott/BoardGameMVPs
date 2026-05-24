import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:4173";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 900 } });
await p.goto(url, { waitUntil: "networkidle" });
const click = async (re, timeout = 1500) => {
  const el = p.getByRole("button", { name: re }).first();
  if (await el.count().catch(() => 0)) { try { await el.click({ timeout }); return true; } catch { /* */ } }
  return false;
};
await click(/close|got it|ok/i);
await p.waitForTimeout(300);
// Start a fresh run: open setup, force the "New Run" tab, hit PLAY.
await click(/new run|play/i);
await p.waitForTimeout(400);
await click(/^new run$/i); // setup tab (no-op if already there)
await p.waitForTimeout(200);
await click(/^play$/i);
await p.waitForTimeout(1600); // intro transition
// Open run-info (M).
await p.keyboard.press("m");
await p.waitForTimeout(500);
// Hover a style row to surface the example-cards popup (Fighting Styles is the default tab).
const spear = p.locator(".ri-style-row", { hasText: "Spear" }).first();
try { await spear.hover({ timeout: 1500 }); } catch { /* */ }
await p.waitForTimeout(450);
await p.screenshot({ path: "verify-ri-styles-hover.png" });
const tabs = [
  ["Fighting Styles", "verify-ri-styles.png"],
  ["Opponents", "verify-ri-opponents.png"],
  ["Edicts", "verify-ri-edicts.png"],
  ["Stake", "verify-ri-stake.png"],
];
for (const [name, file] of tabs) {
  const t = p.getByRole("tab", { name: new RegExp(`^${name}$`, "i") }).first();
  try { await t.click({ timeout: 1500 }); } catch { /* */ }
  await p.waitForTimeout(350);
  await p.screenshot({ path: file });
}
console.log("done; pane buttons present:");
for (const t of await p.getByRole("tab").allInnerTexts()) console.log("  •", t);
await b.close();
