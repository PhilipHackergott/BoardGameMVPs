// Run lifecycle and the top-level reducer. Combat math lives in combat.ts / resolution.ts; the
// content library in content.ts. applyAction clones the state, so the engine API is pure.

import { buildCastleGroups, buildDeck, buildSuitedDeck } from "./cards";
import { activeJokers, combatDiscard, combatPlay, combatYield, currentHandMax, heldMax, maxSlots, startFight } from "./combat";
import {
  addSigil,
  assignTieredDecree,
  DECK_LIBRARY,
  deckById,
  decreeById,
  discountedPrice,
  edictById,
  edictBonuses,
  EVENT_AT,
  EVENT_LIBRARY,
  eventById,
  jokerById,
  JOKER_LIBRARY,
  makeCardFromTemplate,
  rollShopV2,
  SIGIL_IDS,
  stakeMods,
  tarotById,
  TAROT_LIBRARY,
} from "./content";
import { rngInt, seedFromString, shuffle } from "./rng";
import { Action, Card, DeckDef, Enemy, FIGHTING_STYLE_IDS, HeldConsumable, PackKind, RunConfig, RunState, SUITS } from "./types";

export const DEFAULT_CONFIG: RunConfig = {
  startGold: 4,
  handMax: 8,
  interestPer: 5,
  interestCap: 5,
  exactKillMult: 2,
  fightReward: { jack: 3, queen: 4, king: 5 },
  rerollBase: 2,
  rerollStep: 1,
  trainStep: 1,
  recruitMaxValue: 5,
  removeBase: 2,
  removeStep: 2,
  heldBase: 2,
};

function freshCombat(enemy: Enemy) {
  return {
    enemy,
    subphase: "play" as const,
    incoming: 0,
    firstAttackDone: false,
    yieldedLastTurn: false,
    outcome: null,
    wonExact: false,
    lastSuits: [] as Enemy["suit"][],
  };
}

/** Assign each royal a tiered Royal Decree (the first fight stays clean as a tutorial) — Jacks mild,
 *  Queens standard, Kings severe + a stacked mild decree, the final King the finisher + a stacked
 *  severe decree. Applies every decree's health multiplier and gives Kings enrage. Mutates in place. */
function applyDecrees(castle: Enemy[], state: number, firstRoyalDecree = false): number {
  let s = state;
  let lastPrimary: string | null = null;
  castle.forEach((e, i) => {
    if (i === 0 && !firstRoyalDecree) {
      e.decreeId = null;
      e.decreeId2 = null;
      e.decreeParam = null;
      return;
    }
    const isFinalKing = i === castle.length - 1;
    const a = assignTieredDecree(s, e, isFinalKing, lastPrimary);
    s = a.state;
    e.decreeId = a.decreeId;
    e.decreeId2 = a.decreeId2;
    e.decreeParam = a.decreeParam;
    lastPrimary = a.decreeId;
    for (const id of [a.decreeId, a.decreeId2]) {
      const decree = id ? decreeById(id) : undefined;
      if (decree?.healthMult) e.maxHealth = Math.round(e.maxHealth * decree.healthMult);
    }
    if (e.tier === "king") {
      e.enrageAtPct = 0.5;
      e.enrageAttackBonus = 5;
    }
  });
  return s;
}

/** Build the starting deck for a deck variant: suit-restricted or standard, optionally randomized. */
function buildRunDeck(deck: DeckDef, state: number): { cards: Card[]; state: number } {
  let s = state;
  let cards = deck.suits ? buildSuitedDeck(deck.suits) : buildDeck();
  if (deck.randomizeSuits) {
    cards = cards.map((c) => {
      if (c.kind === "jester") return c;
      const r = rngInt(s, SUITS.length);
      s = r.state;
      return { ...c, suit: SUITS[r.value] };
    });
  }
  return { cards, state: s };
}

