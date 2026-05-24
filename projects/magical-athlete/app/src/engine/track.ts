// Track model: an ordered list of spaces per side, with optional features (Wild side only).
// Render reads geometry from here so visuals and rules share one source of truth.

import type { Side } from './types';
import { TRACK_LENGTH, WILD_FEATURES, type FeatureDef } from './config';

export interface Space {
  index: number;
  feature: FeatureDef | null;
}

export interface Track {
  side: Side;
  length: number;
  spaces: Space[];
}

export function buildTrack(side: Side): Track {
  const length = TRACK_LENGTH[side];
  const features = side === 'wild' ? WILD_FEATURES : [];
  const spaces: Space[] = [];
  for (let i = 0; i < length; i++) {
    spaces.push({ index: i, feature: features.find((f) => f.index === i) ?? null });
  }
  return { side, length, spaces };
}

export function featureAt(track: Track, index: number): FeatureDef | null {
  if (index < 0 || index >= track.length) return null;
  return track.spaces[index].feature;
}
