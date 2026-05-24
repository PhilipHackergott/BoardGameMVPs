// Combat mechanics — Regicide's four steps, operating in place on a draft RunState (the
// orchestrator in run.ts clones before calling these, so the public API stays pure). The
// defeat -> gold/shop/win transition lives in run.ts; here we report defeat back to it.

import { deckById, decreeById, edictBonuses, jokerById, TAROT_LIBRARY } from "./content";
import { rngInt, shuffle } from "./rng";
import { cardSuits, resolvePlay } from "./resolution";
import { Card, Decree, Enemy, Joker, MAX_SLOTS, ModInfo, RunState, Suit, SuitUpgrades } from "./types";

export function activeJokers(run: RunState): Joker[] {
  return run.slots.map((id) => jokerById(id)).filter((j): j is Joker => !!j);
}

/** The royal's active decree(s) — a King may carry a second, stacked decree. */
export function enemyDecrees(enemy: Enemy): Decree[] {
  return [decreeById(enemy.decreeId), decreeById(enemy.decreeId2)].filter((d): d is Decree => !!d);
}

/** True if a guild member (Court Jester) nullifies the current royal's decrees this fight. */
export function decreesDisabled(run: RunState): boolean {
  return activeJokers(run).some((j) => j.disablesDecrees);
}

/** The decrees that actually apply right now — none while a Court Jester is in the guild. */
export function activeDecrees(run: RunState): Decree[] {
  return run.combat && !decreesDisabled(run) ? enemyDecrees(run.combat.enemy) : [];
}

export function currentHandMax(run: RunState): number {
  return (
    run.config.handMax +
    activeJokers(run).reduce((a, j) => a + (j.handMaxBonus ?? 0), 0) +
    edictBonuses(run.edicts).handMaxBonus
  );
}

/** The royal's attack right now, including any King enrage escalation (active once it has taken
 *  enrageAtPct of its health). Pure read of the enemy. */
export function effectiveAttack(enemy: Enemy): number {
  if (enemy.enrageAtPct != null && enemy.damageTaken >= enemy.maxHealth * enemy.enrageAtPct) {
    return enemy.attack + (enemy.enrageAttackBonus ?? 0);
  }
  return enemy.attack;
}

/** The damage the next counter-attack will deal: effective attack minus accumulated shield, unless
 *  a decree (the Executioner) cleaves through shield. */
export function counterIncoming(enemy: Enemy, decreesOff = false): number {
  const eff = effectiveAttack(enemy);
  if (!decreesOff && enemyDecrees(enemy).some((d) => d.ignoresShield)) return eff;
  return Math.max(0, eff - enemy.shield);
}

/** Aggregate joker-Edition bonuses (Spectral-applied): flat damage, a damage multiplier, +slots. */
export function editionBonuses(run: RunState): { flat: number; mult: number; slot: number } {
  const ed = run.slotEditions ?? {};
  let flat = 0,
    mult = 1,
    slot = 0;
  for (const id of run.slots) {
    const e = ed[id];
    if (e === "burnished") flat += 5;
    else if (e === "haloed") flat += 8;
    else if (e === "prismatic") mult *= 1.5;
    else if (e === "shadow") slot += 1;
  }
  return { flat, mult, slot };
}

/** Max guild slots, including relic (War Banner), edict (Conscription), deck-variant, and Edition
 *  (Shadow/Negative) bonuses. */
export function maxSlots(run: RunState): number {
  return Math.max(
    1,
    MAX_SLOTS +
      activeJokers(run).reduce((a, j) => a + (j.slotBonus ?? 0), 0) +
      edictBonuses(run.edicts).slotBonus +
      (deckById(run.deckId)?.slotBonus ?? 0) +
      editionBonuses(run).slot,
  );
}

/** Held consumable (tarot) inventory size, including relic, edict, and deck-variant bonuses. */
export function heldMax(run: RunState): number {
  return Math.max(
    0,
    run.config.heldBase +
      activeJokers(run).reduce((a, j) => a + (j.heldMaxBonus ?? 0), 0) +
      edictBonuses(run.edicts).heldMaxBonus +
      (deckById(run.deckId)?.heldBonus ?? 0),
  );
}

