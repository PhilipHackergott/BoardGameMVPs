// Pure display helpers: labels, glyphs (emoji "art"), and badges for cards.
import { ANIMAL_BY_ID, ENV_BY_ID, IMPROVEMENT_BY_ID, type Biome, type Card } from "../engine";

export const BIOME_LABEL: Record<Biome, string> = { zuhause: "Zuhause", stadt: "Stadt", natur: "Natur" };
export const BIOME_GLYPH: Record<Biome, string> = { zuhause: "🏠", stadt: "🏙️", natur: "🌿" };

// Friendly emoji "art" per card — gives the cozy animal-home theme a lot of character cheaply.
// Hossi, Mikel and Hippo are all hippos (🦛); Hossi is a bigger hippo than Mikel (see GLYPH_SCALE).
// Mungo is a gorilla, Croco a crocodile, Rocky a husky. Sheeps come in 3 colours (see sheepTint).
export const ANIMAL_GLYPH: Record<string, string> = {
  croco: "🐊", mungo: "🦍", hippo: "🦛", dromi: "🐪", hossi: "🦛", rocky: "🐕", dalai_lama: "🦙",
  bumpa: "🐻", leo: "🦁", bob: "🐢", marty: "🦓",
  sheep_white: "🐑", sheep_brown: "🐑", sheep_black: "🐑", marley: "🐑", mikel: "🦛",
};

// Relative glyph size so the three hippos read as different sizes (Hossi big, Mikel small).
export const GLYPH_SCALE: Record<string, number> = { hossi: 1.3, hippo: 1.1, mikel: 0.82 };

// ⚑ Three distinct sheep colours (white / brown / black). Currently cosmetic only — applied as a
// CSS tint. Sheeps spread across the three colours by instance; Marley is the black sheep.
export function sheepTintClass(defId: string, _cardId: number): string | null {
  if (defId === "sheep_white") return "sheep-white";
  if (defId === "sheep_brown") return "sheep-brown";
  if (defId === "sheep_black" || defId === "marley") return "sheep-black";
  return null;
}
export const ENV_GLYPH: Record<string, string> = {
  park: "🌳", feld: "🌾", trattoria: "🍝", reisetasche: "🧳", wohnzimmer: "🛋️", landhaus: "🏡", cafe: "☕", bulli: "🚐",
};
export const IMPROVEMENT_GLYPH: Record<string, string> = {
  ausbau: "🔨", dekoration: "🖼️", popup_couch: "🛋️", boombox: "📻", blumentopf: "🪴", verkleidung: "🎭",
};

export function cardGlyph(card: Card): string {
  if (card.kind === "env") return ENV_GLYPH[card.defId] ?? "🏠";
  if (card.kind === "animal") return ANIMAL_GLYPH[card.defId] ?? "🐾";
  return IMPROVEMENT_GLYPH[card.defId] ?? "✨";
}

export function cardTitle(card: Card): string {
  if (card.kind === "env") return ENV_BY_ID[card.defId].name;
  if (card.kind === "animal") return ANIMAL_BY_ID[card.defId].name;
  return IMPROVEMENT_BY_ID[card.defId].name;
}

export function animalBadges(defId: string): string[] {
  const d = ANIMAL_BY_ID[defId];
  const b: string[] = [];
  if (d.security) b.push("🛡 Security");
  if (d.schaf) b.push("🐑 Schaf");
  if (d.types.includes("joker")) b.push("🃏 Joker");
  return b;
}

export function animalEffectText(defId: string): string {
  const d = ANIMAL_BY_ID[defId];
  switch (d.effect) {
    case "hossi": return "+1 with Mikel, −1 without";
    case "mikel": return "+1 with Hossi, −1 without";
    case "sheep": {
      const th = d.herdThreshold ?? 3;
      return `+1 if ≥${th} Schafe${d.needsSecurity ? " · −1 if no Security" : ""}`;
    }
    case "leo4": return "+2 if exactly 4 Schafe here";
    case "dalaiAlone": return "+2 if alone · Draft: rotate all hands";
    case "martySecurity": return "+1 per Security here · Draft: swap a hand";
    case "none": return d.types.includes("joker") ? "Wild: counts as Schaf & Security" : "";
  }
}

export function improvementEffectText(defId: string): string {
  const d = IMPROVEMENT_BY_ID[defId];
  switch (d.kind) {
    case "ausbau": return "+2 Raum capacity";
    case "dekoration": return "No minus points in this room";
    case "biome": return `Adds ${d.biome ? BIOME_LABEL[d.biome] : ""} tag`;
    case "verkleidung": return "Target animal becomes 🃏 Joker";
  }
}

export const PLAYER_GLYPH = ["●", "▲", "■", "◆"]; // shape, not colour alone (accessibility)
export const PLAYER_CLASS = ["p0", "p1", "p2", "p3"];