export function createRun(seed: string, deckId = "royal", stakeId = "white", baseConfig: RunConfig = DEFAULT_CONFIG): RunState {
  const deck = deckById(deckId) ?? DECK_LIBRARY[0];
  const stake = stakeMods(stakeId);

  // Effective config: deck overrides, then stake difficulty deltas.
  const config: RunConfig = { ...baseConfig, ...deck.config };
  config.handMax = Math.max(1, config.handMax + stake.handDelta);
  config.startGold = Math.max(0, config.startGold + stake.startGoldDelta);
  config.rerollBase = Math.max(0, config.rerollBase + stake.rerollDelta);
  config.removeBase = Math.max(0, config.removeBase + stake.removeDelta);
  config.fightReward = {
    jack: Math.max(1, config.fightReward.jack + stake.rewardDelta),
    queen: Math.max(1, config.fightReward.queen + stake.rewardDelta),
    king: Math.max(1, config.fightReward.king + stake.rewardDelta),
  };

  const label = seed.trim() === "" ? `auto-${Date.now()}` : seed.trim();
  let rngState = seedFromString(label);

  const built = buildRunDeck(deck, rngState);
  rngState = built.state;
  const dealt = shuffle(built.cards, rngState);
  rngState = dealt.state;
  const cards = dealt.arr;

  // Castle: shuffle each rank group, concatenate in tier order, assign decrees, apply stake difficulty.
  const groups = buildCastleGroups();
  const castle: Enemy[] = [];
  for (const group of groups) {
    const sh = shuffle(group, rngState);
    rngState = sh.state;
    castle.push(...sh.arr);
  }
  // Every run opens against the Jack of Hearts — a gentle, healable tutorial fight. Move it to the
  // front of the (already-shuffled) Jacks group; the rest of the gauntlet stays seed-driven.
  const johIdx = castle.findIndex((e) => e.tier === "jack" && e.suit === "H");
  if (johIdx > 0) castle.unshift(castle.splice(johIdx, 1)[0]);
  rngState = applyDecrees(castle, rngState, deck.decreeOnFirstRoyal ?? false);
  for (const e of castle) {
    if (stake.healthMult !== 1) e.maxHealth = Math.round(e.maxHealth * stake.healthMult);
    e.attack += stake.attackBonus;
  }

  // The Enchanter's Deck: pre-engrave N distinct cards (the deck is already shuffled) with a
  // random sigil each.
  for (let i = 0; i < (deck.startSigils ?? 0) && i < cards.length; i++) {
    const rs = rngInt(rngState, SIGIL_IDS.length);
    rngState = rs.state;
    addSigil(cards[i], SIGIL_IDS[rs.value]);
  }

  const hand = cards.slice(0, config.handMax);
  const deckPile = cards.slice(config.handMax);

  // Starting gear from the deck variant.
  let cardSeq = 0;
  const slots: string[] = [...(deck.startSlots ?? [])];
  if (deck.startRandomRareRelic) {
    const pool = JOKER_LIBRARY.filter((j) => j.rarity === "rare" && !slots.includes(j.id));
    if (pool.length > 0) {
      const r = rngInt(rngState, pool.length);
      rngState = r.state;
      slots.push(pool[r.value].id);
    }
  }
  const held: HeldConsumable[] = [];
  for (const tid of deck.startTarots ?? []) {
    cardSeq += 1;
    held.push({ id: `held-${cardSeq}`, tarotId: tid });
  }
  for (let i = 0; i < (deck.startRandomTarots ?? 0); i++) {
    const r = rngInt(rngState, TAROT_LIBRARY.length);
    rngState = r.state;
    cardSeq += 1;
    held.push({ id: `held-${cardSeq}`, tarotId: TAROT_LIBRARY[r.value].id });
  }

  const run: RunState = {
    config,
    deckId: deck.id,
    stakeId: stakeId ?? "white",
    styleLevels: { twoHanded: 0, swordShield: 0, spear: 0, dualWield: 0, mage: 0, mounted: 0 },
    slotEditions: {},
    jokerState: {},
    discardsThisFight: 0,
    culledThisAct: 0,
    yieldedThisFight: false,
    swornRank: 2,
    lastStandUsed: false,
    seedLabel: label,
    rngState,
    deck: deckPile,
    hand,
    discard: [],
    table: [],
    gold: config.startGold,
    slots,
    edicts: [...(deck.startEdicts ?? [])],
    held,
    suitUpgrades: { H: 0, D: 0, C: 0, S: 0 },
    castle,
    enemyIndex: 0,
    combat: freshCombat(castle[0]),
    shop: null,
    eventId: null,
    phase: "combat",
    notice: null,
    log: [],
    fightsWon: 0,
    exactKills: 0,
    goldEarned: 0,
    removeUses: 0,
    cardSeq,
    actEdictsTaken: [],
    deckBaseline: deckPile.length + hand.length,
  };
  startFight(run); // fire any onFightStart relics for the opening fight
  return run;
}

