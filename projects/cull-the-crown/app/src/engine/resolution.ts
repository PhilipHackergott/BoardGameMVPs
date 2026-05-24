// The resolution stack — the core of the combat math. A pure pipeline with explicit, ordered
// phases so joker modifiers compose predictably:
//
//   PARSE -> AGGREGATE -> BASE_POWERS (immunity folded in) -> STYLE -> DECREE -> SIGIL -> JOKERS -> FINALIZE
//
// Regicide rules captured here (with the Balatro-patch loosening):
//  - A play is a single card, a Jester (value 0), an Animal Companion play (an Ace alone, with one
//    other card, OR added to a combo), or a combo (2-5 cards of EQUAL rank summing to <= 10). The
//    play may use at most 5 cards (so an Ace + 4-combo = a 5-card Mage+Mounted play).
//  - All suit powers resolve at the AGGREGATED value v. Damage = v, doubled if any Club is played.
//  - The STYLE phase scales the play's suit effects by its Fighting Style level (see styleOf).
//  - Each enemy is immune to its own suit's POWER (not its damage); a Jester cancels immunity for
//    the rest of the fight (handled by combat.ts; here we just read enemy.immunityCancelled).
//  - Hearts heal, Diamonds draw, Spades shield, Clubs double — applied once per suit present.

import {
  Card,
  Enemy,
  FightingStyleId,
  FIGHTING_STYLE_NAME,
  FIGHTING_STYLE_PER_LEVEL,
  Joker,
  ModInfo,
  ResContext,
  ResolutionResult,
  Suit,
  SuitUpgrades,
} from "./types";

/** All-zero style levels — the default when a play isn't scaled by any Fighting Style. */
const NO_STYLES: Record<FightingStyleId, number> = {
  twoHanded: 0,
  swordShield: 0,
  spear: 0,
  dualWield: 0,
  mage: 0,
  mounted: 0,
};

/** Classify a play into its Fighting Style. The size-style is decided by the number of NON-companion
 *  cards (1→Two-Handed, 2→Sword&Shield, 3→Spear, 4→Dual Wielding, 5→Mage) — i.e. the size of the
 *  equal-rank group. `mounted` is a separate axis, true when the play contains an Animal Companion
 *  (Ace); the Ace is purely the mount and NEVER inflates the size. So an Ace + four-of-a-kind is a
 *  Dual Wielding (+Mounted) play, NOT Mage — Mage demands FIVE same-rank cards, which a fresh deck
 *  (max four of a rank) cannot produce: it is only reachable by deck-shaping, hence "magical". */
export function styleOf(cards: Card[]): { size: FightingStyleId; mounted: boolean } {
  const order: FightingStyleId[] = ["twoHanded", "swordShield", "spear", "dualWield", "mage"];
  const numCards = cards.filter((c) => c.kind !== "companion").length;
  const n = Math.min(5, Math.max(1, numCards)); // a lone Ace reads as a 1-card (Two-Handed) play
  return { size: order[n - 1], mounted: cards.some((c) => c.kind === "companion") };
}

interface Parsed {
  ok: boolean;
  reason?: string;
  value: number;
  isCombo: boolean;
  comboCount: number;
  jesterPlayed: boolean;
  suits: Set<Suit>;
}

/** The suit(s) a card contributes this play: its printed suit (or the chosen Wildcard suit) plus any
 *  "extra" sigil suit. Jesters contribute none. */
export function cardSuits(card: Card, wild?: Suit): Suit[] {
  if (card.kind === "jester") return [];
  const base = card.sigils?.includes("wildcard") ? (wild ?? card.suit) : card.suit;
  const out: Suit[] = [];
  if (base) out.push(base);
  if (card.extraSuit && card.extraSuit !== base) out.push(card.extraSuit);
  return out;
}

