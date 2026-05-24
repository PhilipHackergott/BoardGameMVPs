// Asset manifest — the seam for slotting in official CMYK art later.
//
// Every visual asset is referenced by key here. While `src` is null the render layer draws a
// procedural placeholder (a coloured standee with a short label); once CMYK's official files are
// dropped into `public/art/...`, set the matching `src` and the real art appears with no other code
// changes. (Do NOT rip art from the rulebook PDF or the web — use the licensor's official files.)

import { RACERS } from '../engine';
import type { RacerId, Side } from '../engine';

export interface RacerArt {
  /** e.g. '/art/racers/banana.png' once available; null = procedural placeholder standee. */
  src: string | null;
  /** Placeholder standee/background colour — drawn from the board palette for visual cohesion. */
  tint: number;
  /** Short label (initials) — fallback identity. */
  label: string;
  /** A distinct, recognizable derpy character glyph used on the card art + board piece. */
  glyph: string;
}

export interface BoardArt {
  /** Path to the official board image (e.g. '/art/board/mild.png'); null = procedural placeholder track. */
  src: string | null;
  /** Pixel position of each track space (index 0 = Start) on the 900×560 canvas, measured from the
   *  official board image. Required for standees to sit on the real track; omit to use the oval fallback. */
  spaces?: { x: number; y: number }[];
}

export interface AssetManifest {
  racers: Record<RacerId, RacerArt>;
  board: Record<Side, BoardArt>;
  chips: { gold: string | null; silver: string | null; bronze: string | null };
  logo: string | null;
}

// The board's own tile palette — racer backgrounds are drawn from it for visual cohesion.
const BOARD_PALETTE = [
  0xe23b3b, 0xf2922b, 0xf2d23b, 0x57c34a, 0x1fb6a6, 0x3a7bd5, 0x8a5cf6, 0xe255b0, 0xc9a3f0, 0xff8fb2,
];

function placeholderTint(i: number): number {
  return BOARD_PALETTE[i % BOARD_PALETTE.length];
}

function initials(name: string): string {
  const words = name.split(/[^A-Za-z]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Distinct, recognizable derpy character glyphs — one per racer (original mapping; standard Unicode,
// IP-safe). Used as the card art and the board piece until bespoke art lands.
const RACER_GLYPH: Record<string, string> = {
  alchemist: '⚗️', 'baba-yaga': '🧹', banana: '🍌', blimp: '🎈', centaur: '🐴', cheerleader: '📣',
  coach: '🧑‍🏫', copycat: '😼', dicemonger: '🎲', duelist: '⚔️', egg: '🥚', genius: '🧠', gunk: '🦠',
  hare: '🐰', heckler: '😜', 'huge-baby': '👶', hypnotist: '🌀', 'flip-flop': '🩴', inchworm: '🐛',
  lackey: '🙇', leaptoad: '🐸', legs: '🦵', 'lovable-loser': '🥺', magician: '🎩', mastermind: '🧐',
  mouth: '👄', 'party-animal': '🥳', 'rocket-scientist': '🚀', romantic: '😍', scoocher: '👣',
  sisyphus: '🪨', skipper: '⚓', stickler: '📏', suckerfish: '🐠', 'third-wheel': '🚲', twin: '👯',
};

export const ASSETS: AssetManifest = {
  racers: Object.fromEntries(
    RACERS.map((r, i) => [
      r.id,
      { src: null, tint: placeholderTint(i), label: initials(r.name), glyph: RACER_GLYPH[r.id] ?? '🏁' } as RacerArt,
    ]),
  ),
  board: { mild: { src: null }, wild: { src: null } },
  chips: { gold: null, silver: null, bronze: null },
  logo: null,
};

export function racerArt(id: RacerId): RacerArt {
  return ASSETS.racers[id] ?? { src: null, tint: 0x888888, label: '?', glyph: '🏁' };
}

export function boardArt(side: Side): BoardArt {
  return ASSETS.board[side] ?? { src: null };
}

/** Convert a 0xRRGGBB tint to a CSS hex string. */
export function tintToCss(tint: number): string {
  return '#' + tint.toString(16).padStart(6, '0');
}
