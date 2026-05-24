// Workaround for a PixiJS v8.6 bug in TexturePoolClass.returnTexture:
//
//   returnTexture(renderTexture) {
//     const key = this._poolKeyHash[renderTexture.uid]; // → undefined if the uid isn't registered
//     this._texturePool[key].push(renderTexture);        // → undefined.push → throws
//   }
//
// When the pool bucket for a returned texture is missing (the uid was never registered, or the
// bucket was cleared on a renderer teardown), this throws an uncaught
// "Cannot read properties of undefined (reading 'push')". We hit it while churning many short-lived
// Text nodes (the cards) during fast play. The throw is harmless — failing to recycle one texture
// just means it's garbage-collected normally — but it's noisy and trips error assertions. Guard the
// global pool once at startup so a missing bucket is skipped instead of throwing.

import { TexturePool } from "pixi.js";

let patched = false;

export function applyPixiFixes(): void {
  if (patched) return;
  patched = true;
  const pool = TexturePool as unknown as {
    returnTexture: (tex: unknown, resetStyle?: boolean) => void;
    _texturePool: Record<number, unknown[]>;
    _poolKeyHash: Record<number, number>;
  };
  const original = pool.returnTexture.bind(TexturePool);
  pool.returnTexture = (tex: unknown, resetStyle?: boolean) => {
    try {
      original(tex, resetStyle);
    } catch {
      /* missing pool bucket (Pixi v8.6 bug) — skip recycling this texture */
    }
  };
}