function openShop(run: RunState): void {
  const rerollBase = Math.max(0, run.config.rerollBase + edictBonuses(run.edicts).rerollDelta);
  const rolled = rollShopV2(run.rngState, run, rerollBase, run.fightsWon);
  run.rngState = rolled.state;
  run.shop = rolled.shop;
  run.phase = "shop";
}

export interface RewardBreakdown {
  base: number; // tier bounty
  exact: boolean;
  exactMult: number; // multiplier applied when the kill was exact
  reward: number; // bounty after any exact multiplier
  perFight: number; // guild/relic gold-per-fight
  interest: number; // gold-per-N held
  deckBonus: number; // deck-variant bonus (e.g. The Coffer's gold per leftover hand card)
  total: number;
}

/** Pure preview of the gold a won fight pays — used by the Claim gate and by awardAndAdvance. */
export function rewardBreakdown(run: RunState, exact: boolean): RewardBreakdown {
  const enemy = run.combat!.enemy;
  const jokers = activeJokers(run);
  const deck = deckById(run.deckId);
  const base = run.config.fightReward[enemy.tier];
  const exactMult = run.config.exactKillMult + jokers.reduce((a, j) => a + (j.exactKillMultBonus ?? 0), 0);
  const reward = exact ? base * exactMult : base;
  const perFight = jokers.reduce((a, j) => a + (j.goldPerFight ?? 0), 0);
  const cap = run.config.interestCap + edictBonuses(run.edicts).interestCapBonus + jokers.reduce((a, j) => a + (j.interestCapBonus ?? 0), 0);
  const interest = deck?.noInterest ? 0 : Math.min(Math.floor(run.gold / run.config.interestPer), cap);
  const deckBonus = (deck?.goldPerLeftoverHand ?? 0) * run.hand.length;
  return { base, exact, exactMult, reward, perFight, interest, deckBonus, total: reward + perFight + interest + deckBonus };
}

/** After a kill: award gold, clear the table, advance to the shop or to victory. */
function awardAndAdvance(run: RunState, exact: boolean): void {
  const b = rewardBreakdown(run, exact);
  const total = b.total;
  if (exact) run.exactKills += 1;

  run.gold += total;
  run.goldEarned += total;
  run.fightsWon += 1;

  // Relic hooks for felling a royal (scalers like Reaper's Toll). After the reward is tallied, so
  // they shape future fights, not the one just won.
  for (const j of activeJokers(run)) j.onRoyalFelled?.(run);

  // The Pilgrim's Deck: a free random tarot to the pouch on each royal felled (if there's room).
  if (deckById(run.deckId)?.tarotPerRoyal && run.held.length < heldMax(run)) {
    const r = rngInt(run.rngState, TAROT_LIBRARY.length);
    run.rngState = r.state;
    run.cardSeq += 1;
    run.held.push({ id: `held-${run.cardSeq}`, tarotId: TAROT_LIBRARY[r.value].id });
  }

  // Blue Seals: each blue-sealed card held when the royal falls conjures a Drill (if there's room).
  for (const c of run.hand) {
    if (c.seal === "blue" && run.held.length < heldMax(run)) {
      const r = rngInt(run.rngState, FIGHTING_STYLE_IDS.length);
      run.rngState = r.state;
      run.cardSeq += 1;
      run.held.push({ id: `held-${run.cardSeq}`, tarotId: `drill-${FIGHTING_STYLE_IDS[r.value]}` });
    }
  }

  // Played cards go to the discard pile now.
  run.discard = run.discard.concat(run.table);
  run.table = [];

  run.enemyIndex += 1;
  if (run.enemyIndex === 4 || run.enemyIndex === 8) run.culledThisAct = 0; // a new Act (Cull's Reward resets)
  if (run.enemyIndex >= run.castle.length) {
    run.phase = "won";
    run.combat = null;
    run.shop = null;
    run.notice = `Run complete — all ${run.castle.length} royals overthrown!`;
    return;
  }
  run.combat = freshCombat(run.castle[run.enemyIndex]);
  run.notice = null; // the spoils are shown by the win gate (CombatGate) — no redundant toast
  openShop(run);
}

function findCard(run: RunState, id: string): { pile: Card[]; idx: number } | null {
  for (const pile of [run.deck, run.hand, run.discard]) {
    const idx = pile.findIndex((c) => c.id === id);
    if (idx >= 0) return { pile, idx };
  }
  return null;
}

