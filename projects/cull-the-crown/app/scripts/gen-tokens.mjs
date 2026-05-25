// Single source of truth for the brand palette: render/theme.ts (the Pixi `THEME` ints). This emits the
// matching CSS custom properties into styles.css's :root, between the BRAND-TOKENS markers, so the DOM
// and Pixi never drift. Runs as a prebuild step (npm run build) and on demand (npm run gen:tokens).
// DOM-only structural colours (--bg/--panel/--muted/--line/--ink/--parch-ink) live OUTSIDE the markers,
// hand-maintained — they have no Pixi counterpart.
import { readFileSync, writeFileSync } from "fs";

const THEME_TS = "src/render/theme.ts";
const CSS = "src/styles.css";
const START = "  /* >>> brand tokens — generated from render/theme.ts (npm run gen:tokens); do not edit by hand >>> */";
const END = "  /* <<< brand tokens <<< */";

// parse `name: 0xRRGGBB,` out of the THEME object
const theme = {};
const block = readFileSync(THEME_TS, "utf8").match(/export const THEME =\s*\{([\s\S]*?)\};/)?.[1] ?? "";
for (const m of block.matchAll(/([A-Za-z0-9]+):\s*0x([0-9a-fA-F]{6})/g)) theme[m[1]] = m[2].toLowerCase();

// CSS var name → THEME key (the shared brand colours)
const MAP = {
  "--gold": "gold",
  "--gold-bright": "goldBright",
  "--red": "red",
  "--blood": "blood",
  "--good": "good",
  "--blue": "blue",
  "--violet": "violet",
  "--frame": "frameDim",
  "--parch": "parchment",
  "--parch-lite": "parchmentLite",
  "--parch-edge": "parchmentEdge",
};

const missing = Object.values(MAP).filter((k) => !theme[k]);
if (missing.length) {
  console.error("gen-tokens: THEME is missing keys: " + missing.join(", "));
  process.exit(1);
}
const lines = Object.entries(MAP).map(([v, k]) => `  ${v}: #${theme[k]};`);
const generated = [START, ...lines, END].join("\n");

const css = readFileSync(CSS, "utf8");
const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
if (!re.test(css)) {
  console.error(`gen-tokens: markers not found in ${CSS}. Add them inside :root:\n${START}\n${END}`);
  process.exit(1);
}
const next = css.replace(re, generated);
if (next !== css) {
  writeFileSync(CSS, next);
  console.log("gen-tokens: updated brand :root vars from THEME");
} else {
  console.log("gen-tokens: brand :root vars already in sync");
}