/** Suit upgrades including run-wide suit-boost relics (Heartsworn, etc. — replaces the old Train). */
export function effectiveSuitUpgrades(run: RunState): SuitUpgrades {
  const u: SuitUpgrades = { ...run.suitUpgrades };
  for (const j of activeJokers(run)) {
    if (!j.suitBoost) continue;
    for (const s of Object.keys(j.suitBoost) as Suit[]) u[s] += j.suitBoost[s] ?? 0;
  }
  return u;
}

/** The full incoming counter damage, including relic downsides (e.g. Reckless Charge). */
export function incomingDamage(run: RunState): number {
  const base = counterIncoming(run.combat!.enemy, decreesDisabled(run));
  const bonus = activeJokers(run).reduce((a, j) => a + (j.counterBonus ?? 0), 0);
  return Math.max(0, base + bonus);
}

/** Read-only snapshot of run scalars for scaling/conditional relic modifiers. */
export function buildModInfo(run: RunState): ModInfo {
  const ed = editionBonuses(run);
  const js = run.slots.map((id) => jokerById(id)).filter((j): j is Joker => !!j);
  return {
    fightsWon: run.fightsWon,
    gold: run.gold,
    enemyTier: run.combat!.enemy.tier,
    jokerCount: run.slots.length,
    editionFlat: ed.flat,
    editionMult: ed.mult,
    jokerState: run.jokerState,
    handCards: run.hand,
    emptySlots: Math.max(0, maxSlots(run) - run.slots.length),
    uncommonCount: js.filter((j) => j.rarity === "uncommon").length,
    totalSellValue: js.reduce((a, j) => a + j.sellValue, 0),
    swornRank: run.swornRank,
    discardsThisFight: run.discardsThisFight,
    culledThisAct: run.culledThisAct,
  };
}

/** Fire every relic's onFightStart hook against the current combat (e.g. Bottled Courage). */
export function startFight(run: RunState): void {
  if (!run.combat) return;
  run.discardsThisFight = 0;
  run.yieldedThisFight = false;
  const sr = rngInt(run.rngState, 9); // Sworn Number: a rank 2..10 chosen for this fight
  run.rngState = sr.state;
  run.swornRank = sr.value + 2;
  for (const j of activeJokers(run)) j.onFightStart?.(run);
  drawToFull(run); // every fight begins with a full hand (the deck persists across fights)
}

/** Top the hand up to the current max, reshuffling the used pile back into the deck if it runs low.
 *  Called at the start of each fight so the player always opens with a full hand. */
function drawToFull(run: RunState): void {
  let need = currentHandMax(run) - run.hand.length;
  if (need <= 0) return;
  if (run.deck.length < need && run.discard.length > 0) {
    const sh = shuffle([...run.deck, ...run.discard], run.rngState);
    run.rngState = sh.state;
    run.deck = sh.arr;
    run.discard = [];
  }
  need = Math.min(need, run.deck.length);
  if (need <= 0) return;
  run.hand = run.hand.concat(run.deck.slice(0, need));
  run.deck = run.deck.slice(need);
}

function handValue(hand: Card[]): number {
  return hand.reduce((a, c) => a + c.value, 0);
}

/** Hearts: shuffle the discard, place N cards face-down under (at the bottom of) the deck. */
function applyHeal(run: RunState, n: number): void {
  if (n <= 0 || run.discard.length === 0) return;
  const take = Math.min(n, run.discard.length);
  const sh = shuffle(run.discard, run.rngState);
  run.rngState = sh.state;
  const healed = sh.arr.slice(0, take);
  run.discard = sh.arr.slice(take);
  run.deck = run.deck.concat(healed); // bottom of the deck
}

/** Diamonds: draw N from the top of the deck, never exceeding the current max hand size. */
function applyDraw(run: RunState, n: number): void {
  const capacity = currentHandMax(run) - run.hand.length;
  const count = Math.min(n, capacity, run.deck.length);
  if (count <= 0) return;
  run.hand = run.hand.concat(run.deck.slice(0, count));
  run.deck = run.deck.slice(count);
}

export interface PlayOutcome {
  defeated: boolean;
  exact: boolean;
}