function doSellJoker(run: RunState, jokerId: string): void {
  if (stakeMods(run.stakeId).noSell) {
    run.notice = "This stake forbids selling jokers.";
    return;
  }
  const idx = run.slots.indexOf(jokerId);
  if (idx < 0) return;
  const joker = jokerById(jokerId);
  run.slots.splice(idx, 1);
  if (joker) {
    run.gold += joker.sellValue;
    run.notice = `Sold ${joker.name} (+${joker.sellValue} gold).`;
  }
}

/** Add a relic to the guild (no gold here; caller charges). */
function grantJoker(run: RunState, jokerId: string): boolean {
  if (run.slots.includes(jokerId)) {
    run.notice = "You already own that relic.";
    return false;
  }
  if (run.slots.length >= maxSlots(run)) {
    run.notice = "No free guild slots (sell one first).";
    return false;
  }
  const j = jokerById(jokerId);
  if (!j) return false;
  run.slots.push(jokerId);
  run.notice = `Recruited ${j.name}.`;
  return true;
}

/** Add a tarot to the held consumable inventory. */
function addHeld(run: RunState, tarotId: string): boolean {
  if (run.held.length >= heldMax(run)) {
    run.notice = "Your consumable pouch is full.";
    return false;
  }
  run.cardSeq += 1;
  run.held.push({ id: `held-${run.cardSeq}`, tarotId });
  run.notice = `Acquired ${tarotById(tarotId)?.name ?? "a tarot"}.`;
  return true;
}

/** Resolve one piece of pack/loose content. Returns false (without consuming) when it can't apply
 *  (no slot / no target), so the caller can keep the pack open or refund the loose buy. */
function grantContent(run: RunState, kind: PackKind, contentId: string, targetCardId?: string): boolean {
  void targetCardId;
  if (kind === "relic") return grantJoker(run, contentId);
  if (kind === "tarot" || kind === "style" || kind === "spectral") return addHeld(run, contentId);
  // card: add a fresh card to the deck
  run.cardSeq += 1;
  run.deck.push(makeCardFromTemplate(contentId, run.cardSeq));
  run.deckBaseline += 1;
  run.notice = "Card added to your deck.";
  return true;
}

/** How far gold may go negative when buying — sum of Letter-of-Credit-style debt allowances. */
function creditLimit(run: RunState): number {
  return run.slots.reduce((a, id) => a + (jokerById(id)?.creditBonus ?? 0), 0);
}

/** Tarot & Spectral packs are opened over a "hand" — 8 cards drawn from the deck (Balatro's
 *  booster flow). Their consumables apply to that hand immediately (targeted tarots enchant a chosen
 *  card; hand-wide spectrals reshape the lot). On close the hand is folded back into the deck. */
function packDrawsHand(kind: PackKind): boolean {
  return kind === "tarot" || kind === "spectral";
}
/** Tarot/Spectral/Style packs apply their pick on the spot rather than dropping it into the pouch.
 *  Style (Drill) picks have no target — they level up the chosen fighting style immediately. */
function packPickApplies(kind: PackKind): boolean {
  return kind === "tarot" || kind === "spectral" || kind === "style";
}
function endPackHand(run: RunState): void {
  if (run.hand.length) {
    run.deck = [...run.hand, ...run.deck];
    run.hand = [];
  }
}

function doOpenPack(run: RunState, packId: string): void {
  const shop = run.shop!;
  const pack = shop.packs.find((p) => p.id === packId);
  if (!pack) return;
  const price = discountedPrice(pack.price, run.edicts);
  if (run.gold - price < -creditLimit(run)) {
    run.notice = "Not enough gold to open that pack.";
    return;
  }
  run.gold -= price;
  shop.packs = shop.packs.filter((p) => p.id !== packId);
  shop.openPack = pack; // enter the pick UI
  if (packDrawsHand(pack.kind)) {
    // Fold the player's leftover (post-combat) hand back into the deck FIRST so it isn't lost; then
    // ALWAYS deal a full 8-card hand for the modify-card pick to apply onto. If the draw pile is
    // short, top it up from the used/table piles so the surface is consistently 8 cards.
    run.deck = [...run.hand, ...run.deck];
    run.hand = [];
    const all = [...run.deck, ...run.discard, ...run.table];
    const n = Math.min(8, all.length);
    run.hand = all.slice(0, n);
    const taken = new Set(run.hand.map((c) => c.id));
    run.deck = run.deck.filter((c) => !taken.has(c.id));
    run.discard = run.discard.filter((c) => !taken.has(c.id));
    run.table = run.table.filter((c) => !taken.has(c.id));
  }
  run.notice = null;
}

