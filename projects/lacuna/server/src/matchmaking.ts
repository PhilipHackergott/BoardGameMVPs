// Strength-based matchmaking for ranked 1v1. Players queue with their current Elo; the
// acceptance band widens with wait time so close matches form fast and nobody waits forever.

export interface Ticket {
  userId: string;
  elo: number;
  since: number; // ms timestamp when queued
}

// Acceptable Elo gap = BASE + RATE * secondsWaited (by the longest-waiting of the pair).
const BAND_BASE = 100;
const BAND_RATE_PER_SEC = 50;

export class Matchmaker {
  private queue: Ticket[] = [];

  has(userId: string): boolean {
    return this.queue.some((t) => t.userId === userId);
  }

  size(): number {
    return this.queue.length;
  }

  enqueue(userId: string, elo: number): boolean {
    if (this.has(userId)) return false;
    this.queue.push({ userId, elo, since: Date.now() });
    return true;
  }

  remove(userId: string): void {
    this.queue = this.queue.filter((t) => t.userId !== userId);
  }

  /**
   * Pair waiting players. The longest-waiting player is matched with the closest-Elo
   * opponent inside that player's (time-widening) band. Returns the matched pairs and
   * removes them from the queue. Call this on every enqueue and on a periodic tick.
   */
  pair(now = Date.now()): [Ticket, Ticket][] {
    const pairs: [Ticket, Ticket][] = [];
    // Oldest first, so the player who has waited longest gets first pick.
    this.queue.sort((a, b) => a.since - b.since);

    const taken = new Set<string>();
    for (const a of this.queue) {
      if (taken.has(a.userId)) continue;
      const band = BAND_BASE + (BAND_RATE_PER_SEC * (now - a.since)) / 1000;

      let best: Ticket | null = null;
      let bestDiff = Infinity;
      for (const b of this.queue) {
        if (b.userId === a.userId || taken.has(b.userId)) continue;
        const diff = Math.abs(a.elo - b.elo);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = b;
        }
      }
      if (best && bestDiff <= band) {
        taken.add(a.userId);
        taken.add(best.userId);
        pairs.push([a, best]);
      }
    }

    if (taken.size > 0) this.queue = this.queue.filter((t) => !taken.has(t.userId));
    return pairs;
  }
}
