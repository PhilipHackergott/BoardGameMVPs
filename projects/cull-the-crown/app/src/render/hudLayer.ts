// The guild/pouch HUD band, rendered ON the felt canvas (the last "game chrome → Pixi" piece). Draws
// the player's jokers (left) and the consumable pouch (right) as pixel-art sprite tiles along the top
// of the felt, in the felt's own logical space — so it lines up perfectly and shares the single canvas.
//
// It attaches its OWN pointer listeners to the shared app.stage rather than editing CombatStage's
// drag/animation handlers: the top band holds no draggable cards, so a tap there starts no drag and
// the two handler sets never conflict. Interactions route out as intents (sell a joker in the shop,
// use a held tarot); hover bridges to the DOM tooltip via screen coords (mirrors the shop tray).

import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { PIXEL_FONT, THEME } from "./theme";
import { STYLE_ART_SLUG } from "./sidebarStage";
import { FightingStyleId } from "../engine/types";
import { EDITION_INFO } from "../engine/index";

export interface HudJokerVM {
  id: string;
  artId: string; // /art/jokers/<artId>.svg
  name: string;
  text: string;
  rarity?: string;
  edition?: string;
  sellValue: number;
  sellable: boolean; // true in the shop — click to sell
}
export interface HudHeldVM {
  id: string; // instanceId
  tarotId: string;
  name: string;
  text: string;
  usable: boolean; // false in shop without a pack open — pouch is view-only there
}
export interface HudTip {
  name: string;
  text: string;
  type: string;
  rarity?: string;
}
export interface HudVM {
  jokers: HudJokerVM[];
  jokerMax: number;
  showPouch: boolean;
  held: HudHeldVM[];
  heldMax: number;
}

interface HudHit {
  x: number;
  y: number;
  w: number;
  h: number;
  tip: HudTip;
  onTap?: () => void;
}

const TILE_W = 40; // match the felt hand-card footprint (CARD_W/CARD_H) so jokers read at the same size
const TILE_H = 56;
const GAP = 7;
const TOP_Y = 8;
const EDGE = 14;

const ED_COLOR: Record<string, number> = { foil: 0x6fc0e0, holographic: 0xb070e0, polychrome: 0xe0506a, negative: 0x888888 };

export class HudLayer {
  readonly view = new Container();
  onSellJoker?: (id: string) => void;
  onUseHeld?: (instanceId: string, tarotId: string) => void;
  onHover?: (tip: HudTip | null, rect: { left: number; right: number; top: number; height: number } | null) => void;

  private app: Application;
  private stageW: number;
  private stageH: number;
  private hits: HudHit[] = [];
  private hoverIdx = -1;
  private sig = "";
  private texCache = new Map<string, Texture | null>(); // url -> texture (null = load failed)
  private gen = 0; // bumped each rebuild so stale async loads are ignored
  private destroyed = false;
  private jokerCount = 0; // tracked so pulseJokers() knows how many tiles to flash
  // expanding gold rings on each joker tile when a play resolves — "your jokers contributed"
  private pulses: { x: number; y: number; age: number; dur: number; g: Graphics }[] = [];
  private pulseTick = (t: { deltaMS: number }) => this.updatePulses(t.deltaMS / 1000);

  constructor(app: Application, stageW: number, stageH: number) {
    this.app = app;
    this.stageW = stageW;
    this.stageH = stageH;
    app.stage.on("pointerdown", this.onDown);
    app.stage.on("globalpointermove", this.onMove);
    app.ticker.add(this.pulseTick);
  }

  private onDown = (e: { global: { x: number; y: number } }) => {
    const h = this.hitAt(e.global.x, e.global.y);
    if (h?.onTap) h.onTap();
  };
  private onMove = (e: { global: { x: number; y: number } }) => {
    const i = this.hits.findIndex((h) => this.inside(h, e.global.x, e.global.y));
    if (i === this.hoverIdx) return;
    this.hoverIdx = i;
    if (i >= 0) {
      const h = this.hits[i];
      // report the tile's screen rect so the tooltip spawns beside it (not over the band)
      const tl = this.toScreen(h.x, h.y);
      const br = this.toScreen(h.x + h.w, h.y + h.h);
      this.onHover?.(h.tip, { left: tl.x, right: br.x, top: tl.y, height: br.y - tl.y });
    } else {
      this.onHover?.(null, null);
    }
  };