function doPickPackContent(run: RunState, contentId: string, targetCardId?: string): void {
  const shop = run.shop!;
  const pack = shop.openPack;
  if (!pack || !pack.contentIds.includes(contentId)) return;
  // Modify-card/style picks apply on the spot (tarots+spectrals onto the drawn 8-hand; drills onto
  // the run's style levels). Card/Relic picks add to deck / guild via grantContent.
  let ok: boolean;
  if (packPickApplies(pack.kind)) {
    const t = tarotById(contentId);
    ok = t ? t.apply(run, targetCardId) : false;
  } else {
    ok = grantContent(run, pack.kind, contentId, targetCardId);
  }
  if (!ok) return; // couldn't apply (e.g. needs a target) — keep the pack open
  pack.contentIds.splice(pack.contentIds.indexOf(contentId), 1);
  pack.picksRemaining -= 1;
  if (pack.picksRemaining <= 0 || pack.contentIds.length === 0) {
    endPackHand(run);
    shop.openPack = null;
  }
}

function doClosePack(run: RunState): void {
  endPackHand(run); // fold the drawn fan back into the deck (no-op for non-hand packs)
  if (run.shop) run.shop.openPack = null; // abandon remaining picks (already paid for the pack)
}

function doBuyLoose(run: RunState, offerId: string, targetCardId?: string): void {
  const shop = run.shop!;
  const offer = shop.looseOffers.find((o) => o.id === offerId);
  if (!offer) return;
  const price = discountedPrice(offer.price, run.edicts);
  if (run.gold - price < -creditLimit(run)) {
    run.notice = "Not enough gold.";
    return;
  }
  if (!grantContent(run, offer.kind, offer.contentId, targetCardId)) return; // apply first, then charge
  run.gold -= price;
  shop.looseOffers = shop.looseOffers.filter((o) => o.id !== offerId);
}

function doRemoveCard(run: RunState, targetCardId: string): void {
  const shop = run.shop!;
  // One Remove per shop visit (Balatro pattern — the coin flips to its back once spent and the
  // player must wait until the next shop to remove another card).
  if (shop.removeSpent) {
    run.notice = "Remove already used this shop.";
    return;
  }
  const price = discountedPrice(shop.removeCardCost, run.edicts);
  if (run.gold - price < -creditLimit(run)) {
    run.notice = "Not enough gold to remove a card.";
    return;
  }
  const found = findCard(run, targetCardId);
  if (!found) {
    run.notice = "That card is not in your deck.";
    return;
  }
  found.pile.splice(found.idx, 1);
  run.gold -= price;
  run.removeUses += 1;
  run.deckBaseline -= 1;
  run.culledThisAct = (run.culledThisAct ?? 0) + 1; // Cull's Reward
  shop.removeCardCost = run.config.removeBase + run.removeUses * run.config.removeStep;
  shop.removeSpent = true;
  run.notice = "Card removed from your deck.";
}

/** Use a held tarot — in the shop OR mid-combat. */
function doUseHeld(run: RunState, instanceId: string, targetCardId?: string): void {
  const inst = run.held.find((h) => h.id === instanceId);
  if (!inst) return;
  const tarot = tarotById(inst.tarotId);
  if (!tarot) return;
  if (!tarot.apply(run, targetCardId)) return; // apply set a notice; keep the tarot
  run.held = run.held.filter((h) => h.id !== instanceId);
}

function doBuyEdict(run: RunState, offerId: string): void {
  const shop = run.shop!;
  if (!shop.edictOffers?.includes(offerId)) return;
  const edict = edictById(offerId);
  if (!edict) return;
  const price = discountedPrice(edict.price, run.edicts);
  if (run.gold - price < -creditLimit(run)) {
    run.notice = "Not enough gold.";
    return;
  }
  run.gold -= price;
  run.edicts = [...(run.edicts ?? []), offerId];
  const act = run.castle[run.enemyIndex]?.tier;
  if (act && !run.actEdictsTaken.includes(act)) run.actEdictsTaken.push(act); // one edict per Act
  shop.edictOffers = shop.edictOffers.filter((id) => id !== offerId);
  run.notice = `Edict enacted: ${edict.name}.`;
}

