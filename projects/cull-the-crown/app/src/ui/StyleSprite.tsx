import { FightingStyleId } from "../engine/types";

// A tiny original pixel-art sprite for each Fighting Style (the size-style of a play: 1 card →
// Two-Handed … 5 → Mage; an Animal Companion makes it Mounted). Flat chunky shapes in the game's
// palette, drawn crisp. Shown in the sidebar's Fighting-Style box.

const C = {
  ink: "#1a1020",
  steel: "#aab0c4",
  steelD: "#6a7088",
  gold: "#f2c14e",
  wood: "#8a5a32",
  woodD: "#553820",
  violet: "#b070e0",
  violetL: "#d8b8f5",
  blood: "#c0273f",
  sky: "#6fc0e0",
};

function art(id: FightingStyleId) {
  switch (id) {
    case "twoHanded": // a great-sword held in both hands
      return (
        <g>
          <polygon points="12,2 14,5 14,15 10,15 10,5" fill={C.steel} stroke={C.ink} strokeWidth={1} />
          <rect x={10} y={6} width={1} height={9} fill={C.steelD} />
          <rect x={5} y={15} width={14} height={2} fill={C.gold} stroke={C.ink} strokeWidth={0.6} />
          <rect x={11} y={17} width={2} height={4} fill={C.wood} />
          <rect x={10} y={21} width={4} height={2} fill={C.gold} />
        </g>
      );
    case "swordShield": // a shield + a short sword
      return (
        <g>
          <polygon points="4,4 11,4 11,12 7.5,16 4,12" fill={C.steel} stroke={C.ink} strokeWidth={1} />
          <polygon points="7.5,6 9,6 8.5,12 7,12" fill={C.blood} />
          <polygon points="18,3 20,5 15,15 13,13" fill={C.steel} stroke={C.ink} strokeWidth={0.8} />
          <rect x={13} y={13} width={4} height={2} fill={C.gold} transform="rotate(45 15 14)" />
        </g>
      );
    case "spear": // a long spear
      return (
        <g>
          <rect x={5} y={5} width={14} height={2} fill={C.wood} transform="rotate(45 12 12)" />
          <polygon points="18,2 22,6 18,7 16,4" fill={C.steel} stroke={C.ink} strokeWidth={0.8} />
        </g>
      );
    case "dualWield": // two crossed daggers
      return (
        <g>
          <g transform="rotate(20 12 12)">
            <polygon points="11,3 13,3 12.5,16 11.5,16" fill={C.steel} stroke={C.ink} strokeWidth={0.6} />
            <rect x={9} y={16} width={6} height={2} fill={C.gold} />
          </g>
          <g transform="rotate(-20 12 12)">
            <polygon points="11,3 13,3 12.5,16 11.5,16" fill={C.steel} stroke={C.ink} strokeWidth={0.6} />
            <rect x={9} y={16} width={6} height={2} fill={C.wood} />
          </g>
        </g>
      );
    case "mage": // a staff topped with a glowing orb
      return (
        <g>
          <rect x={11} y={8} width={2} height={14} fill={C.wood} stroke={C.ink} strokeWidth={0.6} />
          <circle cx={12} cy={6} r={5} fill={C.violet} opacity={0.35} />
          <circle cx={12} cy={6} r={3} fill={C.violetL} stroke={C.ink} strokeWidth={0.8} />
          <rect x={11} y={5} width={1} height={1} fill="#fff" />
        </g>
      );
    case "mounted": // a horseshoe — luck of the mount
      return (
        <g fill="none" stroke={C.gold} strokeWidth={3} strokeLinecap="round">
          <path d="M7 19 V11 a5 5 0 0 1 10 0 V19" />
          <g fill={C.gold} stroke="none">
            <rect x={5.5} y={18} width={3} height={3} rx={1} />
            <rect x={15.5} y={18} width={3} height={3} rx={1} />
          </g>
        </g>
      );
    default:
      return <circle cx={12} cy={12} r={6} fill={C.steel} stroke={C.ink} strokeWidth={1} />;
  }
}

export default function StyleSprite({ id, size = 26 }: { id: FightingStyleId; size?: number }) {
  return (
    <svg className="style-sprite" width={size} height={size} viewBox="0 0 24 24" shapeRendering="geometricPrecision" aria-hidden="true">
      {art(id)}
    </svg>
  );
}