/** Step 1-3 for a play action. Returns whether the enemy was defeated (run.ts handles rewards). */
export function combatPlay(run: RunState, cardIds: string[], wildSuits?: Record<string, Suit>): PlayOutcome {
  const combat = run.combat!;
  const enemy = combat.enemy;
  const selected = cardIds
    .map((id) => run.hand.find((c) => c.id === id))
    .filter((c): c is Card => !!c);

  if (selected.length !== cardIds.length) {
    run.notice = "Card not in hand.";
    return { defeated: false, exact: false };
  }

  // The immunity "answer": a relic can permanently strip a royal's immunity to its own suit.
  if (activeJokers(run).some((j) => j.cancelsImmunity)) enemy.immunityCancelled = true;

  const decrees = activeDecrees(run);
  // Effective suits this play (printed suit + Wildcard choice + Extra-Suit), for decrees & records.
  const playedSuits = Array.from(new Set(selected.flatMap((c) => cardSuits(c, wildSuits?.[c.id]))));
  const res = resolvePlay(
    selected,
    enemy,
    activeJokers(run),
    effectiveSuitUpgrades(run),
    combat.firstAttackDone,
    (ctx, en) => {
      for (const d of decrees) d.resolve?.(ctx, en);
    },
    buildModInfo(run),
    wildSuits,
    run.styleLevels,
  );
  if (!res.valid) {
    run.notice = res.reason ?? "Invalid play.";
    return { defeated: false, exact: false };
  }

  // Decree veto(s) (anti-strategy, e.g. Paranoid Crown). Checked before anything commits.
  for (const d of decrees) {
    if (!d.forbids) continue;
    const reason = d.forbids(combat, playedSuits);
    if (reason) {
      run.notice = reason;
      return { defeated: false, exact: false };
    }
  }

  // Step 2 (red powers): Hearts heal BEFORE Diamonds draw, per the rules.
  applyHeal(run, res.heal);
  applyDraw(run, res.draw);

  // Move played cards from hand to the table (they go to discard only when the enemy dies).
  const ids = new Set(selected.map((c) => c.id));
  run.hand = run.hand.filter((c) => !ids.has(c.id));
  run.table = run.table.concat(selected);

  // Black powers / Step 3.
  enemy.shield += res.shield;
  enemy.damageTaken += res.damage;
  if (res.goldDelta) {
    run.gold += res.goldDelta; // gilded sigils etc.
    run.goldEarned += res.goldDelta;
  }
  combat.firstAttackDone = true;
  combat.yieldedLastTurn = false;
  // Record this turn's suits for any "no repeating a suit" decree (Paranoid Crown).
  combat.lastSuits = playedSuits;
  run.notice = null;

  // Joker post-play hooks — scaling jokers (Veteran's Instinct, Grindstone) accumulate here.
  {
    const nums = selected.filter((c) => c.kind === "number");
    const isComboPlay = nums.length >= 2 && nums.every((c) => c.value === nums[0].value);
    for (const j of activeJokers(run)) j.onPlay?.(run, { cards: selected, isCombo: isComboPlay });
  }

  if (enemy.damageTaken >= enemy.maxHealth) {
    const exact = enemy.damageTaken === enemy.maxHealth;
    // Defer the reward/advance until the player hits Continue (combat screen keeps the felled royal).
    combat.outcome = "won";
    combat.wonExact = exact;
    return { defeated: true, exact };
  }

  // Decree after-play hooks on a surviving royal (e.g. the Headsman / Mad King lop a card).
  for (const d of decrees) d.onPlayResolved?.(run);

  // Step 4 setup: suffer the counter-attack (reduced by accumulated shield).
  enterDefend(run);
  return { defeated: false, exact: false };
}

/** Yield: skip Steps 2-3, go straight to Step 4. */
export function combatYield(run: RunState): void {
  const combat = run.combat!;
  if (combat.yieldedLastTurn) {
    run.notice = "You cannot yield twice in a row.";
    return;
  }
  combat.yieldedLastTurn = true;
  combat.lastSuits = []; // a yield plays no suit, so the suit-lock clears
  run.yieldedThisFight = true;
  for (const j of activeJokers(run)) j.onYield?.(run); // streak resets (Bloodthirst / Momentum)
  run.notice = null;
  enterDefend(run);
}

