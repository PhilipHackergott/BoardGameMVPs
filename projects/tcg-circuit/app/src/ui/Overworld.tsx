// The walkable overworld. Owns the player's pixel position + the render loop; reads location from the
// store and reports the nearby interactable + interactions back. Movement freezes while a dialogue or
// overlay is open (the pause-that-freezes also covers the world). Procedural placeholder art.

import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { WORLD, SOLID_TILES, TILE, Entity } from "../engine/content/world";
import { drawTile, drawEntity, drawHumanoid } from "../render/overworld";

const ZOOM = 3;
const SPEED = 64; // world px / sec
const DIRV: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function Overworld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locId = useStore((s) => s.career?.location ?? "town");
  const entrance = useStore((s) => s.worldEntrance);

  const pos = useRef({ x: 0, y: 0 });
  const dir = useRef<"up" | "down" | "left" | "right">("down");
  const keys = useRef(new Set<string>());

  // (re)spawn at the entrance whenever the location/entrance changes
  useEffect(() => {
    const loc = WORLD[locId];
    const e = loc.entrances[entrance] ?? loc.entrances.start ?? Object.values(loc.entrances)[0] ?? { x: 1, y: 1, dir: "down" };
    pos.current = { x: e.x * TILE, y: e.y * TILE - 6 };
    dir.current = e.dir as never;
  }, [locId, entrance]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let animT = 0;
    let lastNearId: string | null = null;

    function solidAt(loc: (typeof WORLD)[keyof typeof WORLD], tx: number, ty: number): boolean {
      if (ty < 0 || ty >= loc.tiles.length || tx < 0 || tx >= loc.tiles[0].length) return true;
      if (SOLID_TILES.has(loc.tiles[ty][tx])) return true;
      return loc.entities.some((e) => e.solid && e.x === tx && e.y === ty);
    }
    function feetCanBe(loc: (typeof WORLD)[keyof typeof WORLD], px: number, py: number): boolean {
      const bx = px + 2, by = py + 12, bw = 12, bh = 10;
      const corners = [[bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1]];
      return corners.every(([cx, cy]) => !solidAt(loc, Math.floor(cx / TILE), Math.floor(cy / TILE)));
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const st = useStore.getState();
      const frozen = !!st.dialogue || !!st.overlay || st.view !== "world";
      if ((k === " " || k === "enter" || k === "e") && !frozen) {
        e.preventDefault();
        if (st.nearEntity) st.worldInteract(st.nearEntity.id);
        return;
      }
      if (["arrowup", "w", "arrowdown", "s", "arrowleft", "a", "arrowright", "d"].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const resize = () => {
      const r = canvas.parentElement!.getBoundingClientRect();
      canvas.width = Math.floor(r.width);
      canvas.height = Math.floor(r.height);
    };
    resize();
    window.addEventListener("resize", resize);

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = useStore.getState();
      const loc = WORLD[st.career?.location ?? "town"];
      const frozen = !!st.dialogue || !!st.overlay || st.view !== "world";

      let moving = false;
      if (!frozen) {
        let vx = 0, vy = 0;
        const K = keys.current;
        if (K.has("arrowup") || K.has("w")) { vy -= 1; dir.current = "up"; }
        else if (K.has("arrowdown") || K.has("s")) { vy += 1; dir.current = "down"; }
        if (K.has("arrowleft") || K.has("a")) { vx -= 1; dir.current = "left"; }
        else if (K.has("arrowright") || K.has("d")) { vx += 1; dir.current = "right"; }
        if (vx || vy) {
          moving = true;
          const len = Math.hypot(vx, vy) || 1;
          const nx = pos.current.x + (vx / len) * SPEED * dt;
          const ny = pos.current.y + (vy / len) * SPEED * dt;
          if (feetCanBe(loc, nx, pos.current.y)) pos.current.x = nx;
          if (feetCanBe(loc, pos.current.x, ny)) pos.current.y = ny;
        }
      }
      animT += dt * (moving ? 1 : 0);

      // nearest interactable: the tile the player stands on or faces
      const ptx = Math.floor((pos.current.x + 8) / TILE);
      const pty = Math.floor((pos.current.y + 14) / TILE);
      const [dx, dy] = DIRV[dir.current];
      const near = findEntity(loc.entities, ptx, pty, ptx + dx, pty + dy);
      if ((near?.id ?? null) !== lastNearId) {
        lastNearId = near?.id ?? null;
        st.setNear(near ? { id: near.id, label: labelFor(near) } : null);
      }

      // camera
      const cw = canvas.width / ZOOM, chh = canvas.height / ZOOM;
      const mapW = loc.tiles[0].length * TILE, mapH = loc.tiles.length * TILE;
      let camX = pos.current.x + 8 - cw / 2;
      let camY = pos.current.y + 12 - chh / 2;
      camX = mapW < cw ? (mapW - cw) / 2 : Math.max(0, Math.min(camX, mapW - cw));
      camY = mapH < chh ? (mapH - chh) / 2 : Math.max(0, Math.min(camY, mapH - chh));

      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0d0a1c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ZOOM, 0, 0, ZOOM, Math.round(-camX * ZOOM), Math.round(-camY * ZOOM));

      // tiles
      for (let ty = 0; ty < loc.tiles.length; ty++)
        for (let tx = 0; tx < loc.tiles[ty].length; tx++) drawTile(ctx, loc.tiles[ty][tx], tx, ty);

      // entities + player, sorted by y (¾ depth)
      const drawables: { y: number; draw: () => void }[] = loc.entities.map((e) => ({ y: e.y * TILE, draw: () => drawEntity(ctx, e) }));
      drawables.push({ y: pos.current.y, draw: () => drawHumanoid(ctx, Math.round(pos.current.x), Math.round(pos.current.y), "spr.player", dir.current, Math.floor(animT * 6) % 2) });
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.draw();

      // highlight the interactable in front
      if (near) {
        ctx.strokeStyle = "#f4c430";
        ctx.lineWidth = 1;
        ctx.strokeRect(near.x * TILE + 0.5, near.y * TILE - (near.kind === "npc" ? 7.5 : 0.5), TILE - 1, near.kind === "npc" ? TILE + 7 : TILE - 1);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="overworld-canvas" />;
}

function findEntity(entities: Entity[], tx: number, ty: number, fx: number, fy: number): Entity | null {
  const interact = entities.filter((e) => e.kind !== "decor");
  return (
    interact.find((e) => e.x === fx && e.y === fy) ?? interact.find((e) => e.x === tx && e.y === ty) ?? null
  );
}
function labelFor(e: Entity): string {
  if (e.kind === "door") return `Enter ${e.name ?? "door"}`;
  if (e.kind === "npc") return `Talk to ${e.name ?? "someone"}`;
  return e.name ?? "Examine";
}
