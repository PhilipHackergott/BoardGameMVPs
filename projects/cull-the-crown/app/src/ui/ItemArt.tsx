import { Suit } from "../engine/types";

// Original emblem art for shop items (jokers/relics + consumables). Flat, chunky SVG in the
// medieval/arcade palette — recognizable at a glance, no external assets. Keyed by Joker.art or by
// consumable kind ("knife" cull / "scroll" recruit / "anvil" train).

const C = {
  ink: "#1a1020",
  gold: "#f2c14e",
  goldBright: "#ffe9a0",
  parch: "#e8d8a0",
  parchDark: "#c9b787",
  blood: "#c0273f",
  bloodLite: "#e0506a",
  steel: "#aab0c4",
  steelDark: "#6a7088",
  stone: "#5a5478",
  leather: "#8a5a32",
  leatherDark: "#553820",
  violet: "#b070e0",
  sky: "#6fc0e0",
  white: "#f4eee0",
};

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const SUIT_FILL: Record<Suit, string> = { H: "#e0506a", D: "#e89a3c", C: "#6fc0e0", S: "#b070e0" };

const stroke = { stroke: C.ink, strokeWidth: 2, strokeLinejoin: "round" as const };

function emblem(icon: string, suit?: Suit) {
  switch (icon) {
    case "shield":
      return (
        <g>
          <path d="M24 8 L39 13 V25 C39 36 24 42 24 42 C24 42 9 36 9 25 V13 Z" fill={C.steel} stroke={C.gold} strokeWidth={2} />
          <path d="M24 8 L9 13 V25 C9 36 24 42 24 42 Z" fill={C.steelDark} opacity={0.5} />
          <polygon points="20,13 28,13 26,30 22,30" fill={C.blood} />
          <circle cx={24} cy={33} r={3} fill={C.bloodLite} />
        </g>
      );
    case "dagger":
      return (
        <g transform="rotate(-20 24 24)">
          <polygon points="24,5 28,11 27,29 21,29 20,11" fill={C.steel} {...stroke} />
          <rect x={13} y={28} width={22} height={4} rx={1} fill={C.gold} {...stroke} />
          <rect x={22} y={32} width={4} height={8} fill={C.leatherDark} />
          <circle cx={24} cy={42} r={3} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        </g>
      );
    case "jester":
      return (
        <g>
          <polygon points="12,30 5,13 17,27" fill={C.blood} {...stroke} />
          <polygon points="36,30 43,13 31,27" fill={C.sky} {...stroke} />
          <polygon points="20,30 24,7 28,30" fill={C.gold} {...stroke} />
          <rect x={11} y={28} width={26} height={6} rx={3} fill={C.violet} {...stroke} />
          <circle cx={5} cy={12} r={3} fill={C.gold} />
          <circle cx={43} cy={12} r={3} fill={C.gold} />
          <circle cx={24} cy={6} r={3} fill={C.bloodLite} />
        </g>
      );
    case "medic":
      return (
        <g>
          <path d="M24 41 C9 30 10 18 18 16 C22 15 24 18 24 21 C24 18 26 15 30 16 C38 18 39 30 24 41 Z" fill={C.blood} {...stroke} />
          <rect x={21} y={20} width={6} height={14} fill={C.white} />
          <rect x={17} y={24} width={14} height={6} fill={C.white} />
        </g>
      );
    case "satchel":
      return (
        <g>
          <rect x={10} y={18} width={28} height={22} rx={3} fill={C.leather} {...stroke} />
          <path d="M10 20 Q24 12 38 20 V24 H10 Z" fill={C.leatherDark} {...stroke} />
          <rect x={15} y={12} width={4} height={28} fill={C.leatherDark} />
          <rect x={29} y={12} width={4} height={28} fill={C.leatherDark} />
          <rect x={21} y={26} width={6} height={6} rx={1} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        </g>
      );
    case "pouch":
      return (
        <g>
          <ellipse cx={24} cy={31} rx={14} ry={13} fill={C.leather} {...stroke} />
          <path d="M16 17 Q24 22 32 17 L30 12 H18 Z" fill={C.leatherDark} {...stroke} />
          <rect x={16} y={19} width={16} height={3} rx={1} fill={C.gold} />
          <polygon points="24,24 31,31 24,38 17,31" fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        </g>
      );
    case "swords":
      return (
        <g>
          {[40, -40].map((deg, i) => (
            <g key={i} transform={`rotate(${deg} 24 24)`}>
              <polygon points="24,5 27,9 26,30 22,30 21,9" fill={C.steel} {...stroke} />
              <rect x={18} y={30} width={12} height={3} fill={C.gold} {...stroke} />
              <rect x={22} y={33} width={4} height={7} fill={C.leatherDark} />
            </g>
          ))}
        </g>
      );
    case "bomb":
      return (
        <g>
          <circle cx={22} cy={31} r={13} fill="#15101c" stroke={C.steelDark} strokeWidth={2} />
          <circle cx={18} cy={27} r={3} fill={C.steel} opacity={0.6} />
          <rect x={26} y={14} width={6} height={6} fill={C.steelDark} />
          <path d="M30 16 Q40 8 36 4" fill="none" stroke={C.leather} strokeWidth={2} />
          <circle cx={36} cy={4} r={2.5} fill={C.goldBright} />
          <path d="M36 0 L37 4 41 4 38 7 39 11 36 8 33 11 34 7 31 4 35 4 Z" fill={C.gold} opacity={0.9} />
        </g>
      );
    case "knife": // Culling Knife
      return (
        <g transform="rotate(-16 24 24)">
          <polygon points="24,4 28,9 27,26 21,26 20,9" fill={C.steel} {...stroke} />
          <rect x={20} y={26} width={8} height={13} rx={1} fill={C.leatherDark} {...stroke} />
          <circle cx={24} cy={30} r={1.4} fill={C.gold} />
          <circle cx={24} cy={35} r={1.4} fill={C.gold} />
        </g>
      );
    case "scroll": // Recruitment Writ — a sheet with clearly curled rolls top & bottom
      return (
        <g>
          {/* parchment sheet */}
          <rect x={15} y={13} width={18} height={22} fill={C.parch} stroke={C.leatherDark} strokeWidth={1.5} />
          <rect x={18} y={19} width={12} height={2} fill={C.leatherDark} opacity={0.55} />
          <rect x={18} y={23} width={9} height={2} fill={C.leatherDark} opacity={0.55} />
          <circle cx={29} cy={30} r={3.5} fill={C.blood} stroke={C.ink} strokeWidth={1.2} />
          {/* top roll: a cylinder with a spiral curl on the left end */}
          <rect x={10} y={8} width={28} height={9} rx={4.5} fill={C.parchDark} {...stroke} />
          <ellipse cx={13} cy={12.5} rx={3.5} ry={4.5} fill={C.parch} stroke={C.leatherDark} strokeWidth={1.5} />
          <path d="M13 10 a2.5 2.5 0 1 1 -0.1 0" fill="none" stroke={C.leatherDark} strokeWidth={1.3} />
          {/* bottom roll: cylinder with a spiral curl on the right end */}
          <rect x={10} y={31} width={28} height={9} rx={4.5} fill={C.parchDark} {...stroke} />
          <ellipse cx={35} cy={35.5} rx={3.5} ry={4.5} fill={C.parch} stroke={C.leatherDark} strokeWidth={1.5} />
          <path d="M35 33 a2.5 2.5 0 1 1 -0.1 0" fill="none" stroke={C.leatherDark} strokeWidth={1.3} />
        </g>
      );
    case "anvil": // Train a suit
      return (
        <g>
          <text x={24} y={15} textAnchor="middle" fontSize={16} fontFamily="Georgia, serif" fill={suit ? SUIT_FILL[suit] : C.gold}>
            {suit ? GLYPH[suit] : "★"}
          </text>
          <polygon points="9,24 39,24 39,28 33,31 15,31 9,28" fill={C.steelDark} {...stroke} />
          <polygon points="39,23 47,25 39,29" fill={C.steelDark} {...stroke} />
          <rect x={20} y={31} width={8} height={4} fill={C.steelDark} />
          <rect x={14} y={35} width={20} height={4} rx={1} fill={C.stone} {...stroke} />
        </g>
      );
    default:
      return <circle cx={24} cy={24} r={12} fill={C.stone} {...stroke} />;
  }
}

