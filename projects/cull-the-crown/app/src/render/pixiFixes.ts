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

import { Application, TexturePool } from "pixi.js";

let patched = false;

// Tear down a Pixi Application AND release its WebGL context immediately. Browsers cap live WebGL
// contexts (~16); the felt + sidebar + every full-window modal each hold one, so opening/closing
// modals across a long session (or a test run) leaks contexts until the oldest are force-lost and
// the felt's render breaks. app.destroy() alone doesn't free the GL context promptly — explicitly
// lose it so the count never creeps up.
export function releaseApp(app: Application): void {
  const gl = (app.renderer as unknown as { gl?: WebGLRenderingContext } | undefined)?.gl;
  try {
    app.destroy(true, { children: true });
  } catch {
    /* already destroyed */
  }
  try {
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  } catch {
    /* no extension / context already gone */
  }
}

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
