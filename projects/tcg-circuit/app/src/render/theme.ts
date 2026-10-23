// Visual identity for PRISM — the single source of truth for the brand palette. Mirrored to CSS
// custom properties in styles.css (kept in sync by hand; chrome must use a token, never a raw hex).
// Per-Affinity ramps (dark -> core) drive cards, FX, and UI accents so the game reads as one brand.
// Affinity is also shape-coded (a glyph), never hue alone (a11y).

import type { Affinity, Rarity } from "../engine/prism/types";

export type Ramp = { dark: string; mid: string; light: string; core: string; glow: string };

export const AFFINITY: Record<Affinity, Ramp & { glyph: string; label: string }> = {
  ember: { dark: "#7a1f12", mid: "#b6391f", light: "#e0573f", core: "#ffae4a", glow: "#ffe49a", glyph: "✦", label: "Ember" },
  tide: { dark: "#0f3a5c", mid: "#1d5f8c", light: "#2e7fb8", core: "#6fb8e0", glow: "#cfeaf8", glyph: "◈", label: "Tide" },
  verdant: { dark: "#134a1c", mid: "#1f6b2a", light: "#3a9e3f", core: "#6fc45a", glow: "#bfe8a0", glyph: "❧", label: "Verdant" },
  gloom: { dark: "#2a1840", mid: "#43295e", light: "#6b4c8a", core: "#9a7cc0", glow: "#d3c2ec", glyph: "☾", label: "Gloom" },
  order: { dark: "#7a5a14", mid: "#a8861f", light: "#d8c24a", core: "#f0dc7a", glow: "#fff3c4", glyph: "✚", label: "Order" },
  neutral: { dark: "#2b2f3a", mid: "#3f4655", light: "#5a6276", core: "#8a93a8", glow: "#c8cfdc", glyph: "◆", label: "Neutral" },
};

export const RARITY: Record<Rarity, { color: string; label: string }> = {
  common: { color: "#9aa3b2", label: "Common" },
  uncommon: { color: "#3a9e3f", label: "Uncommon" },
  rare: { color: "#6fb8e0", label: "Rare" },
  mythic: { color: "#ffae4a", label: "Mythic" },
};

// UI base palette.
export const UI = {
  ink: "#14102a",
  inkDeep: "#0d0a1c",
  panel: "#1f1838",
  panelLite: "#2a2150",
  gold: "#f4c430",
  goldDim: "#9c8330",
  text: "#f4e9cf",
  textDim: "#b6acc8",
  line: "#3a2f60",
  good: "#7ad06f",
  bad: "#e0506a",
};

export const PIXEL_FONT = "'Silkscreen', monospace";
export const TITLE_FONT = "'Press Start 2P', monospace";

// Plasma backdrop palettes per screen mood (dark -> light), reused by the Canvas2D living background.
export const PLASMA = {
  menu: ["#0d0a1c", "#241048", "#3a1f66", "#5a2e8c", "#1d1240"].map(hexToRgb) as [number, number, number][],
  duel: ["#0d1420", "#10283a", "#163a4c", "#23506a", "#0f2230"].map(hexToRgb) as [number, number, number][],
  build: ["#160d1c", "#2a1430", "#3a1f3e", "#1f1230", "#120a1c"].map(hexToRgb) as [number, number, number][],
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
