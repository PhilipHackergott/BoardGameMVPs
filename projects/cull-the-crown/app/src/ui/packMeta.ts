import { PackKind, PackSize } from "../engine/types";

// Single source of truth for the pack/ware label maps shared by the shop board, the pack modal and the
// shop sidebar. (Pixi colour tints live in render/shopStage.ts; DOM SVG tints in ItemArt.tsx — those are
// framework-specific representations and stay there.)

export const PACK_LABEL: Record<PackKind, string> = {
  card: "Card Pack",
  tarot: "Tarot Pack",
  relic: "Joker Pack",
  style: "Training Pack",
  spectral: "Spectral Pack",
};

export const SIZE_LABEL: Record<PackSize, string> = { s: "S", m: "M", l: "L", xl: "XL" };

export const PACK_PICKS: Record<PackSize, string> = {
  s: "pick 1 of 2",
  m: "pick 1 of 3",
  l: "pick 1 of 5",
  xl: "pick 2 of 5",
};

// the tooltip type-chip slug for each ware/pack kind (relic = guild member = "joker")
export const LOOSE_TIP_TYPE: Record<PackKind, string> = {
  card: "card",
  tarot: "tarot",
  relic: "joker",
  style: "drill",
  spectral: "spectral",
};

// tooltip "type tag" chip: a label + its colour class, keyed by tipType slug
export const TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  joker: { label: "Joker", cls: "tt-joker" },
  tarot: { label: "Tarot", cls: "tt-tarot" },
  spectral: { label: "Spectral", cls: "tt-spectral" },
  drill: { label: "Training", cls: "tt-drill" },
  card: { label: "Playing Card", cls: "tt-card" },
  booster: { label: "Booster", cls: "tt-booster" },
  edict: { label: "Edict", cls: "tt-edict" },
  sigil: { label: "Sigil", cls: "tt-sigil" },
  seal: { label: "Seal", cls: "tt-seal" },
  royal: { label: "Royal", cls: "tt-royal" },
};

// rarity chip: a label + colour class keyed by a Joker's rarity. Renders beside the TYPE_CHIP in the
// same tooltip surfaces (DOM TooltipLayer + the Pixi shop tip-pop). Colours follow the game's rarity
// palette (uncommon → blue, rare → violet; common → neutral).
export const RARITY_CHIP: Record<string, { label: string; cls: string }> = {
  common: { label: "Common", cls: "tt-common" },
  uncommon: { label: "Uncommon", cls: "tt-uncommon" },
  rare: { label: "Rare", cls: "tt-rare" },
};
