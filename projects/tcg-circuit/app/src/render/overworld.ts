// Procedural placeholder drawing for the top-down ¾ overworld (Canvas2D, nearest-neighbor). Each
// routine draws into "world pixels" (1 tile = 16 units). When a real sprite/tile exists in the asset
// manifest (src set), the renderer prefers the loaded image (see drawTile/drawEntity). NONE of this is
// reference-grade art — it's a functional placeholder keyed to the manifest so the real LimeZu /
// thehorseman007 assets drop in later with no code change.

import { TILE, Entity } from "../engine/content/world";
import { imageFor } from "../assets/manifest";

const SPR_COLOR: Record<string, [string, string]> = {
  "spr.player": ["#5fb0e0", "#2e6f9e"],
  "spr.sis": ["#e08ab0", "#a8557e"],
  "spr.pip": ["#6fc45a", "#3a7e2e"],
  "spr.milo": ["#ffae4a", "#b06f1f"],
  "spr.vex": ["#e0573f", "#8a2a1f"],
  "spr.cora": ["#f0dc7a", "#a8861f"],
  "spr.classmate": ["#9aa3b2", "#5a6276"],
};

export function drawTile(ctx: CanvasRenderingContext2D, ch: string, tx: number, ty: number) {
  const x = tx * TILE, y = ty * TILE;
  const key = ch === "g" ? "tile.grass" : ch === "p" ? "tile.path" : ch === "w" ? "tile.wall" : ch === "t" ? "tile.tree" : "tile.floor";
  const img = imageFor(key);
  if (img) { ctx.drawImage(img, x, y, TILE, TILE); return; }
  switch (ch) {
    case "g":
      ctx.fillStyle = "#3a7e3a"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#327032"; ctx.fillRect(x + 2, y + 5, 2, 2); ctx.fillRect(x + 9, y + 11, 2, 2); ctx.fillRect(x + 12, y + 3, 2, 2);
      break;
    case "p":
      ctx.fillStyle = "#b89a6a"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#a88a5a"; ctx.fillRect(x + 3, y + 3, 3, 3); ctx.fillRect(x + 10, y + 8, 3, 3);
      break;
    case "w":
      ctx.fillStyle = "#4a4060"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#39314c"; ctx.fillRect(x, y + 5, TILE, 2); ctx.fillRect(x, y + 11, TILE, 2);
      ctx.fillStyle = "#5a4f78"; ctx.fillRect(x, y, TILE, 2);
      break;
    case "t":
      ctx.fillStyle = "#3a7e3a"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#5a3a1a"; ctx.fillRect(x + 6, y + 9, 4, 6);
      ctx.fillStyle = "#1f6b2a"; ctx.beginPath(); ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2e8a3a"; ctx.beginPath(); ctx.arc(x + 6, y + 5, 3, 0, Math.PI * 2); ctx.fill();
      break;
    default: // floor
      ctx.fillStyle = (tx + ty) % 2 === 0 ? "#332a4e" : "#2c2444"; ctx.fillRect(x, y, TILE, TILE);
  }
}

