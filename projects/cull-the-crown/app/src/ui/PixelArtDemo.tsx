import ItemArt from "./ItemArt";

// A preview screen (reachable from the main menu) that shows what *pure pixel-art* item emblems
// would look like, side-by-side with the current vector (SVG) emblems — so the look can be judged
// before committing the whole game to hand-authored pixel grids.

const PAL: Record<string, string> = {
  K: "#1a1020", // outline
  G: "#f2c14e", // gold
  S: "#aab0c4", // steel
  s: "#6a7088", // steel shadow
  R: "#c0273f", // blood
  h: "#553820", // leather
};

// 12×12 hand-authored pixel sprites (each row exactly 12 chars; "." = transparent).
const SHIELD = [
  "....KKKK....",
  "..KKGGGGKK..",
  ".KGSSSSSSGK.",
  "KGSSSSSSSSGK",
  "KGSSSRRSSSGK",
  "KGSSSRRSSSGK",
  "KGSSSRRSSSGK",
  ".KGSSRRSSGK.",
  ".KGSSSSSSGK.",
  "..KGSSSSGK..",
  "...KGSSGK...",
  "....KGGK....",
];
const SWORD = [
  "....KSSK....",
  "....KSSK....",
  "....KSSK....",
  "....KSSK....",
  "....KSSK....",
  "..KGGGGGGK..",
  "..KGGGGGGK..",
  "....KhhK....",
  "....KhhK....",
  "....KGGK....",
  ".....KK.....",
  "............",
];
const COIN = [
  ".....KK.....",
  "....KGGK....",
  "...KGGGGK...",
  "..KGGsGGGK..",
  ".KGGGsGGGGK.",
  "KGGGGsGGGGGK",
  ".KGGGsGGGGK.",
  "..KGGsGGGK..",
  "...KGGGGK...",
  "....KGGK....",
  ".....KK.....",
  "............",
];

function PixelSprite({ grid, px = 13 }: { grid: string[]; px?: number }) {
  const w = grid[0].length;
  const h = grid.length;
  const rects: JSX.Element[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const col = PAL[grid[y][x]];
      if (col) rects.push(<rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={col} />);
    }
  }
  return (
    <svg width={w * px} height={h * px} shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }} aria-hidden="true">
      {rects}
    </svg>
  );
}

const ROWS: { label: string; grid: string[]; icon: string }[] = [
  { label: "Shield (Bloodstained)", grid: SHIELD, icon: "shield" },
  { label: "Swords (Duelist)", grid: SWORD, icon: "swords" },
  { label: "Coin (Tithe)", grid: COIN, icon: "pouch" },
];

export default function PixelArtDemo({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-label="Pixel-art preview" onClick={onClose}>
      <div className="help pixel-demo" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>Art Style — pixel-art preview</h2>
          <button type="button" className="primary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="help-body">
          <p>
            Same emblems, two ways. <b>Pure pixel art</b> (hand-placed pixels on a tiny grid,
            nearest-neighbour scaled) matches the cards/board exactly; the current <b>vector</b> emblems
            are smoother and cheaper to author.
          </p>
          <div className="pixel-compare-head">
            <span>Item</span>
            <span>Pure pixel art</span>
            <span>Current (vector)</span>
          </div>
          {ROWS.map((r) => (
            <div className="pixel-compare-row" key={r.icon}>
              <span className="pc-label">{r.label}</span>
              <div className="pc-cell">
                <PixelSprite grid={r.grid} />
              </div>
              <div className="pc-cell">
                <ItemArt icon={r.icon} size={56} />
              </div>
            </div>
          ))}
          <p className="fineprint">
            Pixel art is authored by hand, pixel by pixel — great cohesion, but slower to make and to
            restyle. Vector emblems are quick to add and recolour. Both are original (no external
            assets).
          </p>
        </div>
      </div>
    </div>
  );
}