  private inside(h: HudHit, x: number, y: number): boolean {
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  }
  private hitAt(x: number, y: number): HudHit | undefined {
    return this.hits.find((h) => this.inside(h, x, y));
  }

  // logical (felt) coords -> screen pixels, honouring the felt canvas's object-fit: contain letterbox.
  private toScreen(lx: number, ly: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / this.stageW, rect.height / this.stageH);
    const offX = rect.left + (rect.width - this.stageW * scale) / 2;
    const offY = rect.top + (rect.height - this.stageH * scale) / 2;
    return { x: offX + lx * scale, y: offY + ly * scale };
  }

  syncHud(vm: HudVM): void {
    const sig = JSON.stringify([
      vm.jokers.map((j) => `${j.id}:${j.edition ?? ""}:${j.sellable ? 1 : 0}:${j.sellValue}`),
      vm.jokerMax,
      vm.showPouch,
      vm.held.map((h) => h.id),
      vm.heldMax,
    ]);
    if (sig === this.sig) return; // nothing the HUD shows has changed — skip the rebuild
    this.sig = sig;
    this.rebuild(vm);
  }

  private rebuild(vm: HudVM): void {
    this.view.removeChildren();
    this.hits = [];
    this.hoverIdx = -1;
    const gen = ++this.gen;
    const need: { sprite: Sprite; urls: string[] }[] = [];

    // dark backdrop band behind the row — mirrors the player-hand panel on the felt
    const band = new Graphics();
    band.roundRect(8, 2, this.stageW - 16, TOP_Y + TILE_H + 14, 8).fill({ color: THEME.ink, alpha: 0.42 });
    this.view.addChild(band);

    this.jokerCount = vm.jokers.length;
    // --- jokers, left ---
    vm.jokers.forEach((j, i) => {
      const x = EDGE + i * (TILE_W + GAP);
      const ed = j.edition && (j.edition in EDITION_INFO) ? EDITION_INFO[j.edition as keyof typeof EDITION_INFO] : null;
      const tip: HudTip = {
        name: ed ? `${j.name} (${ed.name})` : j.name,
        // Every enhancement gets its own explanation block so the tooltip explains both the joker
        // and any edition (prismatic/burnished/haloed/shadow) layered onto it.
        text: [j.text, ed ? `${ed.name} — ${ed.text}` : "", j.sellable ? `Click to sell ◆${j.sellValue}` : ""].filter(Boolean).join("\n\n"),
        type: "joker",
        rarity: j.rarity,
      };
      const sprite = this.tile(x, TOP_Y, j.name, j.edition, THEME.gold);
      need.push({ sprite, urls: [`/art/jokers/${j.artId}.svg`] });
      this.hits.push({ x, y: TOP_Y, w: TILE_W, h: TILE_H, tip, onTap: j.sellable ? () => this.onSellJoker?.(j.id) : undefined });
    });
    this.count(EDGE, TOP_Y + TILE_H + 3, `${vm.jokers.length}/${vm.jokerMax}`, 0);

    // --- pouch, right (only when shown) ---
    if (vm.showPouch) {
      vm.held.forEach((hh, i) => {
        const x = this.stageW - EDGE - TILE_W - i * (TILE_W + GAP);
        const tipNote = hh.usable ? "" : "\n\n(Held — usable only in combat, on a card in your hand.)";
        const tip: HudTip = { name: hh.name, text: hh.text + tipNote, type: "tarot" };
        // Dim non-usable tiles (in the shop with no pack open the pouch is view-only); the player
        // can still hover for the tooltip but tapping does nothing.
        const sprite = this.tile(x, TOP_Y, hh.name, undefined, hh.usable ? THEME.violet : THEME.frameDim);
        if (!hh.usable) sprite.alpha = 0.55;
        const drillSlug = hh.tarotId.startsWith("drill-") ? STYLE_ART_SLUG[hh.tarotId.slice(6) as FightingStyleId] : undefined;
        const urls = [`/art/tarots/${hh.tarotId}.svg`, `/art/spectrals/${hh.tarotId}.svg`];
        if (drillSlug) urls.push(`/art/styles/${drillSlug}.svg`);
        need.push({ sprite, urls });
        this.hits.push({ x, y: TOP_Y, w: TILE_W, h: TILE_H, tip, onTap: hh.usable ? () => this.onUseHeld?.(hh.id, hh.tarotId) : undefined });
      });
      this.count(this.stageW - EDGE, TOP_Y + TILE_H + 3, `${vm.held.length}/${vm.heldMax}`, 1);
    }

    // load art (cached) and drop it onto the tiles
    for (const { sprite, urls } of need) void this.loadArt(sprite, urls, gen);
  }

  // a framed tile with a fallback initial; the art sprite is added on top once it loads.
  private tile(x: number, y: number, name: string, edition: string | undefined, accent: number): Sprite {
    const g = new Graphics();
    g.roundRect(x - 1, y - 1, TILE_W + 2, TILE_H + 2, 5).fill(THEME.ink);
    g.roundRect(x, y, TILE_W, TILE_H, 4).fill(0x1a1024).stroke({ width: 1.5, color: accent });
    this.view.addChild(g);
    const initial = new Text({ text: (name[0] ?? "?").toUpperCase(), style: { fill: accent, fontSize: 18, fontFamily: PIXEL_FONT, fontWeight: "700" } });
    initial.anchor.set(0.5);
    initial.position.set(x + TILE_W / 2, y + TILE_H / 2);
    this.view.addChild(initial);
    if (edition) {
      const dot = new Graphics();
      dot.circle(x + TILE_W - 5, y + 5, 4).fill(ED_COLOR[edition] ?? THEME.goldBright).stroke({ width: 1, color: THEME.ink });
      this.view.addChild(dot);
    }
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.position.set(x + TILE_W / 2, y + TILE_H / 2);
    sprite.visible = false;
    this.view.addChild(sprite);
    return sprite;
  }

  private count(x: number, y: number, label: string, anchor: number): void {
    const t = new Text({ text: label, style: { fill: 0xffffff, fontSize: 8, fontFamily: PIXEL_FONT, letterSpacing: 0.5 } });
    t.anchor.set(anchor, 0);
    t.position.set(x, y);
    this.view.addChild(t);
  }

  // try each url in order until one loads; nearest-filter + fit to the tile. Cached across syncs.
  private async loadArt(sprite: Sprite, urls: string[], gen: number): Promise<void> {
    for (const url of urls) {
      const cached = this.texCache.get(url);
      if (cached === null) continue; // known-bad
      let tex = cached ?? null;
      if (!tex) {
        try {
          tex = (await Assets.load(url)) as Texture;
          this.texCache.set(url, tex);
        } catch {
          this.texCache.set(url, null);
          continue;
        }
      }
      if (this.destroyed || gen !== this.gen || sprite.destroyed) return;
      if (tex.source) tex.source.scaleMode = "nearest";
      sprite.texture = tex;
      // fit inside the tile, preserving the art's aspect
      const s = Math.min((TILE_W - 4) / tex.width, (TILE_H - 4) / tex.height);
      sprite.scale.set(s);
      sprite.roundPixels = true;
      sprite.visible = true;
      return;
    }
  }

  /** Pulse a brief gold ring on every joker tile — "your jokers contributed to that play". Fired by
   *  CombatStage.handleEvent on "play" so the HUD reads as active rather than decorative. */
  pulseJokers(): void {
    for (let i = 0; i < this.jokerCount; i++) {
      const cx = EDGE + i * (TILE_W + GAP) + TILE_W / 2;
      const cy = TOP_Y + TILE_H / 2;
      const g = new Graphics();
      this.view.addChild(g);
      this.pulses.push({ x: cx, y: cy, age: 0, dur: 0.55, g });
    }
  }

  private updatePulses(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.age += dt;
      const t = p.age / p.dur;
      if (t >= 1) {
        p.g.parent?.removeChild(p.g);
        p.g.destroy();
        this.pulses.splice(i, 1);
        continue;
      }
      const r = TILE_W * 0.55 + t * 10; // ring expands outward
      const a = (1 - t) * 0.85; // fade out
      p.g.clear();
      p.g.roundRect(p.x - r, p.y - r * 1.2, r * 2, r * 2.4, 6).stroke({ width: 2.5, color: THEME.goldBright, alpha: a });
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.app.ticker.remove(this.pulseTick);
    for (const p of this.pulses) {
      p.g.parent?.removeChild(p.g);
      p.g.destroy();
    }
    this.pulses = [];
    this.app.stage.off("pointerdown", this.onDown);
    this.app.stage.off("globalpointermove", this.onMove);
    this.view.destroy({ children: true });
  }
}
