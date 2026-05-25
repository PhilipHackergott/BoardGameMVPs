import { Suit } from "../engine/types";

// Shared suit display constants for the combat UI (the glyphs, the per-suit power blurbs, and the
// accent tints). Kept in one place so the combat screen and the run sidebar agree.

export const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

// The single suit power each suit grants — a brief full description (not an abbreviation), shown for
// ONLY the suit(s) of the card(s) being previewed.
export const SUIT_EFFECT: Record<Suit, { glyph: string; label: string; cls: string }> = {
  H: { glyph: "♥", label: "Heal — return cards from the used pile under your deck", cls: "s-red" },
  D: { glyph: "♦", label: "Draw that many cards from your deck", cls: "s-red" },
  C: { glyph: "♣", label: "Double this attack's damage", cls: "s-dark" },
  S: { glyph: "♠", label: "Shield — reduce the royal's next strike (stacks)", cls: "s-dark" },
};

export const SUIT_KEYS: Suit[] = ["H", "D", "C", "S"];

export const SUIT_TINT: Record<Suit, string> = { H: "#e0506a", D: "#e89a3c", C: "#6fc0e0", S: "#b070e0" };