function doReroll(run: RunState): void {
  const shop = run.shop!;
  if (run.gold - shop.rerollCost < -creditLimit(run)) {
    run.notice = "Not enough gold to reroll.";
    return;
  }
  run.gold -= shop.rerollCost;
  const nextCost = shop.rerollCost + run.config.rerollStep;
  const nonce = run.fightsWon * 1000 + Math.round(run.rngState % 997);
  const rolled = rollShopV2(run.rngState, run, nextCost, nonce);
  run.rngState = rolled.state;
  run.shop = rolled.shop;
  // Reroll only refreshes the wares — the booster packs (and the per-Act edict) are preserved.
  run.shop.packs = shop.packs;
  run.shop.edictOffers = shop.edictOffers;
  run.notice = null;
}

function doEventChoice(run: RunState, optionId: string): void {
  const event = eventById(run.eventId);
  if (!event) return;
  const ok = event.apply(run, optionId);
  if (!ok) return; // couldn't afford / invalid — stay on the event (apply set a notice)
  run.eventId = null;
  run.phase = "combat";
  startFight(run); // the road's event done, the next royal's fight begins
  run.notice = null; // don't carry the event's story outcome into the combat screen as a toast
}

/** Top-level reducer. Pure: clones, then routes by phase. */
export function applyAction(run: RunState, action: Action): RunState {
  if (action.type === "newRun") return createRun(action.seed, action.deckId, action.stakeId);

  const draft: RunState = structuredClone(run);
  draft.notice = null;

  switch (action.type) {
    case "play":
      if (draft.phase === "combat" && draft.combat?.subphase === "play" && !draft.combat.outcome) {
        combatPlay(draft, action.cardIds, action.wildSuits); // sets combat.outcome on a kill; advance is deferred
      }
      break;
    case "yield":
      if (draft.phase === "combat" && draft.combat?.subphase === "play" && !draft.combat.outcome) combatYield(draft);
      break;
    case "discard":
      if (draft.phase === "combat" && draft.combat?.subphase === "defend" && !draft.combat.outcome)
        combatDiscard(draft, action.cardIds);
      break;
    case "advance":
      if (draft.phase === "combat" && draft.combat?.outcome === "won") {
        awardAndAdvance(draft, draft.combat.wonExact);
      } else if (draft.phase === "combat" && draft.combat?.outcome === "lost") {
        draft.phase = "lost";
      }
      break;
    case "sellJoker":
      doSellJoker(draft, action.jokerId);
      break;
    case "buyEdict":
      if (draft.phase === "shop") doBuyEdict(draft, action.offerId);
      break;
    case "openPack":
      if (draft.phase === "shop") doOpenPack(draft, action.packId);
      break;
    case "pickPackContent":
      if (draft.phase === "shop") doPickPackContent(draft, action.contentId, action.targetCardId);
      break;
    case "closePack":
      if (draft.phase === "shop") doClosePack(draft);
      break;
    case "buyLoose":
      if (draft.phase === "shop") doBuyLoose(draft, action.offerId, action.targetCardId);
      break;
    case "removeCard":
      if (draft.phase === "shop") doRemoveCard(draft, action.targetCardId);
      break;
    case "useHeld":
      // Held tarots are usable ONLY mid-combat (they target hand cards; the hand only exists in
      // combat). Shop/event/etc. are no-ops at the engine level too, not just in the UI.
      if (draft.phase === "combat") doUseHeld(draft, action.instanceId, action.targetCardId);
      break;
    case "reroll":
      if (draft.phase === "shop") doReroll(draft);
      break;
    case "nextFight":
      if (draft.phase === "shop") {
        draft.shop = null;
        draft.notice = null;
        if (EVENT_AT.has(draft.enemyIndex)) {
          // A Court Event interrupts the road to the next royal (run-structure variety).
          const r = rngInt(draft.rngState, EVENT_LIBRARY.length);
          draft.rngState = r.state;
          draft.eventId = EVENT_LIBRARY[r.value].id;
          draft.phase = "event";
        } else {
          draft.phase = "combat";
          startFight(draft); // fire onFightStart relics now the fight actually begins
        }
      }
      break;
    case "eventChoice":
      if (draft.phase === "event") doEventChoice(draft, action.optionId);
      break;
    case "debugDefeat":
      // Debug cheat: instantly fell the current royal (deferred-outcome flow → the Claim gate shows).
      if (draft.phase === "combat" && draft.combat && !draft.combat.outcome) {
        draft.combat.enemy.damageTaken = draft.combat.enemy.maxHealth;
        draft.combat.outcome = "won";
        draft.combat.wonExact = false;
      }
      break;
  }

  draft.log.push(action);
  return draft;
}

export { currentHandMax };
