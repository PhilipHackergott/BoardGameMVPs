// Conservative dead-CSS pruner. Over-approximates the LIVE class set (every identifier token in any
// .tsx — if it could be a class, we keep its rules) and removes only top-level rules whose EVERY
// comma-separated selector references a class that isn't live (and no live class). Keeps all @-rules
// (@media/@keyframes/@supports/@font-face), and any selector with no class (element/:root/*). Pass
// "--write" to apply; default is a dry-run report.
import { readFileSync, writeFileSync, readdirSync } from "fs";

const WRITE = process.argv.includes("--write");
const CSS = "src/styles.css";

// 1) live tokens + dynamic class prefixes from every .ts/.tsx under src/ui (+ main) — over-approximate.
//    .ts is scanned too because chip `cls` values (e.g. tt-common) live in packMeta.ts, and dynamic
//    classes like `dp-suit-${s}` / `tip-${side}` mean we must keep anything starting with that prefix.
const live = new Set();
const prefixes = new Set();
const srcFiles = [...readdirSync("src/ui").filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `src/ui/${f}`), "src/main.tsx"];
for (const f of srcFiles) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/[A-Za-z_][A-Za-z0-9_-]*/g)) live.add(m[0]);
  // dynamic class construction inside template literals: `…prefix-${…}` → keep all "prefix-*"
  for (const m of t.matchAll(/([A-Za-z][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*-)\$\{/g)) prefixes.add(m[1]);
}
const isLive = (cls) => live.has(cls) || [...prefixes].some((p) => cls.startsWith(p));

// 2) tokenize CSS into top-level segments, respecting comments + braces
const css = readFileSync(CSS, "utf8");
const segs = []; // { type: "rule"|"at"|"other", text, sel }
let i = 0;
const n = css.length;
function readToBrace() {
  // from i (at a non-{ char), capture the selector prelude up to the matching {...} block
  let start = i;
  while (i < n && css[i] !== "{" && css[i] !== "}") {
    if (css[i] === "/" && css[i + 1] === "*") { i = css.indexOf("*/", i + 2); i = i < 0 ? n : i + 2; continue; }
    i++;
  }
  const prelude = css.slice(start, i);
  if (css[i] !== "{") return { prelude, body: "", end: i }; // stray
  let depth = 0, bodyStart = i;
  for (; i < n; i++) {
    if (css[i] === "/" && css[i + 1] === "*") { i = css.indexOf("*/", i + 2); i = i < 0 ? n : i + 1; continue; }
    if (css[i] === "{") depth++;
    else if (css[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return { prelude, body: css.slice(bodyStart, i), end: i };
}

const out = [];
let removed = 0;
const removedSels = [];
while (i < n) {
  // pass through whitespace/comments verbatim between rules
  const wsStart = i;
  while (i < n) {
    if (/\s/.test(css[i])) { i++; continue; }
    if (css[i] === "/" && css[i + 1] === "*") { const e = css.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    break;
  }
  const lead = css.slice(wsStart, i);
  if (i >= n) { out.push(lead); break; }
  const segStart = i;
  const { prelude } = readToBrace();
  const full = css.slice(segStart, i);
  const sel = prelude.trim();
  const isAt = sel.startsWith("@");
  let dead = false;
  if (!isAt && sel.includes(".")) {
    // split selector list; a part is "dead" if it has class tokens and none are live
    const parts = sel.split(",").map((p) => p.trim()).filter(Boolean);
    const partDead = (p) => {
      const classes = [...p.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
      if (classes.length === 0) return false; // element/:root/* selector → keep (treat as live)
      return classes.every((c) => !isLive(c));
    };
    dead = parts.length > 0 && parts.every(partDead);
  }
  if (dead) { removed++; removedSels.push(sel.replace(/\s+/g, " ").slice(0, 80)); /* drop lead+rule */ }
  else { out.push(lead, full); }
}

const result = out.join("");
const before = css.split("\n").length;
const after = result.split("\n").length;
console.log(`live tokens: ${live.size}`);
console.log(`rules removed: ${removed}`);
console.log(`lines: ${before} → ${after} (−${before - after})`);
console.log("--- sample removed selectors ---");
console.log(removedSels.slice(0, 60).join("\n"));
if (WRITE) { writeFileSync(CSS, result); console.log("\nWROTE " + CSS); }
else console.log("\n(dry run — pass --write to apply)");