function enterDefend(run: RunState): void {
  const combat = run.combat!;
  const incoming = incomingDamage(run); // reads the current shield (so this strike is reduced)
  // Block is spent absorbing this strike — reduce it by the effective attack it soaked (partial
  // blocks leave the remainder; an ignore-shield decree bypasses without consuming it).
  const shieldIgnored = !decreesDisabled(run) && enemyDecrees(combat.enemy).some((d) => d.ignoresShield);
  if (!shieldIgnored && combat.enemy.shield > 0) {
    combat.enemy.shield = Math.max(0, combat.enemy.shield - effectiveAttack(combat.enemy));
  }
  if (incoming === 0) {
    // Fully shielded: no damage to suffer, start the next turn.
    beginPlayTurn(run);
    return;
  }
  combat.incoming = incoming;
  if (handValue(run.hand) < incoming) {
    // Last Stand (Mr. Bones): once per run, a survive-lethal guild member shatters to save you.
    const lsId = run.slots.find((id) => jokerById(id)?.survivesLethal);
    if (lsId && !run.lastStandUsed) {
      run.lastStandUsed = true;
      run.slots = run.slots.filter((id) => id !== lsId);
      run.notice = `${jokerById(lsId)?.name ?? "A guild member"} shatters to save you from the blow!`;
      beginPlayTurn(run);
      return;
    }
    // Cannot possibly cover the blow -> deferred loss (the strike still animates, then a gate).
    combat.outcome = "lost";
    run.notice = `The ${combat.enemy.tier} struck for ${incoming} — you could not cover it.`;
    return;
  }
  combat.subphase = "defend";
}

/** Step 4 resolution: discard chosen cards (>= incoming) to suffer the damage. */
export function combatDiscard(run: RunState, cardIds: string[]): void {
  const combat = run.combat!;
  if (combat.subphase !== "defend") {
    run.notice = "Nothing to defend against right now.";
    return;
  }
  const selected = cardIds
    .map((id) => run.hand.find((c) => c.id === id))
    .filter((c): c is Card => !!c);
  const total = selected.reduce((a, c) => a + c.value, 0);
  if (total < combat.incoming) {
    run.notice = `Discard at least ${combat.incoming} (selected ${total}).`;
    return;
  }
  const ids = new Set(selected.map((c) => c.id));
  run.hand = run.hand.filter((c) => !ids.has(c.id));
  run.discard = run.discard.concat(selected);
  run.discardsThisFight = (run.discardsThisFight ?? 0) + selected.length; // Executioner's Tally
  run.notice = null;
  // Purple Seals: each purple-sealed card discarded conjures a Tarot into the pouch (if room).
  for (const c of selected) {
    if (c.seal === "purple" && run.held.length < heldMax(run)) {
      const r = rngInt(run.rngState, TAROT_LIBRARY.length);
      run.rngState = r.state;
      run.cardSeq += 1;
      run.held.push({ id: `held-${run.cardSeq}`, tarotId: TAROT_LIBRARY[r.value].id });
    }
  }
  // Hooks fired once the royal's blow connects: decrees first (e.g. Vampire King self-heals),
  // then relics (e.g. Spiked Aegis reflects damage back).
  const enemyHit = combat.enemy;
  for (const d of enemyDecrees(enemyHit)) d.onCounterResolved?.(run, combat.incoming);
  for (const j of activeJokers(run)) j.onCounterResolved?.(run, combat.incoming);
  // Reflected/punishing damage can itself finish the royal.
  if (enemyHit.damageTaken >= enemyHit.maxHealth) {
    combat.outcome = "won";
    combat.wonExact = enemyHit.damageTaken === enemyHit.maxHealth;
    return;
  }
  beginPlayTurn(run);
}

function beginPlayTurn(run: RunState): void {
  const combat = run.combat!;
  combat.subphase = "play";
  combat.incoming = 0;
  // No legal action available -> deferred loss.
  if (run.hand.length === 0 && combat.yieldedLastTurn) {
    combat.outcome = "lost";
    run.notice = "No cards to play, and you cannot yield again.";
  }
}
