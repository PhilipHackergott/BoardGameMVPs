// Public API of the Cull the Crown engine. Pure & deterministic: every run is reproducible
// from { seed, action-log }. UI/render consume this; nothing here imports UI/render.

import { activeJokers, buildModInfo, effectiveSuitUpgrades, enemyDecrees, incomingDamage } from "./combat";
import { EVENT_AT } from "./content";
import { rewardBreakdown } from "./run";
import { cardSuits, resolvePlay } from "./resolution";
import { Card, EnemyIntent, ResolutionResult, RunState, Suit, SUIT_NAME, Tier } from "./types";

export { createRun, applyAction, DEFAULT_CONFIG, currentHandMax } from "./run";
export { maxSlots, heldMax } from "./combat";
export { rewardBreakdown };
export type { RewardBreakdown } from "./run";
export {
  JOKER_LIBRARY,
  jokerById,
  EDICT_LIBRARY,
  edictById,
  activeEdicts,
  edictBonuses,
  discountedPrice,
  DECREE_LIBRARY,
  DECREE_SEVERITY,
  decreeById,
  SIGIL_INFO,
  SIGIL_IDS,
  EDITION_INFO,
  EVENT_LIBRARY,
  eventById,
  TAROT_LIBRARY,
  tarotById,
  SPECTRAL_LIBRARY,
  spectralById,
  contentMeta,
  makeCardFromTemplate,
  addSigil,
  DECK_LIBRARY,
  deckById,
  STAKE_IDS,
  STAKE_INFO,
  stakeIndex,
  stakeMods,
} from "./content";
export { parseSelection, resolvePlay, cardSuits, styleOf } from "./resolution";
export { buildDeck, TIER_STATS } from "./cards";
export * from "./types";

/** Preview the effect of playing a set of hand cards against the current enemy (for the UI
 *  staging panel). Returns an invalid result if there is no active combat. */
export function previewPlay(run: RunState, cardIds: string[], wildSuits: Record<string, Suit> = {}): ResolutionResult {
  if (!run.combat) {
    return {
      valid: false,
      reason: "No active fight.",
      damage: 0,
      heal: 0,
      draw: 0,
      shield: 0,
      goldDelta: 0,
      jesterPlayed: false,
      trace: [],
    };
  }
  const selected = cardIds
    .map((id) => run.hand.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const jokers = activeJokers(run);
  // Reflect the immunity "answer" relic in the preview before the first play commits it.
  let enemy = run.combat.enemy;
  if (!enemy.immunityCancelled && jokers.some((j) => j.cancelsImmunity)) {
    enemy = { ...enemy, immunityCancelled: true };
  }
  const decrees = activeJokers(run).some((j) => j.disablesDecrees) ? [] : enemyDecrees(enemy);
  const res = resolvePlay(
    selected,
    enemy,
    jokers,
    effectiveSuitUpgrades(run),
    run.combat.firstAttackDone,
    (ctx, en) => {
      for (const d of decrees) d.resolve?.(ctx, en);
    },
    buildModInfo(run),
    wildSuits,
    run.styleLevels,
  );
  // Surface a decree veto (e.g. Paranoid Crown) as an invalid play, so the action box explains it
  // and the simulation/AI naturally skips forbidden plays instead of looping on a rejected one.
  if (res.valid) {
    const suits = Array.from(new Set(selected.flatMap((c) => cardSuits(c, wildSuits[c.id]))));
    for (const d of decrees) {
      const reason = d.forbids?.(run.combat, suits);
      if (reason) return { ...res, valid: false, reason };
    }
  }
  return res;
}

/** Read-only view of a single royal for the Descent overview map. */
export interface RoyalView {
  index: number;
  tier: Tier;
  suit: Suit; // the suit it is immune to
  maxHealth: number;
  attack: number;
  decrees: { name: string; text: string | null }[];
  enrages: boolean;
  eventBefore: boolean; // a Court Event precedes this fight
  status: "cleared" | "current" | "upcoming";
}

/** The whole gauntlet, royal by royal, for the run-overview modal. Pure read of RunState. */
export function gauntletView(run: RunState): RoyalView[] {
  return run.castle.map((e, i) => {
    const decrees = enemyDecrees(e).map((d) => ({
      name: d.id === "plague-court" && e.decreeParam ? `${d.name} (corrupts ${SUIT_NAME[e.decreeParam]})` : d.name,
      text: d.text,
    }));
    return {
      index: i,
      tier: e.tier,
      suit: e.suit,
      maxHealth: e.maxHealth,
      attack: e.attack,
      decrees,
      enrages: e.enrageAtPct != null,
      eventBefore: EVENT_AT.has(i),
      status: i < run.enemyIndex ? "cleared" : i === run.enemyIndex ? "current" : "upcoming",
    };
  });
}

/** What the current royal will do next — for the on-panel intent telegraph. Pure & always live. */
export function enemyIntent(run: RunState): EnemyIntent | null {
  if (run.phase !== "combat" || !run.combat || run.combat.outcome) return null;
  const e = run.combat.enemy;
  const decrees = activeJokers(run).some((j) => j.disablesDecrees) ? [] : enemyDecrees(e);
  const enraged = e.enrageAtPct != null && e.damageTaken >= e.maxHealth * e.enrageAtPct;
  return {
    incoming: incomingDamage(run),
    enraged,
    ignoresShield: decrees.some((d) => d.ignoresShield),
    decrees: decrees.map((d) => ({ name: d.name, text: d.text, note: d.intentNote ?? null })),
  };
}

const SUIT_DISPLAY_ORDER: Record<string, number> = { H: 0, D: 1, C: 2, S: 3 };

/** Stable display order for any card list shown to the player: grouped by suit (♥♦♣♠), then by
 *  value DESCENDING. Used everywhere cards are listed (deck/discard modals, the shop deck list). */
export function displayOrder(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const sa = a.suit ? SUIT_DISPLAY_ORDER[a.suit] : 9;
    const sb = b.suit ? SUIT_DISPLAY_ORDER[b.suit] : 9;
    return sa - sb || b.value - a.value;
  });
}

export interface RunSummary {
  seed: string;
  phase: RunState["phase"];
  royalsDefeated: number;
  totalRoyals: number;
  exactKills: number;
  gold: number;
  goldEarned: number;
  jokers: string[];
}

export function runSummary(run: RunState): RunSummary {
  return {
    seed: run.seedLabel,
    phase: run.phase,
    royalsDefeated: run.fightsWon,
    totalRoyals: run.castle.length,
    exactKills: run.exactKills,
    gold: run.gold,
    goldEarned: run.goldEarned,
    jokers: run.slots.slice(),
  };
}

export function deckCount(run: RunState): number {
  return run.deck.length + run.hand.length + run.discard.length + run.table.length;
}

/** The reward a pending won fight will pay, for the Claim gate (null if not in a won state). */
export function wonReward(run: RunState): import("./run").RewardBreakdown | null {
  if (run.phase === "combat" && run.combat?.outcome === "won") {
    return rewardBreakdown(run, run.combat.wonExact);
  }
  return null;
}
