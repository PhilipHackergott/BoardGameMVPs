import { useTheme } from "../state/store";
import { FLOWER_SHAPES } from "./colors";

// The board collectible as an inline SVG (side menus, draft, log, flying tokens). In the
// pond theme it's a per-kind petalled blossom; in zodiac it's the planet's glyph in a soft
// watercolor disc. Colours come from the active theme.
export function FlowerGlyph({ color, size = 18 }: { color: number; size?: number }) {
  const theme = useTheme();
  const fill = theme.starCss[color];
  const c = 12;
  const r = 9;

  // Zodiac (and any glyph theme): a watercolor disc with the celestial symbol.
  if (theme.glyphs) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flower-glyph">
        <circle cx={c} cy={c} r={r + 1} fill={fill} opacity={0.16} />
        <circle cx={c} cy={c} r={r * 0.7} fill={fill} opacity={0.22} />
        <circle cx={c} cy={c} r={r + 1} fill="none" stroke={fill} strokeWidth={0.9} opacity={0.55} />
        <text
          x={c}
          y={c + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12.5}
          fontWeight={700}
          fill={fill}
        >
          {theme.glyphs[color]}
        </text>
      </svg>
    );
  }

  const { petals, style } = FLOWER_SHAPES[color];
  const petalEls = Array.from({ length: petals }, (_, i) => {
    const a = (Math.PI * 2 * i) / petals - Math.PI / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (style === "ray") {
      return (
        <line
          key={i}
          x1={c}
          y1={c}
          x2={c + ca * r * 0.95}
          y2={c + sa * r * 0.95}
          stroke={fill}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      );
    }
    if (style === "round") {
      return <circle key={i} cx={c + ca * r * 0.72} cy={c + sa * r * 0.72} r={r * 0.46} fill={fill} />;
    }
    const tip = r * 1.02;
    const base = r * 0.22;
    const half = r * 0.3;
    const px = -sa;
    const py = ca;
    const points = [
      `${c + ca * tip},${c + sa * tip}`,
      `${c + ca * base + px * half},${c + sa * base + py * half}`,
      `${c + ca * base - px * half},${c + sa * base - py * half}`,
    ].join(" ");
    return <polygon key={i} points={points} fill={fill} />;
  });

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flower-glyph">
      {petalEls}
      <circle cx={c} cy={c} r={r * 0.42} fill="#ffffff" />
    </svg>
  );
}
