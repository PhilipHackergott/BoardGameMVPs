import { useId } from "react";
import { SigilId } from "../engine/types";

// A wax-seal stamp: a glossy, domed blob of coloured wax with an irregular molten edge, a recessed
// stamped rim, a specular highlight, and the sigil's emblem embossed into the centre. Rendered as SVG
// (the organic lobed outline can't be done with a CSS circle) and tinted per sigil. Used as the on-card
// sigil badge in <CardFace>.

// One organic wax-blob outline, generated once: a near-circle whose radius wobbles with a couple of
// sine terms, smoothed through its sample points with a closed Catmull-Rom → cubic-bézier conversion.
const SEAL_PATH = (() => {
  const cx = 20;
  const cy = 20;
  const N = 40;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 15.2 + 1.4 * Math.sin(8 * a + 0.4) + 0.7 * Math.sin(3 * a + 1.7);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const f = (n: number) => n.toFixed(2);
  const d = [`M ${f(pts[0][0])} ${f(pts[0][1])}`];
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`);
  }
  d.push("Z");
  return d.join(" ");
})();

// Per-sigil wax palette: a highlight, the body mid-tone, and the dark edge/recess.
const SEAL: Record<SigilId, { hi: string; base: string; lo: string }> = {
  keen: { hi: "#ffd97a", base: "#c8902a", lo: "#6f4d10" },
  warded: { hi: "#c79bf0", base: "#7a4fb0", lo: "#3f2768" },
  gilded: { hi: "#ffe9a0", base: "#b88a1e", lo: "#6a4c0e" },
  runed: { hi: "#8fd0f5", base: "#2f78b8", lo: "#174566" },
  honed: { hi: "#9fe6a8", base: "#3f9a4a", lo: "#225628" },
  companion: { hi: "#9fe6a8", base: "#3f9a4a", lo: "#225628" },
  extra: { hi: "#f08a9c", base: "#b53048", lo: "#681524" },
  wildcard: { hi: "#ffe9a0", base: "#b08a2a", lo: "#665016" },
  steel: { hi: "#dfe6ee", base: "#8a93a0", lo: "#4a505c" },
  glass: { hi: "#dff4ff", base: "#7fb8d8", lo: "#3f6a86" },
  minted: { hi: "#ffe9a0", base: "#caa12e", lo: "#6f5410" },
  charmed: { hi: "#aef0b6", base: "#4faf5c", lo: "#266030" },
  stoneskin: { hi: "#cdd2da", base: "#7a8088", lo: "#3e434a" },
};

export default function WaxSeal({ sigil, glyph, size = 26 }: { sigil: SigilId; glyph: string; size?: number }) {
  const c = SEAL[sigil] ?? SEAL.keen;
  const uid = "wax" + useId().replace(/:/g, ""); // useId() contains colons that break url(#…) refs
  return (
    <svg className="wax-seal" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-b`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c.hi} />
          <stop offset="46%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.lo} />
        </radialGradient>
      </defs>
      {/* molten wax body */}
      <path d={SEAL_PATH} fill={`url(#${uid}-b)`} stroke={c.lo} strokeWidth={0.8} />
      {/* recessed stamped rim: a dark inner ring with a thin bright bevel just outside it */}
      <circle cx={20} cy={20} r={12.6} fill="none" stroke={c.hi} strokeOpacity={0.4} strokeWidth={0.8} />
      <circle cx={20} cy={20} r={11.8} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth={1.6} />
      {/* specular highlight */}
      <ellipse cx={14.5} cy={12.5} rx={6} ry={4} fill="#ffffff" opacity={0.18} transform="rotate(-28 14.5 12.5)" />
      {/* emblem embossed into the centre — cream fill with a dark halo so it reads on any wax colour */}
      <text
        x={20}
        y={20.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={16}
        fontWeight="bold"
        fontFamily='"Segoe UI Symbol", system-ui, sans-serif'
        fill="#fff4dc"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={1.5}
        style={{ paintOrder: "stroke" }}
      >
        {glyph}
      </text>
    </svg>
  );
}
