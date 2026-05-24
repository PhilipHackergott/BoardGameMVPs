# Assets

All art is referenced through `manifest.ts`. Until official CMYK files are in hand, every `src` is
`null` and the render layer draws procedural placeholders (coloured standees with initials).

## Slotting in official CMYK art (no code changes beyond the manifest)

1. Obtain the official asset files from CMYK (the licensor) — character illustrations, board art
   (Mild + Wild), chips, logo. Do **not** rip images from the rulebook PDF or pull them off the web;
   use the licensor's supplied files at proper resolution.
2. Drop them under `public/art/` (e.g. `public/art/racers/banana.png`, `public/art/board/wild.png`).
3. Set the matching `src` in `manifest.ts` (e.g. `racers.banana.src = '/art/racers/banana.png'`).

The 2.5D render uses the character illustrations directly as standee sprites, so this is the most
faithful path to the original look. Placeholder entries remain valid fallbacks for any missing file.

## The board image (official-board backdrop)

`manifest.board[side]` takes `{ src, spaces }`:
- **`src`** — the official board image (e.g. `'/art/board/mild.png'`). When set, the renderer draws it as
  the backdrop (fit to the 900×560 canvas) and the 2.5D character standees are drawn on top of it. When
  `null`, the procedural oval track is drawn instead.
- **`spaces`** — the pixel `{x, y}` of each track space (index 0 = Start), measured on the **900×560
  canvas** the board image is fit into. This is what positions the standees on the real track, so it's
  required alongside `src` (without it the standees fall back to the oval and won't line up). The space
  count must match `TRACK_LENGTH[side]` in `src/engine/config.ts` (also `CONFIRM`).

So to make it look like the official board: drop `mild.png`/`wild.png` into `public/art/board/`, set the
two `src`s, and fill `spaces` with the track-space coordinates (these can be read off the board image).
