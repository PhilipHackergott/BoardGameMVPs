// fx/ — a small, game-agnostic "juice" toolkit for PixiJS v8 projects in this factory.
//
// Nothing here knows about Cull the Crown (or any game's rules). It's the reusable presentation
// layer: springs and easings for motion, a particle burst system, trauma screen-shake, and
// floating text pops. Drop the folder into any project's app/src/, add the layers to your stage,
// and pump update(dt) from the Pixi ticker. See knowledge/patterns/presentation-fx.md.

export * from "./easing";
export { Spring } from "./spring";
export type { SpringOpts } from "./spring";
export { Particles } from "./particles";
export type { BurstOptions } from "./particles";
export { Shake } from "./shake";
export { Pops } from "./pops";
export type { PopOptions } from "./pops";
export { PlasmaBackground } from "./plasma";
export type { PlasmaOptions, Rgb } from "./plasma";
