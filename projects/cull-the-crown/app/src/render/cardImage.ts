// One shared offscreen Pixi renderer that rasterises the Pixi card face (buildCardFace) to a cached
// image URL. Lets DOM modals (pack reveals, the deck-fan, the style demo) show the EXACT Pixi card
// model as an <img> — no per-card WebGL context, no DOM/Pixi duplication. Cached by signature+size.

import { Application, Container } from "pixi.js";
import { Card } from "../engine/types";
import { buildCardFace } from "./cardFace";
import { cardSignature } from "./cardNode";

let app: Application | null = null;
let ready = false;
const waiters: Array<() => void> = [];
const cache = new Map<string, string>();

void (async () => {
  const a = new Application();
  await a.init({ width: 16, height: 16, backgroundAlpha: 0, antialias: false, resolution: 1, autoDensity: false, textureGCActive: false, renderableGCActive: false });
  app = a;
  ready = true;
  waiters.splice(0).forEach((fn) => fn());
})();

/** Subscribe to "renderer ready" (fires immediately if already up). Returns an unsubscribe. */
export function onCardImageReady(fn: () => void): () => void {
  if (ready) {
    fn();
    return () => {};
  }
  waiters.push(fn);
  return () => {
    const i = waiters.indexOf(fn);
    if (i >= 0) waiters.splice(i, 1);
  };
}

/** A data-URL of the card face at width `w` (height follows 58/40). "" until the renderer is ready. */
export function cardImageURL(card: Card, w: number): string {
  if (!app || !ready) return "";
  const key = `${cardSignature(card)}|${w}|${card.seal ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const wrap = new Container();
  wrap.addChild(buildCardFace(card, w));
  const canvas = app.renderer.extract.canvas(wrap) as HTMLCanvasElement;
  const url = canvas.toDataURL();
  wrap.destroy({ children: true });
  cache.set(key, url);
  return url;
}
