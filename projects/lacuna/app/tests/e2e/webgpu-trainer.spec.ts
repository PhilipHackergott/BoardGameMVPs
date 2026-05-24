import { test, expect } from "@playwright/test";

// Validates the browser training harness runs end-to-end (imports resolve, model builds,
// batched self-play + training + report all execute in-browser). Headless Chromium usually has
// no WebGPU, so the trainer falls back to CPU here — that's fine; this proves the LOGIC. Real
// GPU speed needs the user's Chrome/Edge. Tiny params keep it fast.
test("webgpu trainer runs a generation + report in the browser", async ({ page }) => {
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));

  await page.goto("/train.html?concurrent=8&sims=4&games=8&batch=16&steps=4&reportEvery=1&reportGames=2&hidden=64&layers=2");
  await page.getByRole("button", { name: /start/i }).click();

  // Wait until a full generation + its Elo report have been logged (or surface an error).
  await page.waitForFunction(
    () => {
      const t = document.getElementById("log")?.textContent ?? "";
      return /ELO UPDATE/.test(t) || /ERROR:/.test(t);
    },
    { timeout: 180000 },
  );

  const logText = (await page.locator("#log").textContent()) ?? "";
  console.log("---- trainer log ----\n" + logText);

  expect(logText).toContain("backend=");
  expect(logText).toMatch(/gen 1/);
  expect(logText).toContain("ELO UPDATE");
  expect(logText).not.toContain("ERROR:");
  expect(logs.filter((l) => l.startsWith("PAGEERROR")).join("\n")).toBe("");
});
