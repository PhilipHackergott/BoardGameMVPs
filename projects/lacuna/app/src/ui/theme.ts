// Reskins for Lacuna. A theme is pure data — colour palette, names, glyphs, background,
// and terminology — read by the renderer (render/board.ts), the menu backdrop, the SVG
// glyph, and the UI labels. Default "pond"; "zodiac" is a watercolor astrology star-chart.

export type ThemeId = "pond" | "zodiac";
export type Rgb = [number, number, number];

export interface Theme {
  id: ThemeId;
  label: string;
  subtitle: string;
  names: string[]; // the 7 collectibles
  glyphs: string[] | null; // unicode symbols for the UI glyph (zodiac); null = petalled flower
  starColors: number[]; // 0xRRGGBB per colour
  starGlows: number[];
  starCss: string[]; // "#rrggbb" per colour (SVG/CSS swatches & borders)
  pond: { center: number; mid: number; edge: number; ring: number; ringSoft: number };
  plasma: Rgb[]; // menu backdrop palette (dark → light)
  // Terminology so banners/menus read naturally per theme.
  words: { item: string; items: string; board: string; sub: string };
}

const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");

const POND: Theme = {
  id: "pond",
  label: "Pond",
  subtitle: "Cozy night pond sandbox",
  names: ["Bellflower", "Lotus", "Water Lily", "Marigold", "Jasmine", "Primrose", "Anemone"],
  glyphs: null,
  starColors: [0x6366f1, 0xec4899, 0xa855f7, 0xf97316, 0x14b8a6, 0xfacc15, 0xffffff],
  starGlows: [0x4f46e5, 0xdb2777, 0x9333ea, 0xea580c, 0x0d9488, 0xca8a04, 0xe2e8f0],
  starCss: [],
  pond: { center: 0x0f172a, mid: 0x0b1329, edge: 0x05070e, ring: 0x312e81, ringSoft: 0x818cf8 },
  plasma: [
    [4, 6, 13],
    [9, 15, 34],
    [24, 24, 64],
    [49, 46, 129],
    [88, 101, 220],
    [129, 140, 248],
  ],
  words: { item: "flower", items: "flowers", board: "pond", sub: "pond" },
};

// Watercolor astrology: the 7 collectibles are the 7 classical planets, on a violet/indigo
// night-sky wash with gold accents. The board reads as a soft star-chart.
const ZODIAC: Theme = {
  id: "zodiac",
  label: "Zodiac",
  subtitle: "A watercolor star-chart",
  names: ["Sol", "Luna", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"],
  glyphs: ["☉", "☾", "☿", "♀", "♂", "♃", "♄"],
  starColors: [0xfcd34d, 0xdbeafe, 0x67e8f9, 0xf9a8d4, 0xf87171, 0xfdba74, 0xc4b5fd],
  starGlows: [0xf59e0b, 0x93c5fd, 0x22d3ee, 0xf472b6, 0xef4444, 0xfb923c, 0xa78bfa],
  starCss: [],
  pond: { center: 0x231a52, mid: 0x16112e, edge: 0x0a0818, ring: 0x7c3aed, ringSoft: 0xc4b5fd },
  plasma: [
    [8, 6, 22],
    [22, 14, 52],
    [40, 22, 82],
    [88, 44, 150],
    [140, 92, 224],
    [205, 188, 255],
  ],
  words: { item: "star", items: "stars", board: "sky", sub: "chart" },
};

for (const t of [POND, ZODIAC]) t.starCss = t.starColors.map(hex);

export const THEMES: Record<ThemeId, Theme> = { pond: POND, zodiac: ZODIAC };
export const getTheme = (id: ThemeId): Theme => THEMES[id] ?? POND;
