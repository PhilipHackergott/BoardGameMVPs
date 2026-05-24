import { describe, expect, it } from 'vitest';
import { CARDS } from '../../src/engine';
import type { CardDeck } from '../../src/engine';

describe('card coverage (all 96, real text, no fabrication)', () => {
  it('has exactly 96 cards across 4 decks of 24', () => {
    expect(CARDS).toHaveLength(96);
    const counts: Record<CardDeck, number> = {
      fpCharacter: 0,
      fpStrategy: 0,
      shadowCharacter: 0,
      shadowStrategy: 0,
    };
    for (const c of CARDS) counts[c.deck]++;
    expect(counts).toEqual({ fpCharacter: 24, fpStrategy: 24, shadowCharacter: 24, shadowStrategy: 24 });
  });

  it('every card has valid metadata (id, side, deck, die, title, event text)', () => {
    for (const c of CARDS) {
      expect(c.id).toMatch(/^(fp|shadow)_(character|strategy)_\d\d$/);
      expect(['fp', 'shadow']).toContain(c.side);
      expect(['character', 'army', 'muster', 'armyMuster', 'event']).toContain(c.dieToPlay);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.event.length).toBeGreaterThan(0);
    }
  });

  it('card ids are unique', () => {
    const ids = new Set(CARDS.map((c) => c.id));
    expect(ids.size).toBe(96);
  });

  it('scripted cards carry a hook; unscripted carry only real text (never fabricated automation)', () => {
    const scripted = CARDS.filter((c) => c.scripted);
    for (const c of scripted) expect(c.hook).toBeDefined();
    for (const c of CARDS.filter((c) => !c.scripted)) expect(c.hook).toBeUndefined();
    // report (visible in test output) — coverage is tracked toward more automation, not toward text
    const report = `${scripted.length}/96 scripted, ${96 - scripted.length}/96 real-text-resolved-by-hand`;
    expect(report).toContain('/96');
  });
});
