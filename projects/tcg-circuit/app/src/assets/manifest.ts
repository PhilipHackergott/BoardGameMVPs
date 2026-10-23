// ASSET-MANIFEST SEAM (pattern from magical-athlete). Every world visual is referenced by key. While
// `src` is null the renderer draws a PROCEDURAL pixel placeholder; set `src` to a file (drop it in
// public/art/) and the renderer loads + uses it instead — NO renderer/engine change. This is how the
// real LimeZu / thehorseman007 tileset + character sprites get integrated later.
//
// >>> TO ADD REAL ART: set `src` (e.g. "art/tiles/grass.png"), match `w`/`h`, ship the file in
//     app/public/art/. Tiles are 16×16; character sprites 16×24 (4-dir sheets welcome — see note).

export interface AssetDef {
  key: string;
  src: string | null; // null => procedural placeholder
  w: number;
  h: number;
  note: string;
}

function a(key: string, w: number, h: number, note: string): AssetDef {
  return { key, src: null, w, h, note };
}

export const MANIFEST: Record<string, AssetDef> = {
  // ── tiles (16×16) ──
  "tile.grass": a("tile.grass", 16, 16, "outdoor ground"),
  "tile.path": a("tile.path", 16, 16, "dirt/stone path"),
  "tile.floor": a("tile.floor", 16, 16, "interior floor"),
  "tile.wall": a("tile.wall", 16, 16, "interior/exterior wall (solid)"),
  "tile.tree": a("tile.tree", 16, 16, "tree (solid)"),
  // ── characters (16×24, facing down by default; ideally a 4-dir × 2-frame walk sheet) ──
  "spr.player": a("spr.player", 16, 24, "the player avatar"),
  "spr.sis": a("spr.sis", 16, 24, "older sister at home"),
  "spr.pip": a("spr.pip", 16, 24, "Pip, the shop owner"),
  "spr.milo": a("spr.milo", 16, 24, "Milo, friendly first opponent"),
  "spr.vex": a("spr.vex", 16, 24, "Vex, the school rival"),
  "spr.cora": a("spr.cora", 16, 24, "Cora, the shop ace"),
  "spr.classmate": a("spr.classmate", 16, 24, "generic townsperson/classmate"),
  // ── objects / furniture (16×16 unless noted; solid handled in world.ts) ──
  "obj.door": a("obj.door", 16, 16, "doorway marker / interaction"),
  "obj.building": a("obj.building", 16, 16, "building front/roof block"),
  "obj.bed": a("obj.bed", 16, 16, "bed (sleep/save)"),
  "obj.desk": a("obj.desk", 16, 16, "desk (deck management)"),
  "obj.counter": a("obj.counter", 16, 16, "shop counter"),
  "obj.table": a("obj.table", 16, 16, "play table / school desk"),
  "obj.shelf": a("obj.shelf", 16, 16, "card shelf / booster wall"),
  "obj.board": a("obj.board", 16, 16, "events board"),
  "obj.pc": a("obj.pc", 16, 16, "home PC (online singles market)"),
  "obj.booster": a("obj.booster", 16, 16, "booster-pack stand at the shop"),
};

// A simple loaded-image cache. Until real srcs are set this stays empty and the renderer goes
// procedural. When srcs are added, call preloadAssets() once at boot.
const images = new Map<string, HTMLImageElement>();

export function imageFor(key: string): HTMLImageElement | null {
  return images.get(key) ?? null;
}

export function preloadAssets(): Promise<void> {
  const toLoad = Object.values(MANIFEST).filter((d) => d.src);
  return Promise.all(
    toLoad.map(
      (d) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => { images.set(d.key, img); resolve(); };
          img.onerror = () => resolve();
          img.src = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL + d.src;
        }),
    ),
  ).then(() => undefined);
}
