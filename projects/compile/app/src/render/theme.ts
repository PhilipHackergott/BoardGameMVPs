// Visual identity for COMPILE: a futuristic neon-arcade / synthwave take on a duel between rogue
// AIs. Dark space, electric grid, glowing monospace type, hard glassy panels with chromatic glow.
// Each protocol gets a signature neon hue used for its cards, headers and compile bursts.

import { ProtocolName } from "../engine/types";

export interface ProtoColor {
  /** main neon, used for borders/text glow */
  hex: string;
  /** brighter highlight */
  lite: string;
  /** rgb triple for canvas particles */
  rgb: [number, number, number];
}

export const PROTO_COLORS: Record<ProtocolName, ProtoColor> = {
  Spirit: { hex: "#67e8f9", lite: "#cffafe", rgb: [103, 232, 249] },
  Death: { hex: "#c084fc", lite: "#f0d9ff", rgb: [192, 132, 252] },
  Fire: { hex: "#ff7a3c", lite: "#ffd0a8", rgb: [255, 122, 60] },
  Metal: { hex: "#9fb3c8", lite: "#e3edf7", rgb: [159, 179, 200] },
  Gravity: { hex: "#a78bfa", lite: "#ddd6fe", rgb: [167, 139, 250] },
  Life: { hex: "#4ade80", lite: "#bbf7d0", rgb: [74, 222, 128] },
  Light: { hex: "#fde047", lite: "#fef9c3", rgb: [253, 224, 71] },
  Plague: { hex: "#a3e635", lite: "#ecfccb", rgb: [163, 230, 53] },
  Darkness: { hex: "#818cf8", lite: "#c7d2fe", rgb: [129, 140, 248] },
  Water: { hex: "#38bdf8", lite: "#bae6fd", rgb: [56, 189, 248] },
  Psychic: { hex: "#f472b6", lite: "#fbcfe8", rgb: [244, 114, 182] },
  Speed: { hex: "#2dd4bf", lite: "#99f6e4", rgb: [45, 212, 191] },
};

/** Verb summary printed in the rulebook draft — shown in the draft + as flavour. */
export const PROTO_VERBS: Record<ProtocolName, string> = {
  Spirit: "FLIP · SHIFT · DRAW",
  Death: "DELETE · DRAW",
  Fire: "DISCARD FOR EFFECT",
  Metal: "PREVENT · DRAW · FLIP",
  Gravity: "SHIFT · FLIP · DRAW",
  Life: "FLIP · TOP-DECK · DRAW",
  Light: "DRAW · FLIP · SHIFT",
  Plague: "FORCED DISCARD · FLIP",
  Darkness: "DRAW · SHIFT · MANIPULATE",
  Water: "RETURN · DRAW · FLIP",
  Psychic: "DRAW · MANIPULATE · SHIFT",
  Speed: "DRAW · PLAY · SHIFT",
};

export const PLAYER_NEON = ["#22d3ee", "#f472b6"]; // P1 cyan, P2 magenta