export default function ItemArt({ icon, suit, size = 44 }: { icon: string; suit?: Suit; size?: number }) {
  return (
    <svg className="item-art" width={size} height={size} viewBox="0 0 48 48" shapeRendering="geometricPrecision" aria-hidden="true">
      <rect x={1} y={1} width={46} height={46} rx={7} fill="#1c1226" stroke={C.gold} strokeWidth={2} />
      {emblem(icon, suit)}
    </svg>
  );
}

// A booster-pack: a tinted foil wrapper with a torn seal band, a couple of cards peeking out the top,
// a foil shine, and the pack kind's emblem. Reads as a "pack of cards", colour-coded per kind.
const PACK_TINT: Record<string, { base: string; dark: string; lite: string }> = {
  card: { base: "#c39a44", dark: "#7a5a22", lite: "#e8c46a" },
  tarot: { base: "#8a5cc0", dark: "#523485", lite: "#b88ce0" },
  relic: { base: "#5a8fc0", dark: "#365f88", lite: "#86b8e0" }, // Joker pack
  style: { base: "#56a25c", dark: "#356a3a", lite: "#84d08a" }, // Training (fighting-style) pack
  spectral: { base: "#4a6a8a", dark: "#2a4258", lite: "#7fb0c8" }, // Spectral pack
};
const PACK_CENTER: Record<string, string> = { card: "scroll", tarot: "jester", relic: "shield", style: "anvil", spectral: "medic" };

export function PackArt({ kind, size = 60 }: { kind: string; size?: number }) {
  const t = PACK_TINT[kind] ?? PACK_TINT.card;
  return (
    <svg
      className="item-art pack-art"
      width={size}
      height={Math.round(size * 1.16)}
      viewBox="0 0 48 56"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      {/* cards peeking out of the top of the wrapper */}
      <rect x={11} y={2} width={13} height={16} rx={1.5} fill={C.parch} stroke={C.ink} strokeWidth={1.5} transform="rotate(-8 17 10)" />
      <rect x={24} y={2} width={13} height={16} rx={1.5} fill={C.parch} stroke={C.ink} strokeWidth={1.5} transform="rotate(8 31 10)" />
      {/* foil wrapper body */}
      <rect x={6} y={11} width={36} height={43} rx={3.5} fill={t.base} stroke={C.ink} strokeWidth={2} />
      <rect x={8} y={13} width={32} height={4} rx={2} fill={t.lite} opacity={0.7} />
      {/* sealed top band with a torn lower edge */}
      <path d="M6 11 h36 v9 l-3 2 -3 -2 -3 2 -3 -2 -3 2 -3 -2 -3 2 -3 -2 -3 2 -3 -2 z" fill={t.dark} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
      {/* diagonal foil shine */}
      <polygon points="12,53 24,13 29,13 17,53" fill="#ffffff" opacity={0.13} />
      {/* the pack kind's emblem, centred on the body */}
      <g transform="translate(12 21) scale(0.5)">{emblem(PACK_CENTER[kind] ?? "scroll")}</g>
    </svg>
  );
}