function drawHumanoid(ctx: CanvasRenderingContext2D, x: number, y: number, key: string, dir: string, step: number) {
  const [body, dark] = SPR_COLOR[key] ?? ["#cccccc", "#888888"];
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 22, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  // legs (2-frame bob)
  ctx.fillStyle = dark;
  const sw = step ? 1 : -1;
  ctx.fillRect(x + 4 + (sw > 0 ? 1 : 0), y + 17, 3, 5);
  ctx.fillRect(x + 9 - (sw > 0 ? 1 : 0), y + 17, 3, 5);
  // body
  ctx.fillStyle = body; ctx.fillRect(x + 3, y + 9, 10, 9);
  ctx.fillStyle = dark; ctx.fillRect(x + 3, y + 9, 10, 2);
  // head
  ctx.fillStyle = "#f0cba0"; ctx.fillRect(x + 4, y + 2, 8, 7);
  ctx.fillStyle = dark; ctx.fillRect(x + 3, y, 10, 3); // hair
  // eyes by facing
  ctx.fillStyle = "#1a1020";
  if (dir === "down") { ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 9, y + 5, 2, 2); }
  else if (dir === "up") { /* back of head */ }
  else if (dir === "left") { ctx.fillRect(x + 4, y + 5, 2, 2); }
  else { ctx.fillRect(x + 10, y + 5, 2, 2); }
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity) {
  const x = e.x * TILE, y = e.y * TILE;
  const img = imageFor(e.sprite);
  if (img) { ctx.drawImage(img, x, y - (e.kind === "npc" ? TILE / 2 : 0), TILE, e.kind === "npc" ? TILE + TILE / 2 : TILE); return; }
  switch (e.sprite) {
    case "obj.door":
      ctx.fillStyle = "#241a14"; ctx.fillRect(x + 2, y + 1, 12, 15);
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x + 3, y + 2, 10, 14);
      ctx.fillStyle = "#f4c430"; ctx.fillRect(x + 10, y + 8, 2, 2);
      break;
    case "obj.building":
      ctx.fillStyle = "#7a1f12"; ctx.fillRect(x, y - 4, TILE, TILE + 4);
      ctx.fillStyle = "#b6391f"; ctx.fillRect(x, y - 4, TILE, 4);
      ctx.fillStyle = "#5a1810"; ctx.fillRect(x + 2, y + 4, TILE - 4, 2);
      break;
    case "obj.bed":
      ctx.fillStyle = "#3a2a5a"; ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = "#cfe6ff"; ctx.fillRect(x + 2, y + 2, 12, 5);
      ctx.fillStyle = "#6fb8e0"; ctx.fillRect(x + 2, y + 8, 12, 6);
      break;
    case "obj.desk":
      ctx.fillStyle = "#5a3a1a"; ctx.fillRect(x + 1, y + 4, 14, 11);
      ctx.fillStyle = "#7a5226"; ctx.fillRect(x + 1, y + 4, 14, 3);
      ctx.fillStyle = "#f4c430"; ctx.fillRect(x + 3, y + 9, 4, 3); // a card on the desk
      break;
    case "obj.counter":
      ctx.fillStyle = "#4a3520"; ctx.fillRect(x, y + 6, TILE, 10);
      ctx.fillStyle = "#6a4f30"; ctx.fillRect(x, y + 6, TILE, 2);
      break;
    case "obj.table":
      ctx.fillStyle = "#2a4a5a"; ctx.fillRect(x + 1, y + 5, 14, 10);
      ctx.fillStyle = "#3a6a7a"; ctx.fillRect(x + 1, y + 5, 14, 2);
      ctx.fillStyle = "#f4e9cf"; ctx.fillRect(x + 4, y + 8, 3, 4); ctx.fillRect(x + 9, y + 8, 3, 4);
      break;
    case "obj.shelf":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x, y, TILE, TILE);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#e0573f", "#6fb8e0", "#6fc45a"][i]; ctx.fillRect(x + 2 + i * 4, y + 2, 3, 5); ctx.fillRect(x + 2 + i * 4, y + 9, 3, 5); }
      break;
    case "obj.board":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#d8c8a0"; ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = "#c0273f"; ctx.fillRect(x + 3, y + 3, 10, 2);
      ctx.fillStyle = "#14102a"; ctx.fillRect(x + 4, y + 7, 8, 1); ctx.fillRect(x + 4, y + 10, 6, 1);
      break;
    case "obj.pc":
      ctx.fillStyle = "#2a2150"; ctx.fillRect(x + 2, y + 2, 12, 9); // monitor
      ctx.fillStyle = "#6fb8e0"; ctx.fillRect(x + 3, y + 3, 10, 7); // screen
      ctx.fillStyle = "#cfeaf8"; ctx.fillRect(x + 4, y + 4, 4, 1); ctx.fillRect(x + 4, y + 6, 7, 1); ctx.fillRect(x + 4, y + 8, 5, 1);
      ctx.fillStyle = "#1f1838"; ctx.fillRect(x + 6, y + 11, 4, 2); ctx.fillRect(x + 4, y + 13, 8, 2); // stand
      break;
    case "obj.booster":
      ctx.fillStyle = "#5a1810"; ctx.fillRect(x + 1, y + 4, 14, 11); // box
      ctx.fillStyle = "#ffae4a"; ctx.fillRect(x + 2, y + 1, 4, 7); // packs
      ctx.fillStyle = "#6fb8e0"; ctx.fillRect(x + 6, y, 4, 8);
      ctx.fillStyle = "#9a7cc0"; ctx.fillRect(x + 10, y + 1, 4, 7);
      ctx.fillStyle = "#fff3c4"; ctx.fillRect(x + 3, y + 2, 2, 2); ctx.fillRect(x + 7, y + 1, 2, 2); ctx.fillRect(x + 11, y + 2, 2, 2);
      break;
    default:
      drawHumanoid(ctx, x, y, e.sprite, "down", 0);
  }
}

export { drawHumanoid };