/** Validate a selection of hand cards and aggregate it into a value + active suits. */
export function parseSelection(cards: Card[], wildSuits: Record<string, Suit> = {}, comboMax = 10): Parsed {
  const empty: Parsed = {
    ok: false,
    value: 0,
    isCombo: false,
    comboCount: 0,
    jesterPlayed: false,
    suits: new Set(),
  };
  if (cards.length === 0) return { ...empty, reason: "Select a card to play." };

  const jesters = cards.filter((c) => c.kind === "jester");
  if (jesters.length > 0) {
    if (cards.length === 1) {
      return {
        ok: true,
        value: 0,
        isCombo: false,
        comboCount: 0,
        jesterPlayed: true,
        suits: new Set(),
      };
    }
    return { ...empty, reason: "A Jester must be played on its own." };
  }

  const companions = cards.filter((c) => c.kind === "companion");
  const numbers = cards.filter((c) => c.kind === "number");

  // At most one Animal Companion per play (no stacking Aces).
  if (companions.length > 1) {
    return { ...empty, reason: "Only one Animal Companion per play." };
  }
  const ace = companions[0];

  // Validate the number group: a single card, or a combo of 2-5 equal-rank cards summing to <= 10.
  let isCombo = false;
  let comboCount = 0;
  let numbersValue = 0;
  if (numbers.length >= 2) {
    const v0 = numbers[0].value;
    if (!numbers.every((c) => c.value === v0)) {
      return { ...empty, reason: "A combo must be cards of equal rank." };
    }
    if (numbers.length > 5) {
      return { ...empty, reason: "A combo may use at most 5 cards." };
    }
    numbersValue = numbers.reduce((a, c) => a + c.value, 0);
    if (numbersValue > comboMax) {
      return { ...empty, reason: `A combo's total value must be ${comboMax} or less.` };
    }
    isCombo = true;
    comboCount = numbers.length;
  } else if (numbers.length === 1) {
    numbersValue = numbers[0].value;
  }

  // An Animal Companion may go alone, with one other card, or added to a combo — the whole play
  // capped at 5 cards (so an Ace + 4-combo is the 5-card Mage+Mounted play). The Ace adds its value.
  if (ace) {
    if (cards.length > 5) {
      return { ...empty, reason: "A play may use at most 5 cards." };
    }
    return suitsFrom(cards, numbersValue + ace.value, isCombo, comboCount, wildSuits);
  }

  // Pure number cards (single or combo).
  if (numbers.length === 0) {
    return { ...empty, reason: "Select a card to play." };
  }
  return suitsFrom(cards, numbersValue, isCombo, comboCount, wildSuits);
}

function suitsFrom(
  cards: Card[],
  value: number,
  isCombo: boolean,
  comboCount: number,
  wildSuits: Record<string, Suit>,
): Parsed {
  const suits = new Set<Suit>();
  for (const c of cards) for (const s of cardSuits(c, wildSuits[c.id])) suits.add(s);
  return { ok: true, value, isCombo, comboCount, jesterPlayed: false, suits };
}

