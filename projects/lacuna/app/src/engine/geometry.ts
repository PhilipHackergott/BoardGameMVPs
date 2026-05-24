// Pure 2D geometry helpers. The "clear line" adjudication lives here.

import type { Beacon, PlayerId, Star } from "./types";

export interface Point {
  x: number;
  y: number;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

// Perpendicular distance from point p to the segment a–b, plus the projection
// parameter t (0 at a, 1 at b). t in (0,1) means the foot lies strictly between
// the endpoints — i.e. the point can actually block the open segment.
export function pointSegInfo(
  p: Point,
  a: Point,
  b: Point,
): { distance: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return { distance: dist(p.x, p.y, a.x, a.y), t: 0 };
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return { distance: dist(p.x, p.y, cx, cy), t };
}

// Do open segments p1-p2 and p3-p4 cross? Used for Intercept barriers.
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

// Closest point on the *segment* a–b to p (the projection parameter t is clamped
// to [0,1]), together with that clamped point and its distance. Used by the UI to
// snap a pawn preview onto the guide line the cursor is gliding along.
export function projectOnSegment(
  p: Point,
  a: Point,
  b: Point,
): { x: number; y: number; t: number; distance: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const x = a.x + t * abx;
  const y = a.y + t * aby;
  return { x, y, t, distance: dist(p.x, p.y, x, y) };
}

// Is the open segment between stars a and b unobstructed?
// A star (other than the two endpoints) blocks if the segment passes within
// starR of its center; a beacon blocks if within beaconR. The blocker's
// projection must fall strictly between the endpoints.
export function segmentClear(
  a: Star,
  b: Star,
  stars: Star[],
  beacons: Beacon[],
  starR: number,
  beaconR: number,
): boolean {
  const EPS = 1e-9;
  for (const s of stars) {
    if (s.id === a.id || s.id === b.id) continue;
    const info = pointSegInfo(s, a, b);
    if (info.t > EPS && info.t < 1 - EPS && info.distance < starR) return false;
  }
  for (const beacon of beacons) {
    const info = pointSegInfo(beacon, a, b);
    if (info.t > EPS && info.t < 1 - EPS && info.distance < beaconR) return false;
  }
  return true;
}

// Nearest beacon to a star and its owner. owner is null if there are no beacons or
// if the two closest beacons (different owners) are equidistant (a tie → discard).
export function nearestBeacon(
  star: Star,
  beacons: Beacon[],
): { beacon: Beacon | null; owner: PlayerId | null } {
  const EPS = 1e-7;
  let best = Infinity;
  let bestBeacon: Beacon | null = null;
  let bestOwner: PlayerId | null = null;
  let tied = false;
  for (const beacon of beacons) {
    const d = dist(star.x, star.y, beacon.x, beacon.y);
    if (d < best - EPS) {
      best = d;
      bestBeacon = beacon;
      bestOwner = beacon.owner;
      tied = false;
    } else if (Math.abs(d - best) <= EPS && beacon.owner !== bestOwner) {
      tied = true;
    }
  }
  return tied ? { beacon: null, owner: null } : { beacon: bestBeacon, owner: bestOwner };
}

// Owner of the nearest beacon to a star; null on no beacons or an equidistant tie.
export function nearestBeaconOwner(star: Star, beacons: Beacon[]): PlayerId | null {
  return nearestBeacon(star, beacons).owner;
}
