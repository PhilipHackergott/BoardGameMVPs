// Theme palette for the Lacuna pond. Original artwork — flowers are drawn from
// scratch (see render/board.ts), not copied from any published assets. The hues
// mirror the "cozy night pond" look: jewel-toned blossoms on dark water.

export const FLOWER_NAMES: string[] = [
  "Bellflower",
  "Lotus",
  "Water Lily",
  "Marigold",
  "Jasmine",
  "Primrose",
  "Anemone",
];

// Petal colour + a slightly deeper glow used for the soft bloom halo.
export const STAR_COLORS: number[] = [
  0x6366f1, // Bellflower — indigo
  0xec4899, // Lotus — pink
  0xa855f7, // Water Lily — violet
  0xf97316, // Marigold — orange
  0x14b8a6, // Jasmine — teal
  0xfacc15, // Primrose — yellow
  0xffffff, // Anemone — white
];
export const STAR_GLOWS: number[] = [
  0x4f46e5, 0xdb2777, 0x9333ea, 0xea580c, 0x0d9488, 0xca8a04, 0xe2e8f0,
];

// Each flower kind has a distinct silhouette (petal count + petal style) so it is
// recognizable by shape, not colour alone — as in Lacuna.
export type PetalStyle = "round" | "pointed" | "ray";
export interface FlowerShape {
  petals: number;
  style: PetalStyle;
}
export const FLOWER_SHAPES: FlowerShape[] = [
  { petals: 5, style: "pointed" }, // Bellflower
  { petals: 8, style: "pointed" }, // Lotus
  { petals: 6, style: "round" }, // Water Lily
  { petals: 14, style: "ray" }, // Marigold
  { petals: 4, style: "round" }, // Jasmine
  { petals: 5, style: "round" }, // Primrose
  { petals: 11, style: "ray" }, // Anemone
];

const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
export const STAR_COLOR_CSS: string[] = STAR_COLORS.map(hex);
export const STAR_GLOW_CSS: string[] = STAR_GLOWS.map(hex);

// Up to four players. Pawn styling is [base, shine, core] per player index.
export const PLAYER_NAMES: string[] = ["Gold", "Silver", "Rose", "Fern"];
export const PAWN_BASE: number[] = [0xf59e0b, 0x94a3b8, 0xf43f5e, 0x22c55e];
export const PAWN_SHINE: number[] = [0xfef08a, 0xcbd5e1, 0xfecdd3, 0xbbf7d0];
export const PAWN_CORE: number[] = [0xd97706, 0x64748b, 0xbe123c, 0x15803d];
export const PLAYER_COLOR_CSS: string[] = ["#fbbf24", "#cbd5e1", "#fb7185", "#4ade80"];

// Pond + canvas backdrop.
export const POND_CENTER = 0x0f172a;
export const POND_MID = 0x0b1329;
export const POND_EDGE = 0x05070e;
export const POND_RING = 0x312e81;
export const POND_RING_SOFT = 0x818cf8;

// Guide lines + pawn preview.
export const LINE_CLEAR = 0x34d399; // emerald: an unblocked path
export const LINE_BLOCKED = 0xef4444; // red: a blocked path
export const LINE_FLY = 0x38bdf8; // sky: a path usable only via the Flying power
export const PREVIEW_COLORS: number[] = [0xfbbf24, 0xd1d5db, 0xfb7185, 0x86efac];

// Influence-lens region tint per player.
export const LENS_COLORS: number[] = [0xfbbf24, 0xcbd5e1, 0xfb7185, 0x4ade80];

// Lighten a packed RGB color toward white by t in [0,1].
export function lighten(color: number, t: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const nr = Math.round(r + (255 - r) * t);
  const ng = Math.round(g + (255 - g) * t);
  const nb = Math.round(b + (255 - b) * t);
  return (nr << 16) | (ng << 8) | nb;
}
