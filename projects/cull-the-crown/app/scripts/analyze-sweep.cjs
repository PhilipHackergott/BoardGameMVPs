#!/usr/bin/env node
// Reads the sweep output (lines starting with `PLAYTEST_RESULT {...}`) from stdin and prints an
// aggregated summary keyed by deck, stake, and per-tier death distribution. Used by the operator
// between epochs to direct the balance pass.

const lines = require("fs").readFileSync(0, "utf8").split("\n").filter((l) => l.trim());
const data = [];
for (const l of lines) {
  const m = l.match(/PLAYTEST_RESULT (.*)$/);
  if (!m) continue;
  try { data.push(JSON.parse(m[1])); } catch (e) { /* skip noise */ }
}
console.log("=== Sweep summary ===");
console.log("Total runs:", data.length);
const completed = data.filter((r) => r.fights.length >= 12 && r.fights.every((f) => f.outcome === "won"));
console.log("Full clears (all 12 won):", completed.length);
const lastTier = {};
let totalFights = 0;
for (const r of data) {
  totalFights += r.fights.length;
  const lf = r.fights[r.fights.length - 1];
  if (!lf || lf.outcome !== "lost") continue;
  lastTier[lf.tier] = (lastTier[lf.tier] || 0) + 1;
}
console.log("Avg fights per run:", (totalFights / Math.max(1, data.length)).toFixed(1));
console.log("Deaths by tier:", lastTier);
const byDeck = {};
for (const r of data) {
  const k = r.deck;
  if (!byDeck[k]) byDeck[k] = { runs: 0, fightsWon: 0, clears: 0 };
  byDeck[k].runs++;
  byDeck[k].fightsWon += r.fightsWon;
  if (r.fights.length >= 12 && r.fights.every((f) => f.outcome === "won")) byDeck[k].clears++;
}
console.log("Per deck (avg fights won):");
for (const [k, v] of Object.entries(byDeck).sort((a, b) => a[1].fightsWon / a[1].runs - b[1].fightsWon / b[1].runs)) {
  console.log("  ", k.padEnd(14), (v.fightsWon / v.runs).toFixed(2), "clears=" + v.clears + "/" + v.runs);
}
const byStake = {};
for (const r of data) {
  const k = r.stake;
  if (!byStake[k]) byStake[k] = { runs: 0, fightsWon: 0 };
  byStake[k].runs++;
  byStake[k].fightsWon += r.fightsWon;
}
console.log("Per stake:");
for (const [k, v] of Object.entries(byStake)) console.log("  ", k.padEnd(8), (v.fightsWon / v.runs).toFixed(2));
