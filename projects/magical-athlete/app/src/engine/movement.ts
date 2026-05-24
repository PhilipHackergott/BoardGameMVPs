// Pure track-move resolution: given a start position and a move amount, compute where a racer
// ends up after resolving the landing space's feature (arrows chain; rock trips; star grants a
// chip). Independent of match state, so it is exhaustively unit-testable.

import { featureAt, type Track } from './track';

export interface MoveResult {
  pos: number;
  finished: boolean; // crossed the finish line
  tripped: boolean; // landed on a rock
  stars: number; // star spaces landed on (each = one bronze 1-point chip)
}

export function resolveTrackMove(
  track: Track,
  startPos: number,
  amount: number,
  stepCap: number,
): MoveResult {
  let pos = startPos + amount;
  let tripped = false;
  let stars = 0;
  let depth = 0;

  for (;;) {
    if (pos >= track.length) return { pos, finished: true, tripped, stars };
    if (pos < 0) pos = 0; // never behind the Start space
    const f = featureAt(track, pos);
    if (!f) break;
    if (f.kind === 'star') {
      stars += 1;
      break; // a star doesn't move you; resolution ends here
    }
    if (f.kind === 'rock') {
      tripped = true;
      break;
    }
    // arrow: a separate move, then re-resolve the new landing space
    if (++depth > stepCap) break;
    pos += f.delta ?? 0;
  }

  return { pos, finished: false, tripped, stars };
}