/** Run the full resolution stack for a play. Pure. */
export function resolvePlay(
  cards: Card[],
  enemy: Enemy,
  jokers: Joker[],
  upgrades: SuitUpgrades,
  firstAttackDone: boolean,
  decreeResolve?: (ctx: ResContext, enemy: Enemy) => void,
  info?: ModInfo,
  wildSuits: Record<string, Suit> = {},
  styleLevels: Record<FightingStyleId, number> = NO_STYLES,
): ResolutionResult {
  const comboMax = 10 + jokers.reduce((a, j) => a + (j.comboMaxBonus ?? 0), 0); // Loose Grip raises it
  const parsed = parseSelection(cards, wildSuits, comboMax);
  if (!parsed.ok) {
    return {
      valid: false,
      reason: parsed.reason,
      damage: 0,
      heal: 0,
      draw: 0,
      shield: 0,
      goldDelta: 0,
      jesterPlayed: false,
      trace: [],
    };
  }

  // Honed sigils raise the card's effective value (Balatro "Bonus" analog), scaling every power and
  // the damage — folded into v BEFORE base powers, but it never affects combo legality (that was
  // already checked on printed values in parseSelection).
  const honedBonus = cards.reduce(
    (a, c) => a + (c.sigils?.filter((s) => s === "honed").length ?? 0) * 2,
    0,
  );
  // Red Seal "retrigger": the card's value counts an extra time (the aggregate-model analog).
  const redSealBonus = cards.reduce((a, c) => a + (c.seal === "red" ? c.value : 0), 0);
  const v = parsed.value + honedBonus + redSealBonus;
  const immune = (s: Suit) => enemy.suit === s && !enemy.immunityCancelled;
  const present = (s: Suit) => parsed.suits.has(s);
  const active = (s: Suit) => present(s) && !immune(s);

  const style = styleOf(cards);
  const ctx: ResContext = {
    value: v,
    cards,
    isCombo: parsed.isCombo,
    comboCount: parsed.comboCount,
    sizeStyle: style.size,
    mounted: style.mounted,
    jesterPlayed: parsed.jesterPlayed,
    firstAttackDone,
    heartActive: active("H"),
    diamondActive: active("D"),
    clubActive: active("C"),
    spadeActive: active("S"),
    damage: 0,
    heal: 0,
    draw: 0,
    shield: 0,
    goldDelta: 0,
    trace: [],
  };

  // BASE_POWERS. Damage is the played value; clubs double it (the whole total, per Regicide).
  ctx.damage = v;
  ctx.trace.push(`Base attack value ${v}.`);
  if (ctx.clubActive) {
    ctx.damage = v * 2 + upgrades.C;
    ctx.trace.push(`Clubs double damage -> ${ctx.damage}.`);
  } else if (present("C") && immune("C")) {
    ctx.trace.push("Clubs do not double (this royal disables Clubs).");
  }
  if (honedBonus > 0) ctx.trace.push(`Honed: +${honedBonus} value.`);
  if (ctx.heartActive) {
    ctx.heal = v + upgrades.H;
    ctx.trace.push(`Hearts heal ${ctx.heal} from the discard.`);
  } else if (present("H") && immune("H")) {
    ctx.trace.push("Hearts heal nothing (this royal disables Hearts).");
  }
  if (ctx.diamondActive) {
    ctx.draw = v + upgrades.D;
    ctx.trace.push(`Diamonds draw ${ctx.draw}.`);
  } else if (present("D") && immune("D")) {
    ctx.trace.push("Diamonds draw nothing (this royal disables Diamonds).");
  }
  if (ctx.spadeActive) {
    ctx.shield = v + upgrades.S;
    ctx.trace.push(`Spades shield ${ctx.shield}.`);
  } else if (present("S") && immune("S")) {
    ctx.trace.push("Spades give no shield (this royal disables Spades).");
  }

  // STYLE phase — Fighting-Style scaling (the Planet-card analog). The style is set by the number of
  // cards played; leveling it adds a curved fraction of base to this play's SUIT effects (heal/draw/
  // shield, and club-doubled damage). "Mounted" stacks an extra fraction when an Ace is in the play.
  // Floored, per the truncation rule. Runs on the natural base powers, before decrees/sigils/jokers.
  {
    const size = ctx.sizeStyle;
    const mountedActive = ctx.mounted && (styleLevels.mounted ?? 0) > 0;
    const frac =
      (styleLevels[size] ?? 0) * FIGHTING_STYLE_PER_LEVEL[size] +
      (mountedActive ? (styleLevels.mounted ?? 0) * FIGHTING_STYLE_PER_LEVEL.mounted : 0);
    if (frac > 0) {
      const mult = 1 + frac;
      if (ctx.heal > 0) ctx.heal = Math.floor(ctx.heal * mult);
      if (ctx.draw > 0) ctx.draw = Math.floor(ctx.draw * mult);
      if (ctx.shield > 0) ctx.shield = Math.floor(ctx.shield * mult);
      if (ctx.clubActive && ctx.damage > 0) ctx.damage = Math.floor(ctx.damage * mult);
      const names = [FIGHTING_STYLE_NAME[size]];
      if (mountedActive) names.push(FIGHTING_STYLE_NAME.mounted);
      ctx.trace.push(`${names.join(" + ")} ×${mult.toFixed(2)} (fighting style).`);
    }
  }

  // DECREE phase — the royal's special rule shapes the base powers before jokers react to them.
  if (decreeResolve) decreeResolve(ctx, enemy);

  // SIGIL phase — per-card flat enhancements (a card may carry several; they stack). Structural
  // sigils (honed/companion/extra/wildcard) are handled in parse/aggregate, not here.
  for (const c of cards) {
    for (const sig of c.sigils ?? []) {
      if (sig === "keen") {
        ctx.damage += 2;
        ctx.trace.push("Keen Edge: +2 damage.");
      } else if (sig === "warded") {
        ctx.shield += 2;
        ctx.trace.push("Warding: +2 shield.");
      } else if (sig === "gilded") {
        ctx.goldDelta += 1;
        ctx.trace.push("Gilding: +1 gold.");
      } else if (sig === "runed") {
        ctx.draw += 1;
        ctx.trace.push("Runes: +1 draw.");
      } else if (sig === "steel") {
        ctx.shield += 3;
        ctx.trace.push("Steel: +3 shield.");
      } else if (sig === "glass") {
        ctx.damage += 6;
        ctx.trace.push("Glass: +6 damage.");
      } else if (sig === "minted") {
        ctx.goldDelta += 2;
        ctx.trace.push("Minted: +2 gold.");
      } else if (sig === "charmed") {
        ctx.damage += 3;
        ctx.goldDelta += 1;
        ctx.trace.push("Charmed: +3 damage, +1 gold.");
      } else if (sig === "stoneskin") {
        ctx.shield += 5;
        ctx.damage += 5;
        ctx.trace.push("Stoneskin: +5 shield, +5 damage.");
      }
    }
    // Gold Seal: gold when this card is played (Red Seal was folded into v above; Blue/Purple
    // resolve at fight-end / on discard, in run.ts / combat.ts).
    if (c.seal === "gold") {
      ctx.goldDelta += 3;
      ctx.trace.push("Gold Seal: +3 gold.");
    }
  }

  // JOKERS phase — each active joker mutates ctx, in slot order. A copy joker (Blueprint/Brainstorm)
  // ALSO applies the modify of its adjacent guild member.
  for (let i = 0; i < jokers.length; i++) {
    const j = jokers[i];
    if (j.modify) j.modify(ctx, info);
    if (j.copiesNeighbor) {
      const nb = jokers[i + (j.copiesNeighbor === "right" ? 1 : -1)];
      if (nb?.modify) {
        nb.modify(ctx, info);
        ctx.trace.push(`${j.name} copies ${nb.name}.`);
      }
    }
  }

  // EDITION phase — joker Editions (Spectral-applied) boost the play's damage: +flat (Burnished/
  // Haloed), then ×mult (Prismatic). Applied after jokers so it scales the whole assembled attack.
  if (info && ctx.damage > 0) {
    const flat = info.editionFlat ?? 0;
    const mult = info.editionMult ?? 1;
    if (flat || mult !== 1) {
      ctx.damage = (ctx.damage + flat) * mult;
      ctx.trace.push(`Editions: (+${flat}) ×${mult.toFixed(2)} damage.`);
    }
  }

  // FINALIZE — clamp to non-negative integers.
  return {
    valid: true,
    damage: Math.max(0, Math.round(ctx.damage)),
    heal: Math.max(0, Math.round(ctx.heal)),
    draw: Math.max(0, Math.round(ctx.draw)),
    shield: Math.max(0, Math.round(ctx.shield)),
    goldDelta: Math.round(ctx.goldDelta),
    jesterPlayed: ctx.jesterPlayed,
    trace: ctx.trace,
  };
}
