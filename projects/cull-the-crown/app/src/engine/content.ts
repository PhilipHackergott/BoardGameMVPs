// The joker & consumable library, expressed as data so the content set can grow without
// touching the engine. Resolution-time jokers carry a pure `modify(ctx)`; economy/combat
// jokers carry plain flags read by run.ts / combat.ts.

import { rngInt } from "./rng";
import {
  Card,
  CombatState,
  Decree,
  DeckDef,
  EditionId,
  Edict,
  Enemy,
  FIGHTING_STYLE_IDS,
  FIGHTING_STYLE_NAME,
  GameEvent,
  Joker,
  LooseOffer,
  PackKind,
  PackOffer,
  PackSize,
  Rarity,
  ResContext,
  RunState,
  SealId,
  ShopState,
  SigilId,
  StakeMods,
  Suit,
  SUITS,
  SUIT_NAME,
  Tarot,
} from "./types";

const RARITY_WEIGHT: Record<Rarity, number> = { common: 3, uncommon: 2, rare: 1 };

// How many played cards bear a given suit (printed or via the Twin-Suit sigil) — for the suit
// specialist jokers ("each ♥ you play …"). Jesters carry no suit.
const countSuit = (ctx: ResContext, s: Suit): number =>
  ctx.cards.filter((c) => c.kind !== "jester" && (c.suit === s || c.extraSuit === s)).length;
// How many played cards satisfy a value predicate (number/companion cards).
const countVal = (ctx: ResContext, pred: (v: number) => boolean): number =>
  ctx.cards.filter((c) => c.kind !== "jester" && pred(c.value)).length;

export const JOKER_LIBRARY: Joker[] = [
  {
    id: "bloodstained-shield",
    name: "Bloodstained Shield",
    art: "shield",
    rarity: "uncommon",
    text: "Spades also deal bonus damage equal to the shield they provide.",
    price: 6,
    sellValue: 3,
    modify: (ctx: ResContext) => {
      if (ctx.spadeActive && ctx.shield > 0) {
        ctx.damage += ctx.shield;
        ctx.trace.push(`Bloodstained Shield: +${ctx.shield} damage from shield.`);
      }
    },
  },
  {
    id: "opportunist",
    name: "The Opportunist",
    art: "dagger",
    rarity: "uncommon",
    text: "When you play Clubs as part of a multi-card combo, they trigger an extra time.",
    price: 6,
    sellValue: 3,
    modify: (ctx: ResContext) => {
      if (ctx.isCombo && ctx.clubActive) {
        ctx.damage += ctx.value;
        ctx.trace.push(`The Opportunist: Clubs trigger again, +${ctx.value} damage.`);
      }
    },
  },
  {
    id: "field-medic",
    name: "Field Medic",
    art: "medic",
    rarity: "common",
    text: "Hearts heal +2.",
    price: 4,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.heartActive) {
        ctx.heal += 2;
        ctx.trace.push("Field Medic: +2 heal.");
      }
    },
  },
  {
    id: "duelist",
    name: "Duelist",
    art: "swords",
    rarity: "uncommon",
    text: "The first attack each fight deals double damage.",
    price: 6,
    sellValue: 3,
    modify: (ctx: ResContext) => {
      if (!ctx.firstAttackDone && ctx.damage > 0) {
        ctx.damage *= 2;
        ctx.trace.push("Duelist: first attack doubled.");
      }
    },
  },
  {
    id: "quartermaster",
    name: "Quartermaster",
    art: "satchel",
    rarity: "common",
    text: "+1 maximum hand size.",
    price: 5,
    sellValue: 2,
    handMaxBonus: 1,
  },
  {
    id: "tithe-collector",
    name: "Tithe Collector",
    art: "pouch",
    rarity: "common",
    text: "+2 gold after every fight.",
    price: 5,
    sellValue: 2,
    goldPerFight: 2,
  },
  {
    id: "sapper",
    name: "Sapper",
    art: "bomb",
    rarity: "common",
    text: "Exact-kill gold multiplier +1.",
    price: 5,
    sellValue: 2,
    exactKillMultBonus: 1,
  },
  {
    id: "usurpers-sigil",
    name: "Usurper's Sigil",
    art: "dagger",
    rarity: "rare",
    text: "Your claim shatters every crown — royals are no longer immune to their own suit.",
    price: 7,
    sellValue: 3,
    cancelsImmunity: true,
  },
  // ─── P3 relics: downsides, scalers, and archetype synergies ───
  {
    id: "glass-cannon",
    name: "Glass Cannon",
    art: "swords",
    rarity: "rare",
    text: "All your damage is increased by half — but your maximum hand size is reduced by 2.",
    price: 7,
    sellValue: 3,
    handMaxBonus: -2,
    modify: (ctx: ResContext) => {
      if (ctx.damage > 0) {
        const bonus = Math.round(ctx.damage * 0.5);
        ctx.damage += bonus;
        ctx.trace.push(`Glass Cannon: +${bonus} damage (×1.5).`);
      }
    },
  },
  {
    id: "reckless-charge",
    name: "Reckless Charge",
    art: "dagger",
    rarity: "uncommon",
    text: "Every attack deals +5 damage — but every counter-attack hits you for 3 more.",
    price: 5,
    sellValue: 2,
    counterBonus: 3,
    modify: (ctx: ResContext) => {
      if (ctx.damage > 0) {
        ctx.damage += 5;
        ctx.trace.push("Reckless Charge: +5 damage.");
      }
    },
  },
  {
    id: "twin-daggers",
    name: "Twin Daggers",
    art: "dagger",
    rarity: "uncommon",
    text: "Combos (two or more cards) deal +3 damage.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.isCombo && ctx.damage > 0) {
        ctx.damage += 3;
        ctx.trace.push("Twin Daggers: +3 combo damage.");
      }
    },
  },
  {
    id: "whetstone",
    name: "Whetstone",
    art: "swords",
    rarity: "uncommon",
    text: "Your attacks deal +1 damage for every royal you have already felled.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext, info?) => {
      if (info && info.fightsWon > 0 && ctx.damage > 0) {
        ctx.damage += info.fightsWon;
        ctx.trace.push(`Whetstone: +${info.fightsWon} damage (royals felled).`);
      }
    },
  },
  {
    id: "spiked-aegis",
    name: "Spiked Aegis",
    art: "shield",
    rarity: "uncommon",
    text: "When a royal's counter-attack lands, half of it is dealt straight back to the royal.",
    price: 6,
    sellValue: 3,
    onCounterResolved: (run: RunState, incoming: number) => {
      const enemy = run.combat?.enemy;
      if (!enemy || incoming <= 0) return;
      const reflect = Math.floor(incoming / 2);
      if (reflect > 0) {
        enemy.damageTaken += reflect;
        run.notice = `Spiked Aegis reflects ${reflect} back at the royal.`;
      }
    },
  },
  {
    id: "bottled-courage",
    name: "Bottled Courage",
    art: "shield",
    rarity: "uncommon",
    text: "Begin every fight with 5 shield already raised.",
    price: 5,
    sellValue: 2,
    onFightStart: (run: RunState) => {
      if (run.combat) run.combat.enemy.shield += 5;
    },
  },
  {
    id: "war-banner",
    name: "War Banner",
    art: "swords",
    rarity: "rare",
    text: "Raise a sixth banner — you gain one extra guild slot.",
    price: 7,
    sellValue: 3,
    slotBonus: 1,
  },
  {
    id: "reapers-toll",
    name: "Reaper's Toll",
    art: "pouch",
    rarity: "uncommon",
    text: "Each royal you fell permanently raises your interest cap by 1.",
    price: 5,
    sellValue: 2,
    onRoyalFelled: (run: RunState) => {
      run.config.interestCap += 1;
    },
  },
  // Run-wide suit-power boosts (replace the old "Train a suit" consumable).
  {
    id: "heartsworn",
    name: "Heartsworn Oath",
    art: "medic",
    rarity: "uncommon",
    text: "Hearts heal +2 for the rest of the run.",
    price: 6,
    sellValue: 3,
    suitBoost: { H: 2 },
  },
  {
    id: "diamond-crown",
    name: "Diamond Crown",
    art: "satchel",
    rarity: "uncommon",
    text: "Diamonds draw +1 for the rest of the run.",
    price: 6,
    sellValue: 3,
    suitBoost: { D: 1 },
  },
  {
    id: "clubmaster",
    name: "Clubmaster's Mark",
    art: "swords",
    rarity: "uncommon",
    text: "Clubs add +2 flat damage for the rest of the run.",
    price: 6,
    sellValue: 3,
    suitBoost: { C: 2 },
  },
  {
    id: "spadesworn",
    name: "Spadesworn Vow",
    art: "shield",
    rarity: "uncommon",
    text: "Spades shield +2 for the rest of the run.",
    price: 6,
    sellValue: 3,
    suitBoost: { S: 2 },
  },
  // ── §A: suit specialists — per card of a suit you play (see JOKER-ADAPTATIONS.md) ──
  {
    id: "bloodletter", name: "Bloodletter", art: "medic", rarity: "common", price: 5, sellValue: 2,
    text: "Each ♥ Heart you play heals an extra +2.",
    modify: (ctx: ResContext) => { if (ctx.heartActive) { const n = countSuit(ctx, "H"); if (n) { ctx.heal += 2 * n; ctx.trace.push(`Bloodletter: +${2 * n} heal.`); } } },
  },
  {
    id: "prospector", name: "Prospector", art: "pouch", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Each ♦ Diamond you play earns +1 gold.",
    modify: (ctx: ResContext) => { const n = countSuit(ctx, "D"); if (n) { ctx.goldDelta += n; ctx.trace.push(`Prospector: +${n} gold.`); } },
  },
  {
    id: "headsmans-pride", name: "Headsman's Pride", art: "swords", rarity: "common", price: 5, sellValue: 2,
    text: "Each ♠ Spade you play deals +3 damage.",
    modify: (ctx: ResContext) => { const n = countSuit(ctx, "S"); if (n && ctx.damage > 0) { ctx.damage += 3 * n; ctx.trace.push(`Headsman's Pride: +${3 * n} damage.`); } },
  },
  {
    id: "bludgeon", name: "Bludgeon", art: "bomb", rarity: "common", price: 5, sellValue: 2,
    text: "Each ♣ Club you play deals +4 damage.",
    modify: (ctx: ResContext) => { const n = countSuit(ctx, "C"); if (n && ctx.damage > 0) { ctx.damage += 4 * n; ctx.trace.push(`Bludgeon: +${4 * n} damage.`); } },
  },
  {
    id: "wardens-eye", name: "Warden's Eye", art: "shield", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Each ♠ Spade you play also grants +2 shield.",
    modify: (ctx: ResContext) => { if (ctx.spadeActive) { const n = countSuit(ctx, "S"); if (n) { ctx.shield += 2 * n; ctx.trace.push(`Warden's Eye: +${2 * n} shield.`); } } },
  },
  // ── §B: combo jokers — of-a-kind plays ──
  {
    id: "twin-blades", name: "Twin Blades", art: "dagger", rarity: "uncommon", price: 5, sellValue: 2,
    text: "Combos of exactly 2 cards deal +6 damage.",
    modify: (ctx: ResContext) => { if (ctx.comboCount === 2 && ctx.damage > 0) { ctx.damage += 6; ctx.trace.push("Twin Blades: +6 (pair)."); } },
  },
  {
    id: "triumvirate", name: "Triumvirate", art: "swords", rarity: "rare", price: 8, sellValue: 4,
    text: "Combos of exactly 3 cards deal double damage.",
    modify: (ctx: ResContext) => { if (ctx.comboCount === 3 && ctx.damage > 0) { ctx.damage *= 2; ctx.trace.push("Triumvirate: ×2 (three of a kind)."); } },
  },
  {
    id: "the-phalanx", name: "The Phalanx", art: "shield", rarity: "rare", price: 9, sellValue: 4,
    text: "Combos of exactly 4 cards deal triple damage.",
    modify: (ctx: ResContext) => { if (ctx.comboCount === 4 && ctx.damage > 0) { ctx.damage *= 3; ctx.trace.push("The Phalanx: ×3 (four of a kind)."); } },
  },
  {
    id: "lightfoot", name: "Lightfoot", art: "dagger", rarity: "common", price: 5, sellValue: 2,
    text: "Plays of 3 or fewer cards deal +5 damage.",
    modify: (ctx: ResContext) => { if (ctx.cards.length <= 3 && !ctx.jesterPlayed && ctx.damage > 0) { ctx.damage += 5; ctx.trace.push("Lightfoot: +5 (small play)."); } },
  },
  // ── §C: rank & companion jokers ──
  {
    id: "even-hand", name: "Even Hand", art: "anvil", rarity: "common", price: 5, sellValue: 2,
    text: "Each even-rank card (2/4/6/8/10) deals +4 damage.",
    modify: (ctx: ResContext) => { const n = countVal(ctx, (v) => v >= 2 && v % 2 === 0); if (n && ctx.damage > 0) { ctx.damage += 4 * n; ctx.trace.push(`Even Hand: +${4 * n} damage.`); } },
  },
  {
    id: "odd-omen", name: "Odd Omen", art: "shield", rarity: "common", price: 5, sellValue: 2,
    text: "Each odd-rank card (3/5/7/9) grants +4 shield.",
    modify: (ctx: ResContext) => { const n = countVal(ctx, (v) => v >= 3 && v % 2 === 1); if (n) { ctx.shield += 4 * n; ctx.trace.push(`Odd Omen: +${4 * n} shield.`); } },
  },
  {
    id: "beastmaster", name: "Beastmaster", art: "satchel", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Animal Companion plays draw +2 and deal +3.",
    modify: (ctx: ResContext) => { if (ctx.mounted) { ctx.draw += 2; if (ctx.damage > 0) ctx.damage += 3; ctx.trace.push("Beastmaster: +3 damage, +2 draw."); } },
  },
  {
    id: "spiral-friar", name: "Spiral Friar", art: "scroll", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Cards of value 1, 2, 3, 5, or 8 deal +5 damage each.",
    modify: (ctx: ResContext) => { const fib = new Set([1, 2, 3, 5, 8]); const n = countVal(ctx, (v) => fib.has(v)); if (n && ctx.damage > 0) { ctx.damage += 5 * n; ctx.trace.push(`Spiral Friar: +${5 * n} damage.`); } },
  },
  {
    id: "drillmaster", name: "Drillmaster", art: "swords", rarity: "common", price: 5, sellValue: 2,
    text: "Each 10 or 4 you play deals +5 damage and draws +1.",
    modify: (ctx: ResContext) => { const n = countVal(ctx, (v) => v === 10 || v === 4); if (n) { if (ctx.damage > 0) ctx.damage += 5 * n; ctx.draw += n; ctx.trace.push(`Drillmaster: +${5 * n} damage, +${n} draw.`); } },
  },
  // ── §F: economy jokers ──
  {
    id: "war-chest", name: "War Chest", art: "pouch", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+1 damage for every 5 gold you hold.",
    modify: (ctx: ResContext, info?) => { const b = info ? Math.floor(info.gold / 5) : 0; if (b && ctx.damage > 0) { ctx.damage += b; ctx.trace.push(`War Chest: +${b} damage (gold).`); } },
  },
  {
    id: "bootstraps", name: "Bootstraps", art: "satchel", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+2 damage for every 5 gold you hold.",
    modify: (ctx: ResContext, info?) => { const b = info ? 2 * Math.floor(info.gold / 5) : 0; if (b && ctx.damage > 0) { ctx.damage += b; ctx.trace.push(`Bootstraps: +${b} damage (gold).`); } },
  },
  {
    id: "tithe-barn", name: "Tithe Barn", art: "pouch", rarity: "common", price: 5, sellValue: 2,
    text: "When a royal falls, earn +1 gold per ♦ Diamond in your deck.",
    onRoyalFelled: (run: RunState) => { const n = run.deck.filter((c) => c.suit === "D" || c.extraSuit === "D").length; if (n) { run.gold += n; run.goldEarned += n; } },
  },
  {
    id: "letter-of-credit", name: "Letter of Credit", art: "scroll", rarity: "common", price: 5, sellValue: 2,
    text: "You may go up to 10 gold in debt when buying.",
    creditBonus: 10,
  },
  // ── §H: meta jokers ──
  {
    id: "war-council", name: "War Council", art: "swords", rarity: "common", price: 5, sellValue: 2,
    text: "+3 damage for each guild member you own.",
    modify: (ctx: ResContext, info?) => { const n = info?.jokerCount ?? 0; if (n && ctx.damage > 0) { ctx.damage += 3 * n; ctx.trace.push(`War Council: +${3 * n} damage.`); } },
  },
  {
    id: "court-jester", name: "Court Jester", art: "jester", rarity: "rare", price: 8, sellValue: 4,
    text: "The current royal's decree(s) do nothing while this joker is in your guild.",
    disablesDecrees: true,
  },
  {
    id: "mirror-knight", name: "Mirror Knight", art: "shield", rarity: "rare", price: 8, sellValue: 4,
    text: "Also applies the ability of the guild member to its right.",
    copiesNeighbor: "right",
  },
  {
    id: "echo-squire", name: "Echo Squire", art: "swords", rarity: "rare", price: 8, sellValue: 4,
    text: "Also applies the ability of the guild member to its left.",
    copiesNeighbor: "left",
  },
  // ── §I: utility ──
  {
    id: "squires-pack", name: "Squire's Pack", art: "satchel", rarity: "common", price: 5, sellValue: 2,
    text: "+1 maximum hand size.",
    handMaxBonus: 1,
  },
  {
    id: "soothsayer", name: "Soothsayer", art: "scroll", rarity: "uncommon", price: 6, sellValue: 3,
    text: "At the start of each fight, conjure a random Tarot into your pouch (if room).",
    onFightStart: (run: RunState) => { pushHeld(run, randomTarotId(run)); },
  },
  {
    id: "conscriptor", name: "Conscriptor", art: "swords", rarity: "uncommon", price: 6, sellValue: 3,
    text: "At the start of each fight, a random joker joins your guild (if you have a free slot).",
    onFightStart: (run: RunState) => { if (run.slots.length < 5 + edictBonuses(run.edicts).slotBonus) grantRandomRelic(run, "Conscripted:"); },
  },
  // ── §D: held-in-hand jokers (read your remaining hand via info.handCards) ──
  {
    id: "cowards-gambit", name: "Coward's Gambit", art: "dagger", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Adds double the value of your lowest card still in hand to your damage.",
    modify: (ctx: ResContext, info?) => {
      const held = (info?.handCards ?? []).filter((c) => c.kind !== "jester" && !ctx.cards.some((p) => p.id === c.id));
      if (held.length && ctx.damage > 0) {
        const lo = Math.min(...held.map((c) => c.value)) * 2;
        ctx.damage += lo;
        ctx.trace.push(`Coward's Gambit: +${lo} (2× lowest held).`);
      }
    },
  },
  {
    id: "black-banner", name: "Black Banner", art: "shield", rarity: "rare", price: 8, sellValue: 4,
    text: "×3 damage while every card still in your hand is a ♠ Spade or ♣ Club.",
    modify: (ctx: ResContext, info?) => {
      const held = (info?.handCards ?? []).filter((c) => c.kind !== "jester" && !ctx.cards.some((p) => p.id === c.id));
      if (held.length && held.every((c) => c.suit === "S" || c.suit === "C") && ctx.damage > 0) {
        ctx.damage *= 3;
        ctx.trace.push("Black Banner: ×3 (hand is all Spades/Clubs).");
      }
    },
  },
  {
    id: "hoarders-grip", name: "Hoarder's Grip", art: "satchel", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+2 shield for each card left in your hand when you strike.",
    modify: (ctx: ResContext, info?) => {
      const held = (info?.handCards ?? []).filter((c) => !ctx.cards.some((p) => p.id === c.id));
      if (held.length) {
        ctx.shield += 2 * held.length;
        ctx.trace.push(`Hoarder's Grip: +${2 * held.length} shield.`);
      }
    },
  },
  // ── §G: scaling jokers (accumulate on run.jokerState via onPlay) ──
  {
    id: "veterans-instinct", name: "Veteran's Instinct", art: "swords", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Gains +2 damage permanently each time you play a combo.",
    modify: (ctx: ResContext, info?) => {
      const b = info?.jokerState?.["veterans-instinct"] ?? 0;
      if (b && ctx.damage > 0) {
        ctx.damage += b;
        ctx.trace.push(`Veteran's Instinct: +${b} damage.`);
      }
    },
    onPlay: (run: RunState, p) => {
      if (p.isCombo) {
        run.jokerState = run.jokerState ?? {};
        run.jokerState["veterans-instinct"] = (run.jokerState["veterans-instinct"] ?? 0) + 2;
      }
    },
  },
  {
    id: "grindstone", name: "Grindstone", art: "anvil", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Every card you play permanently sharpens this joker (+1 damage each).",
    modify: (ctx: ResContext, info?) => {
      const b = info?.jokerState?.["grindstone"] ?? 0;
      if (b && ctx.damage > 0) {
        ctx.damage += b;
        ctx.trace.push(`Grindstone: +${b} damage.`);
      }
    },
    onPlay: (run: RunState, p) => {
      const n = p.cards.filter((c) => c.kind !== "jester").length;
      run.jokerState = run.jokerState ?? {};
      run.jokerState["grindstone"] = (run.jokerState["grindstone"] ?? 0) + n;
    },
  },
  {
    id: "the-glutton", name: "The Glutton", art: "bomb", rarity: "common", price: 5, sellValue: 2,
    text: "+15 damage — but a 1-in-6 chance to spoil (be destroyed) at each fight's end.",
    modify: (ctx: ResContext) => {
      if (ctx.damage > 0) {
        ctx.damage += 15;
        ctx.trace.push("The Glutton: +15 damage.");
      }
    },
    onRoyalFelled: (run: RunState) => {
      const r = rngInt(run.rngState, 6);
      run.rngState = r.state;
      if (r.value === 0) {
        run.slots = run.slots.filter((id) => id !== "the-glutton");
        run.notice = "The Glutton has spoiled — destroyed.";
      }
    },
  },
  // ── §E: retrigger ──
  {
    id: "the-encore", name: "The Encore", art: "jester", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Every 6th play triggers its suit powers twice.",
    modify: (ctx: ResContext, info?) => {
      if (((info?.jokerState?.["the-encore"] ?? 0) + 1) % 6 === 0) {
        if (ctx.heartActive) ctx.heal *= 2;
        if (ctx.diamondActive) ctx.draw *= 2;
        if (ctx.spadeActive) ctx.shield *= 2;
        if (ctx.clubActive) ctx.damage *= 2;
        ctx.trace.push("The Encore: 6th play doubled!");
      }
    },
    onPlay: (run: RunState) => {
      run.jokerState = run.jokerState ?? {};
      run.jokerState["the-encore"] = (run.jokerState["the-encore"] ?? 0) + 1;
    },
  },
  {
    id: "echo-herald", name: "Echo Herald", art: "medic", rarity: "rare", price: 8, sellValue: 4,
    text: "Your first play each fight triggers its suit powers twice.",
    modify: (ctx: ResContext) => {
      if (!ctx.firstAttackDone) {
        if (ctx.heartActive) ctx.heal *= 2;
        if (ctx.diamondActive) ctx.draw *= 2;
        if (ctx.spadeActive) ctx.shield *= 2;
        if (ctx.clubActive) ctx.damage *= 2;
        ctx.trace.push("Echo Herald: first play's suit powers doubled.");
      }
    },
  },
  // ── Remaining design jokers (rank/scaling/meta/economy) using the new engine hooks ──
  {
    id: "sworn-number", name: "Sworn Number", art: "anvil", rarity: "uncommon", price: 6, sellValue: 3,
    text: "One rank — rerolled each fight — deals double damage.",
    modify: (ctx: ResContext, info?) => { if (info?.swornRank && ctx.cards.some((c) => c.value === info.swornRank) && ctx.damage > 0) { ctx.damage *= 2; ctx.trace.push(`Sworn Number: ×2 (rank ${info.swornRank}).`); } },
  },
  {
    id: "cutpurse", name: "Cutpurse", art: "dagger", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Each low card (value 2-5) you play deals +3 damage.",
    modify: (ctx: ResContext) => { const n = countVal(ctx, (v) => v >= 2 && v <= 5); if (n && ctx.damage > 0) { ctx.damage += 3 * n; ctx.trace.push(`Cutpurse: +${3 * n} damage.`); } },
  },
  {
    id: "sanguine-pact", name: "Sanguine Pact", art: "medic", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Hearts heal half again as much.",
    modify: (ctx: ResContext) => { if (ctx.heartActive && ctx.heal > 0) { ctx.heal = Math.round(ctx.heal * 1.5); ctx.trace.push("Sanguine Pact: ×1.5 heal."); } },
  },
  {
    id: "lone-wolf", name: "Lone Wolf", art: "swords", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+50% damage for each empty guild slot.",
    modify: (ctx: ResContext, info?) => { const e = info?.emptySlots ?? 0; if (e && ctx.damage > 0) { ctx.damage = Math.round(ctx.damage * (1 + 0.5 * e)); ctx.trace.push(`Lone Wolf: ×${(1 + 0.5 * e).toFixed(2)}.`); } },
  },
  {
    id: "banneret", name: "Banneret", art: "swords", rarity: "rare", price: 8, sellValue: 4,
    text: "Each Uncommon guild member grants +25% damage.",
    modify: (ctx: ResContext, info?) => { const u = info?.uncommonCount ?? 0; if (u && ctx.damage > 0) { ctx.damage = Math.round(ctx.damage * (1 + 0.25 * u)); ctx.trace.push(`Banneret: ×${(1 + 0.25 * u).toFixed(2)}.`); } },
  },
  {
    id: "quartermasters-ledger", name: "Quartermaster's Ledger", art: "pouch", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Adds the total sell value of your other guild members to your damage.",
    modify: (ctx: ResContext, info?) => { const b = Math.max(0, (info?.totalSellValue ?? 0) - 3); if (b && ctx.damage > 0) { ctx.damage += b; ctx.trace.push(`Quartermaster's Ledger: +${b} damage.`); } },
  },
  {
    id: "culls-reward", name: "Cull's Reward", art: "knife", rarity: "rare", price: 8, sellValue: 4,
    text: "+25% damage per card removed this Act (resets each Act).",
    modify: (ctx: ResContext, info?) => { const n = info?.culledThisAct ?? 0; if (n && ctx.damage > 0) { ctx.damage = Math.round(ctx.damage * (1 + 0.25 * n)); ctx.trace.push(`Cull's Reward: ×${(1 + 0.25 * n).toFixed(2)}.`); } },
  },
  {
    id: "executioners-tally", name: "Executioner's Tally", art: "knife", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+50% damage per card discarded to block this fight.",
    modify: (ctx: ResContext, info?) => { const n = info?.discardsThisFight ?? 0; if (n && ctx.damage > 0) { ctx.damage = Math.round(ctx.damage * (1 + 0.5 * n)); ctx.trace.push(`Executioner's Tally: ×${(1 + 0.5 * n).toFixed(2)}.`); } },
  },
  {
    id: "bloodthirst", name: "Bloodthirst", art: "dagger", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+1 damage per fight cleared without yielding; resets when you yield.",
    modify: (ctx: ResContext, info?) => { const b = info?.jokerState?.["bloodthirst"] ?? 0; if (b && ctx.damage > 0) { ctx.damage += b; ctx.trace.push(`Bloodthirst: +${b} damage.`); } },
    onRoyalFelled: (run: RunState) => { if (!run.yieldedThisFight) { run.jokerState = run.jokerState ?? {}; run.jokerState["bloodthirst"] = (run.jokerState["bloodthirst"] ?? 0) + 1; } },
    onYield: (run: RunState) => { if (run.jokerState) run.jokerState["bloodthirst"] = 0; },
  },
  {
    id: "momentum", name: "Momentum", art: "swords", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+1 damage per card played this run; lose 5 when you yield.",
    modify: (ctx: ResContext, info?) => { const b = info?.jokerState?.["momentum"] ?? 0; if (b && ctx.damage > 0) { ctx.damage += b; ctx.trace.push(`Momentum: +${b} damage.`); } },
    onPlay: (run: RunState, p) => { const n = p.cards.filter((c) => c.kind !== "jester").length; run.jokerState = run.jokerState ?? {}; run.jokerState["momentum"] = (run.jokerState["momentum"] ?? 0) + n; },
    onYield: (run: RunState) => { if (run.jokerState) run.jokerState["momentum"] = Math.max(0, (run.jokerState["momentum"] ?? 0) - 5); },
  },
  {
    id: "patient-tactician", name: "Patient Tactician", art: "satchel", rarity: "common", price: 5, sellValue: 2,
    text: "If you never yield in a fight, earn +4 gold when the royal falls.",
    onRoyalFelled: (run: RunState) => { if (!run.yieldedThisFight) { run.gold += 4; run.goldEarned += 4; } },
  },
  {
    id: "twin-cast", name: "Twin Cast", art: "jester", rarity: "rare", price: 8, sellValue: 4,
    text: "Your first 3 plays each fight trigger their suit powers twice.",
    modify: (ctx: ResContext, info?) => { if ((info?.jokerState?.["twin-cast"] ?? 0) < 3) { if (ctx.heartActive) ctx.heal *= 2; if (ctx.diamondActive) ctx.draw *= 2; if (ctx.spadeActive) ctx.shield *= 2; if (ctx.clubActive) ctx.damage *= 2; ctx.trace.push("Twin Cast: powers doubled."); } },
    onFightStart: (run: RunState) => { run.jokerState = run.jokerState ?? {}; run.jokerState["twin-cast"] = 0; },
    onPlay: (run: RunState) => { run.jokerState = run.jokerState ?? {}; run.jokerState["twin-cast"] = (run.jokerState["twin-cast"] ?? 0) + 1; },
  },
  {
    id: "court-astrologer", name: "Court Astrologer", art: "scroll", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Each 8 you play has a 1-in-4 chance to conjure a Tarot.",
    onPlay: (run: RunState, p) => { if (p.cards.some((c) => c.value === 8)) { const r = rngInt(run.rngState, 4); run.rngState = r.state; if (r.value === 0) pushHeld(run, randomTarotId(run)); } },
  },
  {
    id: "twin-soul", name: "Twin Soul", art: "medic", rarity: "rare", price: 8, sellValue: 4,
    text: "The first single card you play each fight is copied into your deck.",
    onFightStart: (run: RunState) => { run.jokerState = run.jokerState ?? {}; run.jokerState["twin-soul"] = 0; },
    onPlay: (run: RunState, p) => { run.jokerState = run.jokerState ?? {}; if (run.jokerState["twin-soul"] === 0 && p.cards.length === 1 && p.cards[0].kind !== "jester") { run.cardSeq += 1; const c = p.cards[0]; run.deck.push({ ...c, id: `s${run.cardSeq}`, sigils: c.sigils ? [...c.sigils] : undefined }); run.deckBaseline += 1; run.jokerState["twin-soul"] = 1; } },
  },
  {
    id: "vampiric-crest", name: "Vampiric Crest", art: "dagger", rarity: "rare", price: 8, sellValue: 4,
    text: "Gains +10% damage each time you play a sigil-bearing card, consuming one of its sigils.",
    modify: (ctx: ResContext, info?) => { const s = info?.jokerState?.["vampiric-crest"] ?? 0; if (s && ctx.damage > 0) { ctx.damage = Math.round(ctx.damage * (1 + 0.1 * s)); ctx.trace.push(`Vampiric Crest: ×${(1 + 0.1 * s).toFixed(2)}.`); } },
    onPlay: (run: RunState, p) => { const c = p.cards.find((x) => (x.sigils?.length ?? 0) > 0); if (c && c.sigils) { c.sigils.pop(); run.jokerState = run.jokerState ?? {}; run.jokerState["vampiric-crest"] = (run.jokerState["vampiric-crest"] ?? 0) + 1; } },
  },
  {
    id: "usurer", name: "Usurer", art: "pouch", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Raises your interest cap by 3.",
    interestCapBonus: 3,
  },
  {
    id: "siege-engineer", name: "Siege Engineer", art: "bomb", rarity: "uncommon", price: 6, sellValue: 3,
    text: "+1 gold each fight; +2 more whenever a King falls.",
    goldPerFight: 1,
    onRoyalFelled: (run: RunState) => { if (run.combat?.enemy.tier === "king") { run.gold += 2; run.goldEarned += 2; } },
  },
  {
    id: "nest-egg", name: "Nest Egg", art: "pouch", rarity: "common", price: 5, sellValue: 2,
    text: "Earn +2 gold at the end of each fight.",
    goldPerFight: 2,
  },
  {
    id: "almsgiver", name: "Almsgiver", art: "satchel", rarity: "uncommon", price: 6, sellValue: 3,
    text: "When a royal falls, earn +1 gold per other guild member.",
    onRoyalFelled: (run: RunState) => { const n = Math.max(0, run.slots.length - 1); if (n) { run.gold += n; run.goldEarned += n; } },
  },
  {
    id: "last-stand", name: "Last Stand", art: "shield", rarity: "rare", price: 9, sellValue: 4,
    text: "Once per run, survive a blow that would kill you (then it shatters).",
    survivesLethal: true,
  },
  {
    id: "loose-grip", name: "Loose Grip", art: "satchel", rarity: "uncommon", price: 6, sellValue: 3,
    text: "Combos may total up to 13 (instead of 10).",
    comboMaxBonus: 3,
  },
  {
    id: "the-collector", name: "The Collector", art: "pouch", rarity: "rare", price: 8, sellValue: 4,
    text: "Jokers may appear more than once in the shop (duplicates allowed).",
  },
  // ── §J: Fighting-Style jokers (reward plays by their card-count style; see JOKER-ADAPTATIONS.md) ──
  {
    id: "lone-champion",
    name: "Lone Champion",
    art: "swords",
    rarity: "common",
    text: "Single-card (Two-Handed) plays deal +6 damage.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.sizeStyle === "twoHanded" && !ctx.jesterPlayed && ctx.damage > 0) {
        ctx.damage += 6;
        ctx.trace.push("Lone Champion: +6 (Two-Handed).");
      }
    },
  },
  {
    id: "shield-wall",
    name: "Shield Wall",
    art: "shield",
    rarity: "common",
    text: "Two-card (Sword & Shield) plays grant +5 shield.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.sizeStyle === "swordShield" && ctx.spadeActive) {
        ctx.shield += 5;
        ctx.trace.push("Shield Wall: +5 shield (Sword & Shield).");
      }
    },
  },
  {
    id: "phalanx-drillmaster",
    name: "Phalanx Drillmaster",
    art: "swords",
    rarity: "uncommon",
    text: "Three-card (Spear) plays deal half again as much damage.",
    price: 7,
    sellValue: 3,
    modify: (ctx: ResContext) => {
      if (ctx.sizeStyle === "spear" && ctx.damage > 0) {
        ctx.damage = Math.round(ctx.damage * 1.5);
        ctx.trace.push("Phalanx Drillmaster: ×1.5 (Spear).");
      }
    },
  },
  {
    id: "twin-fury",
    name: "Twin Fury",
    art: "dagger",
    rarity: "rare",
    text: "Four-card (Dual Wielding) plays deal double damage.",
    price: 8,
    sellValue: 4,
    modify: (ctx: ResContext) => {
      if (ctx.sizeStyle === "dualWield" && ctx.damage > 0) {
        ctx.damage *= 2;
        ctx.trace.push("Twin Fury: ×2 (Dual Wielding).");
      }
    },
  },
  {
    id: "arcane-surge",
    name: "Arcane Surge",
    art: "scroll",
    rarity: "uncommon",
    text: "Five-card (Mage) plays deal +25 damage.",
    price: 7,
    sellValue: 3,
    modify: (ctx: ResContext) => {
      if (ctx.sizeStyle === "mage" && ctx.damage > 0) {
        ctx.damage += 25;
        ctx.trace.push("Arcane Surge: +25 (Mage).");
      }
    },
  },
  {
    id: "cavalier",
    name: "Cavalier",
    art: "swords",
    rarity: "common",
    text: "Mounted plays (containing an Ace) deal +5 damage.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.mounted && ctx.damage > 0) {
        ctx.damage += 5;
        ctx.trace.push("Cavalier: +5 (Mounted).");
      }
    },
  },
  {
    id: "warhorse",
    name: "Warhorse",
    art: "satchel",
    rarity: "common",
    text: "Mounted plays (containing an Ace) draw +2.",
    price: 5,
    sellValue: 2,
    modify: (ctx: ResContext) => {
      if (ctx.mounted && ctx.diamondActive) {
        ctx.draw += 2;
        ctx.trace.push("Warhorse: +2 draw (Mounted).");
      }
    },
  },
];

export function jokerById(id: string): Joker | undefined {
  return JOKER_LIBRARY.find((j) => j.id === id);
}

// ─── Royal Decrees (P1) ──────────────────────────────────────────────────────────────────────
// A royal's special rule. These carry hook functions, so they live here (static) and are referred
// to from the clone-safe Enemy by `decreeId` only. See types.ts `Decree` for the hook contract.

export const DECREE_LIBRARY: Decree[] = [
  {
    id: "iron-wall",
    name: "The Iron Wall",
    text: "Fortified behind iron — its health is half again as large.",
    intentNote: "Fortified: extra health",
    healthMult: 1.5,
  },
  {
    id: "headsman",
    name: "The Headsman",
    text: "After every attack you make, it lops one random card from your hand.",
    intentNote: "Takes a card from your hand after you attack",
    onPlayResolved: (run: RunState) => {
      if (run.hand.length === 0) return;
      const r = rngInt(run.rngState, run.hand.length);
      run.rngState = r.state;
      const [lost] = run.hand.splice(r.value, 1); // to the discard pile (cycled, not destroyed)
      run.discard.push(lost);
      run.notice = "The Headsman lops a card from your hand.";
    },
  },
  {
    id: "plague-court",
    name: "The Plague Court",
    text: "A second suit is corrupted — its power is nullified for this fight.",
    intentNote: "A second suit's power is nullified",
    resolve: (ctx: ResContext, enemy: Enemy) => {
      const rotten = enemy.decreeParam;
      if (!rotten) return;
      if (rotten === "H" && ctx.heartActive) {
        ctx.heal = 0;
        ctx.heartActive = false;
        ctx.trace.push(`Plague Court: ${SUIT_NAME.H} are corrupted — no heal.`);
      } else if (rotten === "D" && ctx.diamondActive) {
        ctx.draw = 0;
        ctx.diamondActive = false;
        ctx.trace.push(`Plague Court: ${SUIT_NAME.D} are corrupted — no draw.`);
      } else if (rotten === "S" && ctx.spadeActive) {
        ctx.shield = 0;
        ctx.spadeActive = false;
        ctx.trace.push(`Plague Court: ${SUIT_NAME.S} are corrupted — no shield.`);
      } else if (rotten === "C" && ctx.clubActive) {
        ctx.damage = ctx.value;
        ctx.clubActive = false;
        ctx.trace.push(`Plague Court: ${SUIT_NAME.C} are corrupted — no double.`);
      }
    },
  },
  {
    id: "vampire",
    name: "The Vampire King",
    text: "Drinks deep — heals itself by half of every blow it lands on you.",
    intentNote: "Heals itself when it strikes you",
    onCounterResolved: (run: RunState, incoming: number) => {
      const enemy = run.combat?.enemy;
      if (!enemy || incoming <= 0) return;
      const drain = Math.floor(incoming / 2);
      if (drain > 0) {
        enemy.damageTaken = Math.max(0, enemy.damageTaken - drain);
        run.notice = `The Vampire King drains ${drain} from your blow.`;
      }
    },
  },
  {
    id: "executioner",
    name: "The Executioner",
    text: "Its axe cleaves straight through your shield.",
    intentNote: "Strikes ignore your shield",
    ignoresShield: true,
  },
  {
    id: "paranoid-crown",
    name: "The Paranoid Crown",
    text: "Trusts nothing twice — you may not play the same suit two turns running.",
    intentNote: "No repeating a suit two turns in a row",
    forbids: (combat: CombatState, suits: Suit[]) => {
      const last = combat.lastSuits ?? [];
      const clash = suits.find((s) => last.includes(s));
      return clash
        ? `The Paranoid Crown forbids playing ${SUIT_NAME[clash]} two turns in a row.`
        : null;
    },
  },
  {
    id: "thick-hide",
    name: "Thick Hide",
    text: "Its hide turns blades — every attack you make deals 2 less.",
    intentNote: "Your attacks deal 2 less",
    resolve: (ctx: ResContext) => {
      if (ctx.damage > 0) {
        ctx.damage = Math.max(0, ctx.damage - 2);
        ctx.trace.push("Thick Hide: -2 to your attack.");
      }
    },
  },
  {
    id: "the-tyrant",
    name: "The Tyrant",
    text: "Its strikes cleave through shield, and it drinks half of every blow it lands on you.",
    intentNote: "Ignores shield · heals when it strikes",
    ignoresShield: true,
    onCounterResolved: (run: RunState, incoming: number) => {
      const enemy = run.combat?.enemy;
      if (!enemy || incoming <= 0) return;
      const drain = Math.floor(incoming / 2);
      if (drain > 0) {
        enemy.damageTaken = Math.max(0, enemy.damageTaken - drain);
        run.notice = `The Tyrant drinks ${drain} from your blow.`;
      }
    },
  },
  {
    id: "the-mad-king",
    name: "The Mad King",
    text: "Fortified and merciless: his strikes ignore your shield, and he lops a card from your hand after every attack you make.",
    intentNote: "Fortified · ignores shield · takes a card",
    ignoresShield: true,
    healthMult: 1.25,
    onPlayResolved: (run: RunState) => {
      if (run.hand.length === 0) return;
      const r = rngInt(run.rngState, run.hand.length);
      run.rngState = r.state;
      const [lost] = run.hand.splice(r.value, 1);
      run.discard.push(lost);
      run.notice = "The Mad King lops a card from your hand.";
    },
  },
];

/** Decree severity tiers drive the difficulty curve (assigned by royal tier, see assignTieredDecree). */
export const DECREE_SEVERITY: Record<string, "mild" | "standard" | "severe" | "finisher"> = {
  "iron-wall": "mild",
  vampire: "mild",
  "thick-hide": "mild",
  headsman: "standard",
  "paranoid-crown": "standard",
  "plague-court": "standard",
  executioner: "severe",
  "the-tyrant": "severe",
  "the-mad-king": "finisher",
};

export function decreeById(id: string | null | undefined): Decree | undefined {
  if (!id) return undefined;
  return DECREE_LIBRARY.find((d) => d.id === id);
}

function decreePool(severity: "mild" | "standard" | "severe" | "finisher"): Decree[] {
  return DECREE_LIBRARY.filter((d) => DECREE_SEVERITY[d.id] === severity);
}

function pickFromPool(state: number, pool: Decree[], excludeIds: string[]): { state: number; decree: Decree } {
  const usable = pool.filter((d) => !excludeIds.includes(d.id));
  const choices = usable.length > 0 ? usable : pool;
  const r = rngInt(state, choices.length);
  return { state: r.state, decree: choices[r.value] };
}

/** The difficulty curve: Jacks draw a MILD decree, Queens a STANDARD one, Kings a SEVERE decree
 *  PLUS a stacked mild decree; the final King gets the FINISHER decree plus a stacked severe one.
 *  Seeded; avoids repeating the previous royal's primary decree. */
export function assignTieredDecree(
  state: number,
  enemy: Enemy,
  isFinalKing: boolean,
  lastPrimaryId: string | null,
): { state: number; decreeId: string; decreeParam: Suit | null; decreeId2: string | null } {
  let s = state;
  let primaryPool: Decree[];
  let secondaryPool: Decree[] | null = null;
  if (enemy.tier === "jack") {
    primaryPool = decreePool("mild");
  } else if (enemy.tier === "queen") {
    primaryPool = decreePool("standard");
  } else if (isFinalKing) {
    primaryPool = decreePool("finisher");
    secondaryPool = decreePool("severe");
  } else {
    primaryPool = decreePool("severe");
    secondaryPool = decreePool("mild");
  }

  const p = pickFromPool(s, primaryPool, lastPrimaryId ? [lastPrimaryId] : []);
  s = p.state;
  const decreeId = p.decree.id;

  let decreeParam: Suit | null = null;
  if (decreeId === "plague-court") {
    const others = SUITS.filter((su) => su !== enemy.suit);
    const rp = rngInt(s, others.length);
    s = rp.state;
    decreeParam = others[rp.value];
  }

  let decreeId2: string | null = null;
  if (secondaryPool) {
    const q = pickFromPool(s, secondaryPool, [decreeId]);
    s = q.state;
    decreeId2 = q.decree.id;
  }
  return { state: s, decreeId, decreeParam, decreeId2 };
}

// ─── Sigils (card enhancements) ──────────────────────────────────────────────────────────────
// `glyph` is for DOM badges; `code` (1 char) + `color` are for the Pixi combat-hand badges.
export const SIGIL_IDS: SigilId[] = [
  "keen",
  "warded",
  "gilded",
  "runed",
  "honed",
  "companion",
  "extra",
  "wildcard",
  "steel",
  "glass",
  "minted",
  "charmed",
  "stoneskin",
];
export const SIGIL_INFO: Record<SigilId, { name: string; glyph: string; code: string; color: number; text: string }> = {
  keen: { name: "Keen Edge", glyph: "⚔", code: "K", color: 0xf2c14e, text: "+2 damage when this card is played." },
  warded: { name: "Warding", glyph: "🛡", code: "W", color: 0xb070e0, text: "+2 shield when this card is played." },
  gilded: { name: "Gilding", glyph: "◆", code: "$", color: 0xffe9a0, text: "+1 gold when this card is played." },
  runed: { name: "Runes", glyph: "✦", code: "R", color: 0x5fb0e0, text: "+1 card drawn when this card is played." },
  honed: { name: "Honed", glyph: "✚", code: "+", color: 0x7ad06f, text: "+2 to this card's value — every power it grants scales up." },
  companion: { name: "Companion", glyph: "❀", code: "@", color: 0x7ad06f, text: "Acts as an Animal Companion: value 1, pairs with any one card." },
  extra: { name: "Twin-Suit", glyph: "✶", code: "2", color: 0xe04060, text: "Counts as a second suit too — fires both powers (and both immunities apply)." },
  wildcard: { name: "Wildcard", glyph: "★", code: "*", color: 0xffe9a0, text: "Choose this card's suit each time you play it." },
  steel: { name: "Steel", glyph: "⬢", code: "St", color: 0xaab2ba, text: "+3 shield when this card is played." },
  glass: { name: "Glass", glyph: "◇", code: "Gl", color: 0xbdeaff, text: "+6 damage when this card is played (fragile)." },
  minted: { name: "Minted", glyph: "⊚", code: "Mt", color: 0xffe9a0, text: "+2 gold when this card is played." },
  charmed: { name: "Charmed", glyph: "🍀", code: "Ch", color: 0x7ad06f, text: "+3 damage and +1 gold when this card is played." },
  stoneskin: { name: "Stoneskin", glyph: "⛰", code: "Sk", color: 0x8a8f97, text: "+5 shield and +5 damage when this card is played." },
};

/** Apply a sigil to a card in place. Flat sigils stack; structural ones (companion/extra/wildcard)
 *  are single and reshape the card. Used by sigil packs, the Engraver tarot, and events. */
export function addSigil(card: Card, id: SigilId): void {
  card.sigils = card.sigils ?? [];
  if (id === "companion") {
    card.kind = "companion";
    card.value = 1;
    if (!card.sigils.includes("companion")) card.sigils.push("companion");
    return;
  }
  if (id === "extra") {
    if (!card.extraSuit && card.suit) {
      const i = SUITS.indexOf(card.suit);
      card.extraSuit = SUITS[(i + 1) % SUITS.length]; // deterministic second suit
    }
    if (!card.sigils.includes("extra")) card.sigils.push("extra");
    return;
  }
  if (id === "wildcard") {
    if (!card.sigils.includes("wildcard")) card.sigils.push("wildcard");
    return;
  }
  card.sigils.push(id); // keen / warded / gilded / runed / honed stack additively
}

// ─── Edicts (permanent run-wide upgrades, P4; two-tier where an upgrade `requires` its base) ────
export const EDICT_LIBRARY: Edict[] = [
  { id: "black-market", name: "Black Market", art: "pouch", price: 10, text: "All shop prices are 20% cheaper.", discount: 0.2 },
  { id: "free-port", name: "Free Port", art: "pouch", price: 10, requires: "black-market", text: "Shop prices are a further 20% cheaper (40% total).", discount: 0.2 },
  { id: "war-tithe", name: "War Tithe", art: "pouch", price: 8, text: "Raise your interest cap to ◆10 (earn ◆1 per ◆5 held).", interestCapBonus: 5 },
  { id: "kings-ransom", name: "King's Ransom", art: "pouch", price: 10, requires: "war-tithe", text: "Raise your interest cap to ◆20 (earn ◆1 per ◆5 held).", interestCapBonus: 10 },
  { id: "bannerman", name: "Bannerman", art: "satchel", price: 8, text: "+1 maximum hand size.", handMaxBonus: 1 },
  { id: "standard-bearer", name: "Standard Bearer", art: "satchel", price: 10, requires: "bannerman", text: "+1 maximum hand size again.", handMaxBonus: 1 },
  { id: "conscription", name: "Conscription", art: "swords", price: 9, text: "Raise an extra banner — +1 guild slot.", slotBonus: 1 },
  { id: "spymaster", name: "Spymaster", art: "dagger", price: 7, text: "Rerolling the market costs 1 less.", rerollDelta: -1 },
];

export function edictById(id: string): Edict | undefined {
  return EDICT_LIBRARY.find((e) => e.id === id);
}
export function activeEdicts(edictIds: string[] | undefined): Edict[] {
  return (edictIds ?? []).map((id) => edictById(id)).filter((e): e is Edict => !!e);
}

export interface EdictBonuses {
  discount: number;
  interestCapBonus: number;
  handMaxBonus: number;
  slotBonus: number;
  heldMaxBonus: number;
  rerollDelta: number;
}
export function edictBonuses(edictIds: string[] | undefined): EdictBonuses {
  const es = activeEdicts(edictIds);
  return {
    discount: es.reduce((a, e) => a + (e.discount ?? 0), 0),
    interestCapBonus: es.reduce((a, e) => a + (e.interestCapBonus ?? 0), 0),
    handMaxBonus: es.reduce((a, e) => a + (e.handMaxBonus ?? 0), 0),
    slotBonus: es.reduce((a, e) => a + (e.slotBonus ?? 0), 0),
    heldMaxBonus: es.reduce((a, e) => a + (e.heldMaxBonus ?? 0), 0),
    rerollDelta: es.reduce((a, e) => a + (e.rerollDelta ?? 0), 0),
  };
}

/** Shop price after edict discounts (minimum 1 gold). */
export function discountedPrice(base: number, edictIds: string[] | undefined): number {
  const d = edictBonuses(edictIds).discount;
  return Math.max(1, Math.round(base * (1 - d)));
}

// ─── Tarots (held consumables) — the 22 major arcana (see TAROT-ADAPTATIONS.md) ───────────────
function findRunCard(run: RunState, id: string): Card | undefined {
  return [...run.deck, ...run.hand, ...run.discard].find((c) => c.id === id);
}
/** Add a tarot instance to the pouch if there's room (loose cap; full heldMax lives in combat.ts). */
function pushHeld(run: RunState, tarotId: string): boolean {
  if (run.held.length >= run.config.heldBase + 4) {
    run.notice = "Your pouch is full.";
    return false;
  }
  run.cardSeq += 1;
  run.held.push({ id: `h${run.cardSeq}`, tarotId });
  return true;
}
/** A random non-Drill tarot id (for The Fool / The Emperor). */
function randomTarotId(run: RunState): string {
  const pool = TAROT_LIBRARY.filter((t) => !t.id.startsWith("drill-"));
  const r = rngInt(run.rngState, pool.length);
  run.rngState = r.state;
  return pool[r.value].id;
}
/** Factory: a tarot that engraves a chosen deck card with a sigil. */
const enhancer = (id: string, name: string, sig: SigilId, what: string): Tarot => ({
  id,
  name,
  art: "anvil",
  price: 4,
  target: "deck",
  text: `Engrave a chosen card with ${what}.`,
  apply: (run, t) => {
    const c = t ? findRunCard(run, t) : undefined;
    if (!c) {
      run.notice = "Choose a card.";
      return false;
    }
    addSigil(c, sig);
    run.notice = `${name}: ${what}.`;
    return true;
  },
});
/** Factory: a tarot that converts a chosen card to a suit. */
const converter = (id: string, name: string, suit: Suit): Tarot => ({
  id,
  name,
  art: "scroll",
  price: 4,
  target: "deck",
  text: `Convert a chosen card to ${SUIT_NAME[suit]}.`,
  apply: (run, t) => {
    const c = t ? findRunCard(run, t) : undefined;
    if (!c || c.kind === "jester") {
      run.notice = "Choose a suited card.";
      return false;
    }
    c.suit = suit;
    run.notice = `Converted to ${SUIT_NAME[suit]}.`;
    return true;
  },
});

export const TAROT_LIBRARY: Tarot[] = [
  // Enhancers — engrave a chosen card with a sigil (Balatro enhancement analogs).
  enhancer("the-hierophant", "The Hierophant", "honed", "Honed (+2 value)"),
  enhancer("the-empress", "The Empress", "keen", "Keen Edge (+2 damage)"),
  enhancer("the-magician", "The Magician", "charmed", "Charmed (+3 dmg, +1 gold)"),
  enhancer("the-lovers", "The Lovers", "wildcard", "Wildcard (choose suit at play)"),
  enhancer("the-chariot", "The Chariot", "steel", "Steel (+3 shield)"),
  enhancer("justice", "Justice", "glass", "Glass (+6 damage)"),
  enhancer("the-devil", "The Devil", "minted", "Minted (+2 gold)"),
  enhancer("the-tower", "The Tower", "stoneskin", "Stoneskin (+5 shield & damage)"),
  // Suit conversion.
  converter("the-star", "The Star", "D"),
  converter("the-moon", "The Moon", "C"),
  converter("the-sun", "The Sun", "H"),
  converter("the-world", "The World", "S"),
  // Fighting-Style (Planet analog): create Drills.
  {
    id: "the-high-priestess", name: "The High Priestess", art: "anvil", price: 6,
    text: "Create up to 2 random Drills (Fighting-Style upgrades) in your pouch.",
    apply: (run) => {
      let n = 0;
      for (let i = 0; i < 2; i++) {
        const r = rngInt(run.rngState, FIGHTING_STYLE_IDS.length); run.rngState = r.state;
        if (pushHeld(run, `drill-${FIGHTING_STYLE_IDS[r.value]}`)) n++;
      }
      if (!n) return false;
      run.notice = `The High Priestess grants ${n} Drill(s).`; return true;
    },
  },
  // Meta / economy.
  {
    id: "the-fool", name: "The Fool", art: "jester", price: 5,
    text: "Conjure a random Tarot into your pouch.",
    apply: (run) => { const ok = pushHeld(run, randomTarotId(run)); if (ok) run.notice = "The Fool conjures a Tarot."; return ok; },
  },
  {
    id: "the-emperor", name: "The Emperor", art: "jester", price: 6,
    text: "Create up to 2 random Tarots in your pouch.",
    apply: (run) => { let n = 0; for (let i = 0; i < 2; i++) if (pushHeld(run, randomTarotId(run))) n++; if (!n) return false; run.notice = `The Emperor grants ${n} Tarot(s).`; return true; },
  },
  {
    id: "the-hermit", name: "The Hermit", art: "pouch", price: 5,
    text: "Double your gold (bonus capped at +20).",
    apply: (run) => { const bonus = Math.min(run.gold, 20); run.gold += bonus; run.notice = `Gold doubled (+${bonus}).`; return true; },
  },
  {
    id: "temperance", name: "Temperance", art: "pouch", price: 5,
    text: "Gain gold equal to your guild's total sell value (max 50).",
    apply: (run) => { const sum = run.slots.reduce((a, id) => a + (jokerById(id)?.sellValue ?? 0), 0); const gain = Math.min(sum, 50); if (!gain) { run.notice = "No guild to tithe."; return false; } run.gold += gain; run.goldEarned += gain; run.notice = `Temperance: +${gain} gold.`; return true; },
  },
  {
    id: "judgement", name: "Judgement", art: "jester", price: 6,
    text: "A random joker joins your guild (if room).",
    apply: (run) => { grantRandomRelic(run, "Judgement summons:"); return true; },
  },
  {
    id: "wheel-of-fortune", name: "Wheel of Fortune", art: "pouch", price: 6,
    text: "Fortune's gamble — a random joker joins your guild.",
    apply: (run) => { grantRandomRelic(run, "The Wheel turns:"); return true; },
  },
  // Rank / destroy / transform.
  {
    id: "strength", name: "Strength", art: "anvil", price: 4, target: "deck",
    text: "Raise a chosen card's rank by 1 (max 10).",
    apply: (run, t) => { const c = t ? findRunCard(run, t) : undefined; if (!c || c.kind !== "number") { run.notice = "Choose a number card."; return false; } if (c.value >= 10) { run.notice = "Already at max rank."; return false; } c.value += 1; run.notice = `Rank raised to ${c.value}.`; return true; },
  },
  {
    id: "the-hanged-man", name: "The Hanged Man", art: "knife", price: 4, target: "deck",
    text: "Destroy a chosen card.",
    apply: (run, t) => { const c = t ? findRunCard(run, t) : undefined; if (!c) { run.notice = "Choose a card to destroy."; return false; } run.deck = run.deck.filter((x) => x.id !== c.id); run.hand = run.hand.filter((x) => x.id !== c.id); run.discard = run.discard.filter((x) => x.id !== c.id); run.deckBaseline -= 1; run.notice = "A card is destroyed."; return true; },
  },
  {
    id: "death", name: "Death", art: "knife", price: 5, target: "deck",
    text: "Transform a chosen card into a fresh random card.",
    apply: (run, t) => { const c = t ? findRunCard(run, t) : undefined; if (!c) { run.notice = "Choose a card."; return false; } run.deck = run.deck.filter((x) => x.id !== c.id); run.hand = run.hand.filter((x) => x.id !== c.id); run.discard = run.discard.filter((x) => x.id !== c.id); run.cardSeq += 1; const tpl = rollCardTemplate(run.rngState); run.rngState = tpl.state; run.deck.push(makeCardFromTemplate(tpl.template, run.cardSeq)); run.notice = "Death: a card is reborn."; return true; },
  },
  // Utility (kept from the original set).
  {
    id: "conjuration", name: "Conjuration", art: "scroll", price: 5,
    text: "Conjure a fresh card into your deck.",
    apply: (run) => { run.cardSeq += 1; const tpl = rollCardTemplate(run.rngState); run.rngState = tpl.state; run.deck.push(makeCardFromTemplate(tpl.template, run.cardSeq)); run.deckBaseline += 1; run.notice = "A card is conjured into your deck."; return true; },
  },
  // ── Drills: the "Planet card" analog — train (level) a Fighting Style (see FIGHTING-STYLES.md). ──
  ...FIGHTING_STYLE_IDS.map(
    (sid): Tarot => ({
      id: `drill-${sid}`,
      name: `${FIGHTING_STYLE_NAME[sid]} Drill`,
      art: "anvil",
      price: 4,
      text: `Train your ${FIGHTING_STYLE_NAME[sid]} style: +1 level (scales the suit effects of those plays).`,
      apply: (run) => {
        run.styleLevels[sid] += 1;
        run.notice = `${FIGHTING_STYLE_NAME[sid]} drilled to level ${run.styleLevels[sid]}.`;
        return true;
      },
    }),
  ),
];
export function tarotById(id: string): Tarot | undefined {
  return TAROT_LIBRARY.find((t) => t.id === id) ?? SPECTRAL_LIBRARY.find((t) => t.id === id);
}

// ─── Spectral cards (rare, high-variance held consumables; see SPECTRAL-ADAPTATIONS.md) ────────
// Face-card-adding effects use 10s instead (the player deck has no J/Q/K). Seal/Edition spectrals
// are deferred until those subsystems exist; these are the wireable card-gen / convert / meta ones.
function spectralRollSuit(run: RunState): Suit {
  const r = rngInt(run.rngState, SUITS.length);
  run.rngState = r.state;
  return SUITS[r.value];
}
/** Conjure an "enhanced" card into the HAND (10 / Ace / random number) and keep the baseline in sync. */
function addSpectralCard(run: RunState, spec: number | "A" | "num"): void {
  run.cardSeq += 1;
  const suit = spectralRollSuit(run);
  let body: string;
  if (spec === "A") body = `${suit}A`;
  else if (spec === "num") {
    const r = rngInt(run.rngState, 9);
    run.rngState = r.state;
    body = `${suit}${r.value + 2}`;
  } else body = `${suit}${spec}`;
  const card = makeCardFromTemplate(body, run.cardSeq);
  if (card.kind === "number") {
    const rg = rngInt(run.rngState, FLAT_SIGILS.length);
    run.rngState = rg.state;
    addSigil(card, FLAT_SIGILS[rg.value]);
  }
  run.hand.push(card);
  run.deckBaseline += 1;
}
function destroyRandomHand(run: RunState): void {
  if (run.hand.length === 0) return;
  const r = rngInt(run.rngState, run.hand.length);
  run.rngState = r.state;
  run.hand.splice(r.value, 1);
  run.deckBaseline -= 1;
}
/** A random owned-joker id (for Edition spectrals). Caller guarantees run.slots is non-empty. */
function randomSlotId(run: RunState): string {
  const r = rngInt(run.rngState, run.slots.length);
  run.rngState = r.state;
  return run.slots[r.value];
}
/** Factory: a spectral that puts a Seal on a chosen card in hand. */
const sealer = (id: string, name: string, seal: SealId, what: string): Tarot => ({
  id,
  name,
  art: "anvil",
  price: 5,
  target: "hand",
  text: `Add a ${what} to a chosen card in your hand.`,
  apply: (run, t) => {
    const c = t ? findRunCard(run, t) : undefined;
    if (!c || c.kind === "jester") {
      run.notice = "Choose a card.";
      return false;
    }
    c.seal = seal;
    run.notice = `${what} applied.`;
    return true;
  },
});

export const SPECTRAL_LIBRARY: Tarot[] = [
  {
    id: "familiar", name: "Familiar", art: "jester", price: 7,
    text: "Destroy a random card in hand; add 3 enhanced 10s to your hand.",
    apply: (run) => { destroyRandomHand(run); for (let i = 0; i < 3; i++) addSpectralCard(run, 10); run.notice = "Familiar: 3 enhanced 10s join your hand."; return true; },
  },
  {
    id: "grim", name: "Grim", art: "knife", price: 7,
    text: "Destroy a random card in hand; add 2 enhanced Animal Companions (Aces).",
    apply: (run) => { destroyRandomHand(run); for (let i = 0; i < 2; i++) addSpectralCard(run, "A"); run.notice = "Grim: 2 Animal Companions join your hand."; return true; },
  },
  {
    id: "incantation", name: "Incantation", art: "scroll", price: 7,
    text: "Destroy a random card in hand; add 4 enhanced numbered cards.",
    apply: (run) => { destroyRandomHand(run); for (let i = 0; i < 4; i++) addSpectralCard(run, "num"); run.notice = "Incantation: 4 cards conjured into your hand."; return true; },
  },
  {
    id: "cryptid", name: "Cryptid", art: "jester", price: 6, target: "hand",
    text: "Create 2 copies of a chosen card in your hand.",
    apply: (run, t) => {
      const c = t ? findRunCard(run, t) : undefined;
      if (!c) { run.notice = "Choose a card to copy."; return false; }
      for (let i = 0; i < 2; i++) { run.cardSeq += 1; run.hand.push({ ...c, id: `s${run.cardSeq}`, sigils: c.sigils ? [...c.sigils] : undefined }); run.deckBaseline += 1; }
      run.notice = "Cryptid: 2 copies created."; return true;
    },
  },
  {
    id: "immolate", name: "Immolate", art: "bomb", price: 6,
    text: "Destroy 5 random cards in hand; gain 20 gold.",
    apply: (run) => { for (let i = 0; i < 5; i++) destroyRandomHand(run); run.gold += 20; run.goldEarned += 20; run.notice = "Immolate: +20 gold."; return true; },
  },
  {
    id: "sigil", name: "Sigil", art: "anvil", price: 6,
    text: "Convert every card in your hand to a single random suit.",
    apply: (run) => { const s = spectralRollSuit(run); for (const c of run.hand) if (c.kind !== "jester") c.suit = s; run.notice = `Sigil: your hand is all ${SUIT_NAME[s]}.`; return true; },
  },
  {
    id: "ouija", name: "Ouija", art: "scroll", price: 6,
    text: "Convert every card in your hand to one random rank; −1 maximum hand size.",
    apply: (run) => { const r = rngInt(run.rngState, 9); run.rngState = r.state; const v = r.value + 2; for (const c of run.hand) if (c.kind === "number") c.value = v; run.config.handMax = Math.max(1, run.config.handMax - 1); run.notice = `Ouija: your hand is all ${v}s; hand size −1.`; return true; },
  },
  {
    id: "black-hole", name: "Black Hole", art: "pouch", price: 8,
    text: "Level up every Fighting Style by 1.",
    apply: (run) => { for (const sid of FIGHTING_STYLE_IDS) run.styleLevels[sid] += 1; run.notice = "Black Hole: every Fighting Style leveled up."; return true; },
  },
  {
    id: "wraith", name: "Wraith", art: "jester", price: 0,
    text: "A random joker joins your guild — but it sets your gold to 0.",
    apply: (run) => { grantRandomRelic(run, "Wraith conjures"); run.gold = 0; return true; },
  },
  {
    id: "ankh", name: "Ankh", art: "shield", price: 7,
    text: "Copy a random guild member; destroy all your others.",
    apply: (run) => { if (run.slots.length === 0) { run.notice = "No guild to copy."; return false; } const r = rngInt(run.rngState, run.slots.length); run.rngState = r.state; const keep = run.slots[r.value]; run.slots = [keep, keep]; run.notice = "Ankh: a guild member is mirrored; the rest are gone."; return true; },
  },
  {
    id: "the-soul", name: "The Soul", art: "medic", price: 9,
    text: "A powerful joker answers your call (if you have room).",
    apply: (run) => { grantRandomRelic(run, "The Soul summons"); return true; },
  },
  // Seal spectrals — add a Seal to a chosen hand card (see Card.seal).
  sealer("talisman", "Talisman", "gold", "Gold Seal (+3 gold when played)"),
  sealer("deja-vu", "Deja Vu", "red", "Red Seal (its value counts twice)"),
  sealer("trance", "Trance", "blue", "Blue Seal (a Drill if held when the royal falls)"),
  sealer("medium", "Medium", "purple", "Purple Seal (a Tarot when discarded)"),
  // Edition spectrals — enchant a guild member (joker Edition; see EditionId).
  {
    id: "aura", name: "Aura", art: "jester", price: 7,
    text: "Grant a random guild member a random edition (Burnished / Haloed / Prismatic).",
    apply: (run) => {
      if (run.slots.length === 0) { run.notice = "No guild member to enchant."; return false; }
      run.slotEditions = run.slotEditions ?? {};
      const eds: EditionId[] = ["burnished", "haloed", "prismatic"];
      const re = rngInt(run.rngState, eds.length); run.rngState = re.state;
      run.slotEditions[randomSlotId(run)] = eds[re.value];
      run.notice = `Aura: a guild member gains the ${eds[re.value]} edition.`;
      return true;
    },
  },
  {
    id: "ectoplasm", name: "Ectoplasm", art: "medic", price: 6,
    text: "Make a random guild member Shadow (+1 slot); −1 maximum hand size.",
    apply: (run) => {
      if (run.slots.length === 0) { run.notice = "No guild member."; return false; }
      run.slotEditions = run.slotEditions ?? {};
      run.slotEditions[randomSlotId(run)] = "shadow";
      run.config.handMax = Math.max(1, run.config.handMax - 1);
      run.notice = "Ectoplasm: a Shadow edition (+1 slot); hand size −1.";
      return true;
    },
  },
  {
    id: "hex", name: "Hex", art: "bomb", price: 7,
    text: "Make a random guild member Prismatic (×damage); destroy all your others.",
    apply: (run) => {
      if (run.slots.length === 0) { run.notice = "No guild member."; return false; }
      const id = randomSlotId(run);
      run.slots = [id];
      run.slotEditions = run.slotEditions ?? {};
      run.slotEditions[id] = "prismatic";
      run.notice = "Hex: one guild member made Prismatic; the rest are gone.";
      return true;
    },
  },
];
export function spectralById(id: string): Tarot | undefined {
  return SPECTRAL_LIBRARY.find((t) => t.id === id);
}
// Shop tarot offers draw from tarots + spectrals (untuned — spectrals are not yet rarity-gated).
// Split pools for the typed booster packs: arcana Tarots (no Drills), the fighting-style Drills.
const ARCANA_POOL: Tarot[] = TAROT_LIBRARY.filter((t) => !t.id.startsWith("drill-"));
const DRILL_POOL: Tarot[] = TAROT_LIBRARY.filter((t) => t.id.startsWith("drill-"));

// ─── Card templates (for Card packs / loose card offers) ─────────────────────────────────────
const FLAT_SIGILS: SigilId[] = ["keen", "warded", "gilded", "runed", "honed"];

function rollCardTemplate(state: number): { template: string; state: number } {
  let s = state;
  const rs = rngInt(s, SUITS.length); s = rs.state;
  const suit = SUITS[rs.value];
  const rv = rngInt(s, 10); s = rv.state;
  if (rv.value === 0) return { template: `${suit}A`, state: s }; // ~10% Animal Companion
  const value = rv.value + 1; // 2..10
  const rm = rngInt(s, 4); s = rm.state; // 25% chance modified with a flat sigil
  if (rm.value === 0) {
    const rg = rngInt(s, FLAT_SIGILS.length); s = rg.state;
    return { template: `${suit}${value}:${FLAT_SIGILS[rg.value]}`, state: s };
  }
  return { template: `${suit}${value}`, state: s };
}

function parseCardTemplate(t: string): { suit: Suit; value: number; companion: boolean; sigil?: SigilId } {
  const [body, sig] = t.split(":");
  const suit = body[0] as Suit;
  const rest = body.slice(1);
  if (rest === "A") return { suit, value: 1, companion: true };
  return { suit, value: parseInt(rest, 10), companion: false, sigil: sig as SigilId | undefined };
}

export function makeCardFromTemplate(template: string, seq: number): Card {
  const p = parseCardTemplate(template);
  const card: Card = { id: `add-${seq}`, suit: p.suit, value: p.value, kind: p.companion ? "companion" : "number" };
  if (p.sigil) addSigil(card, p.sigil);
  return card;
}

/** Display metadata for any pack/loose content, by kind + contentId. */
export function contentMeta(kind: PackKind, contentId: string): { name: string; text: string; art: string; suit?: Suit; rarity?: Rarity; glyph?: string } {
  if (kind === "relic") { const j = jokerById(contentId)!; return { name: j.name, text: j.text, art: j.art, rarity: j.rarity }; }
  if (kind === "tarot" || kind === "style" || kind === "spectral") { const t = tarotById(contentId)!; return { name: t.name, text: t.text, art: t.art }; }
  const p = parseCardTemplate(contentId);
  const label = p.companion ? `${SUIT_NAME[p.suit]} Companion` : `${p.value} of ${SUIT_NAME[p.suit]}`;
  const text = p.sigil ? `Add a ${label}, engraved with ${SIGIL_INFO[p.sigil].name}, to your deck.` : `Add a ${label} to your deck.`;
  return { name: label, text, art: "scroll", suit: p.suit };
}

// ─── Pack & loose-offer rolling ──────────────────────────────────────────────────────────────
const PACK_KIND_WEIGHTS: Record<PackKind, number> = { card: 3, tarot: 3, relic: 2, style: 2, spectral: 1 };
// Sizes: s = 1-of-2, m = 1-of-3, l = 1-of-5, xl = 2-of-5.
const PACK_SIZE_WEIGHTS: Record<PackSize, number> = { s: 4, m: 5, l: 2, xl: 1 };
const SIZE_CONTENTS: Record<PackSize, number> = { s: 2, m: 3, l: 5, xl: 5 };
const SIZE_PICKS: Record<PackSize, number> = { s: 1, m: 1, l: 1, xl: 2 };
const SIZE_UPCHARGE: Record<PackSize, number> = { s: -1, m: 0, l: 3, xl: 6 };
const PACK_BASE_PRICE: Record<PackKind, number> = { card: 4, tarot: 4, relic: 6, style: 5, spectral: 6 };
const LOOSE_PRICE: Record<"card" | "tarot" | "style" | "spectral", number> = { card: 2, tarot: 4, style: 4, spectral: 6 };

function weightedPick<T extends string>(state: number, weights: Record<T, number>): { value: T; state: number } {
  const keys = Object.keys(weights) as T[];
  const total = keys.reduce((a, k) => a + weights[k], 0);
  const r = rngInt(state, total);
  let acc = 0;
  for (const k of keys) {
    acc += weights[k];
    if (r.value < acc) return { value: k, state: r.state };
  }
  return { value: keys[keys.length - 1], state: r.state };
}

function weightedJoker(state: number, pool: Joker[]): { id: string; state: number } {
  const total = pool.reduce((a, j) => a + RARITY_WEIGHT[j.rarity], 0);
  const r = rngInt(state, total);
  let acc = 0;
  for (const j of pool) {
    acc += RARITY_WEIGHT[j.rarity];
    if (r.value < acc) return { id: j.id, state: r.state };
  }
  return { id: pool[pool.length - 1].id, state: r.state };
}

function rollPackContents(state: number, run: RunState, kind: PackKind, count: number): { ids: string[]; state: number } {
  let s = state;
  const ids: string[] = [];
  if (kind === "relic") {
    let pool = JOKER_LIBRARY.filter((j) => run.slots.includes("the-collector") || !run.slots.includes(j.id));
    for (let i = 0; i < count && pool.length > 0; i++) {
      const pick = weightedJoker(s, pool); s = pick.state;
      ids.push(pick.id);
      pool = pool.filter((j) => j.id !== pick.id);
    }
  } else if (kind === "tarot" || kind === "style" || kind === "spectral") {
    const src = kind === "tarot" ? ARCANA_POOL : kind === "style" ? DRILL_POOL : SPECTRAL_LIBRARY;
    let pool = src.map((t) => t.id);
    for (let i = 0; i < count && pool.length > 0; i++) {
      const r = rngInt(s, pool.length); s = r.state;
      ids.push(pool[r.value]);
      pool = pool.filter((_, k) => k !== r.value);
    }
  } else {
    for (let i = 0; i < count; i++) {
      const t = rollCardTemplate(s); s = t.state;
      ids.push(t.template);
    }
  }
  return { ids, state: s };
}

function rollPack(state: number, run: RunState, nonce: number, idx: number): { pack: PackOffer; state: number } {
  let s = state;
  const k = weightedPick(s, PACK_KIND_WEIGHTS); s = k.state;
  const z = weightedPick(s, PACK_SIZE_WEIGHTS); s = z.state;
  const cc = rollPackContents(s, run, k.value, SIZE_CONTENTS[z.value]); s = cc.state;
  const price = Math.max(1, PACK_BASE_PRICE[k.value] + SIZE_UPCHARGE[z.value]);
  return {
    pack: { id: `pack-${nonce}-${idx}`, kind: k.value, size: z.value, price, contentIds: cc.ids, picksRemaining: SIZE_PICKS[z.value] },
    state: s,
  };
}

function rollLoose(state: number, run: RunState, nonce: number, idx: number): { offer: LooseOffer; state: number } {
  let s = state;
  const k = weightedPick(s, PACK_KIND_WEIGHTS); s = k.state;
  let kind: PackKind = k.value;
  let contentId = "";
  let price = 0;
  if (kind === "relic") {
    const pool = JOKER_LIBRARY.filter((j) => run.slots.includes("the-collector") || !run.slots.includes(j.id));
    if (pool.length === 0) {
      const r = rngInt(s, ARCANA_POOL.length); s = r.state;
      kind = "tarot"; contentId = ARCANA_POOL[r.value].id; price = LOOSE_PRICE.tarot;
    } else {
      const pick = weightedJoker(s, pool); s = pick.state;
      contentId = pick.id; price = jokerById(contentId)!.price;
    }
  } else if (kind === "tarot" || kind === "style" || kind === "spectral") {
    const src = kind === "tarot" ? ARCANA_POOL : kind === "style" ? DRILL_POOL : SPECTRAL_LIBRARY;
    const r = rngInt(s, src.length); s = r.state;
    contentId = src[r.value].id; price = LOOSE_PRICE[kind];
  } else {
    const t = rollCardTemplate(s); s = t.state;
    contentId = t.template; price = LOOSE_PRICE.card;
  }
  return { offer: { id: `loose-${nonce}-${idx}`, kind, contentId, price }, state: s };
}

/** Build a fresh shop: 3 booster packs, 3 loose items, an Act-gated edict, and the escalating
 *  remove-card cost. Deterministic via the rng state; `nonce` keeps offer ids unique across rerolls. */
export function rollShopV2(state: number, run: RunState, rerollCost: number, nonce: number): { shop: ShopState; state: number } {
  let s = state;
  const packs: PackOffer[] = [];
  for (let i = 0; i < 3; i++) {
    const p = rollPack(s, run, nonce, i); s = p.state; packs.push(p.pack);
  }
  const looseOffers: LooseOffer[] = [];
  for (let i = 0; i < 3; i++) {
    const l = rollLoose(s, run, nonce, i); s = l.state; looseOffers.push(l.offer);
  }
  // One edict acquirable per Act (the upcoming royal's tier); empty once this Act's edict is taken.
  let edictOffers: string[] = [];
  const act = run.castle[run.enemyIndex]?.tier;
  if (act && !(run.actEdictsTaken ?? []).includes(act)) {
    const eligible = EDICT_LIBRARY.filter(
      (e) => !(run.edicts ?? []).includes(e.id) && (!e.requires || (run.edicts ?? []).includes(e.requires)),
    );
    if (eligible.length > 0) {
      const re = rngInt(s, eligible.length); s = re.state;
      edictOffers = [eligible[re.value].id];
    }
  }
  const removeCardCost = run.config.removeBase + run.removeUses * run.config.removeStep;
  return { shop: { packs, looseOffers, edictOffers, removeCardCost, rerollCost, openPack: null }, state: s };
}

// ─── Court Events (run-structure variety, P5) ────────────────────────────────────────────────
/** Fights (by enemyIndex) preceded by a Court Event — roughly one per act, spread across the run. */
export const EVENT_AT = new Set<number>([2, 5, 8]);

function grantRandomRelic(run: RunState, prefix: string): void {
  const cap =
    5 + edictBonuses(run.edicts).slotBonus + run.slots.reduce((a, id) => a + (jokerById(id)?.slotBonus ?? 0), 0);
  const pool = JOKER_LIBRARY.filter((j) => run.slots.includes("the-collector") || !run.slots.includes(j.id));
  if (run.slots.length >= cap || pool.length === 0) {
    run.gold += 5;
    run.notice = `${prefix}, but you have no room — take 5 gold instead.`;
    return;
  }
  const r = rngInt(run.rngState, pool.length);
  run.rngState = r.state;
  const j = pool[r.value];
  run.slots.push(j.id);
  run.notice = `${prefix} ${j.name}.`;
}

function trainRandomSuit(run: RunState): void {
  const r = rngInt(run.rngState, SUITS.length);
  run.rngState = r.state;
  const suit = SUITS[r.value];
  run.suitUpgrades[suit] += 1;
  run.notice = `${SUIT_NAME[suit]} sharpened (+1).`;
}

function engraveRandomCard(run: RunState): void {
  const all = [...run.deck, ...run.hand, ...run.discard].filter((c) => c.kind !== "jester");
  if (all.length === 0) return;
  const rc = rngInt(run.rngState, all.length);
  run.rngState = rc.state;
  const rs = rngInt(run.rngState, SIGIL_IDS.length);
  run.rngState = rs.state;
  const sigil = SIGIL_IDS[rs.value];
  addSigil(all[rc.value], sigil); // same object reference as the card in its pile
  run.notice = `A card is etched with ${SIGIL_INFO[sigil].name}.`;
}

export type EventDef = GameEvent & { apply: (run: RunState, optionId: string) => boolean };

export const EVENT_LIBRARY: EventDef[] = [
  {
    id: "shrine",
    title: "The Crossroads Shrine",
    text: "A moss-eaten shrine waits at the fork in the road. Old power still lingers in its stones.",
    options: [
      { id: "tithe", label: "Tithe 6 gold", desc: "The old gods grant you a joker (if you have a free guild slot).", cost: 6 },
      { id: "pray", label: "Pray in silence", desc: "Your fallen cards return — the used pile shuffles back into your deck." },
    ],
    apply: (run, opt) => {
      if (opt === "tithe") {
        if (run.gold < 6) {
          run.notice = "Not enough gold to tithe.";
          return false;
        }
        run.gold -= 6;
        grantRandomRelic(run, "The shrine grants you");
        return true;
      }
      run.deck = run.deck.concat(run.discard);
      run.discard = [];
      run.notice = "Your fallen cards rise back into the deck.";
      return true;
    },
  },
  {
    id: "armory",
    title: "The Abandoned Armory",
    text: "Rusted weapon racks and a cold forge. Something here can still be made keen.",
    options: [
      { id: "sharpen", label: "Sharpen a weapon", desc: "Permanently strengthen a random suit (+1)." },
      { id: "etch", label: "Etch a rune", desc: "Engrave a random card in your deck with a random sigil." },
    ],
    apply: (run, opt) => {
      if (opt === "sharpen") trainRandomSuit(run);
      else engraveRandomCard(run);
      return true;
    },
  },
  {
    id: "mercenary",
    title: "The Wandering Mercenary",
    text: "A scarred sellsword leans on a spear, sizing up your purse.",
    options: [
      { id: "hire", label: "Hire them (6 gold)", desc: "They drill you hard — +1 to all four suits.", cost: 6 },
      { id: "wave", label: "Wave them on", desc: "Pocket a small road-toll: +4 gold." },
    ],
    apply: (run, opt) => {
      if (opt === "hire") {
        if (run.gold < 6) {
          run.notice = "Not enough gold to hire.";
          return false;
        }
        run.gold -= 6;
        for (const s of SUITS) run.suitUpgrades[s] += 1;
        run.notice = "The mercenary drills you — every suit sharpened.";
        return true;
      }
      run.gold += 4;
      run.notice = "You wave them on and pocket 4 gold.";
      return true;
    },
  },
  {
    id: "gambler",
    title: "The Gambler's Wager",
    text: 'A hooded figure shuffles a deck of their own. "Double or nothing?"',
    options: [
      { id: "wager", label: "Wager 5 gold", desc: "A coin-flip: win +12 gold, or lose your stake.", cost: 5 },
      { id: "decline", label: "Keep your purse", desc: "Walk on. Gain 3 gold for your prudence." },
    ],
    apply: (run, opt) => {
      if (opt === "wager") {
        if (run.gold < 5) {
          run.notice = "Not enough gold to wager.";
          return false;
        }
        run.gold -= 5;
        const r = rngInt(run.rngState, 2);
        run.rngState = r.state;
        if (r.value === 0) {
          run.gold += 12;
          run.notice = "You win the wager! +12 gold.";
        } else {
          run.notice = "The coin falls wrong — your stake is lost.";
        }
        return true;
      }
      run.gold += 3;
      run.goldEarned += 3;
      run.notice = "Prudence rewarded — +3 gold.";
      return true;
    },
  },
  {
    id: "refugees",
    title: "Fleeing Refugees",
    text: "A column of the displaced trudges past, fleeing the corrupted court.",
    options: [
      { id: "shelter", label: "Shelter them (5 gold)", desc: "Their gratitude raises your interest cap by 3.", cost: 5 },
      { id: "take", label: "Take their coin", desc: "Demand a toll: +7 gold now." },
    ],
    apply: (run, opt) => {
      if (opt === "shelter") {
        if (run.gold < 5) {
          run.notice = "Not enough gold to shelter them.";
          return false;
        }
        run.gold -= 5;
        run.config.interestCap += 3;
        run.notice = "Sheltered — your interest cap rises by 3.";
        return true;
      }
      run.gold += 7;
      run.notice = "You take their coin: +7 gold.";
      return true;
    },
  },
];

export function eventById(id: string | null | undefined): EventDef | undefined {
  if (!id) return undefined;
  return EVENT_LIBRARY.find((e) => e.id === id);
}

// ─── Starting Decks (Balatro-style run-creation variants) ───────────────────────────────────
export const DECK_LIBRARY: DeckDef[] = [
  // Core (unlocked from start)
  { id: "royal", name: "The Royal Deck", text: ["No modifiers."] },
  { id: "merchant", name: "The Merchant's Hoard", text: ["+10 starting gold"], config: { startGold: 14 } },
  { id: "bannerman", name: "The Bannerman's Deck", text: ["+1 maximum hand size (9)."], config: { handMax: 9 } },
  { id: "warband", name: "The Warband", text: ["+1 guild slot (6).", "−1 hand size (7)."], config: { handMax: 7 }, slotBonus: 1 },
  // Unlockable (win with the named deck)
  { id: "coffer", name: "The Coffer", text: ["Earn no interest.", "+◆1 per card left in hand when a royal falls."], unlock: "royal", noInterest: true, goldPerLeftoverHand: 1 },
  { id: "tactician", name: "The Tactician", text: ["+2 hand size (10).", "−1 guild slot (4)."], unlock: "bannerman", config: { handMax: 10 }, slotBonus: -1 },
  { id: "fools-pouch", name: "The Fool's Pouch", text: ["Start with 2 random Tarots.", "Start with the Spymaster edict.", "+1 pouch slot."], unlock: "merchant", startRandomTarots: 2, startEdicts: ["spymaster"], heldBonus: 1 },
  { id: "occult", name: "The Occult Deck", text: ["Start with a random Rare joker.", "Start with ◆0.", "The first royal bears a decree."], unlock: "warband", config: { startGold: 0 }, startRandomRareRelic: true, decreeOnFirstRoyal: true },
  { id: "iron", name: "The Iron Deck", text: ["Deck is only Spades & Clubs."], unlock: "coffer", suits: ["S", "C"] },
  { id: "vital", name: "The Vital Deck", text: ["Deck is only Hearts & Diamonds."], unlock: "iron", suits: ["H", "D"] },
  { id: "pilgrim", name: "The Pilgrim's Deck", text: ["Each royal felled drops a free Tarot in your pouch."], unlock: "fools-pouch", tarotPerRoyal: true },
  { id: "erratic", name: "The Erratic Deck", text: ["Every card's suit is randomized at run start."], unlock: "tactician", randomizeSuits: true },
  { id: "enchanter", name: "The Enchanter's Deck", text: ["Start with 4 deck cards pre-engraved with sigils."], unlock: "occult", startSigils: 4 },
];

export function deckById(id: string | null | undefined): DeckDef | undefined {
  if (!id) return undefined;
  return DECK_LIBRARY.find((d) => d.id === id);
}

// ─── Stakes (Balatro-style cumulative difficulty ladder) ────────────────────────────────────
export const STAKE_IDS = ["white", "red", "green", "black", "blue", "purple", "orange", "gold"] as const;
export type StakeId = (typeof STAKE_IDS)[number];

export const STAKE_INFO: Record<StakeId, { name: string; color: string; text: string }> = {
  white: { name: "White Stake", color: "#e8e8ee", text: "Base difficulty." },
  red: { name: "Red Stake", color: "#e04060", text: "Royals pay 1 less gold per tier." },
  green: { name: "Green Stake", color: "#7ad06f", text: "Royals have +15% health." },
  black: { name: "Black Stake", color: "#5b4a6a", text: "Jokers can no longer be sold." },
  blue: { name: "Blue Stake", color: "#5fb0e0", text: "−1 maximum hand size." },
  purple: { name: "Purple Stake", color: "#b070e0", text: "Royals have a further +15% health." },
  orange: { name: "Orange Stake", color: "#f29b4e", text: "Rerolls and card-removal cost +2." },
  gold: { name: "Gold Stake", color: "#f2c14e", text: "Royals strike for +3, start with ◆0." },
};

// Each stake's INCREMENTAL effect; stakeMods aggregates all rungs up to the chosen one.
const STAKE_STEP: Record<StakeId, Partial<StakeMods>> = {
  white: {},
  red: { rewardDelta: -1 },
  green: { healthMult: 1.15 },
  black: { noSell: true },
  blue: { handDelta: -1 },
  purple: { healthMult: 1.15 },
  orange: { rerollDelta: 2, removeDelta: 2 },
  gold: { attackBonus: 3, startGoldDelta: -4 },
};

export function stakeIndex(id: string | null | undefined): number {
  const i = STAKE_IDS.indexOf((id ?? "white") as StakeId);
  return i < 0 ? 0 : i;
}

/** Cumulative modifiers for the chosen stake (includes every lower rung). */
export function stakeMods(id: string | null | undefined): StakeMods {
  const mods: StakeMods = {
    rewardDelta: 0, healthMult: 1, attackBonus: 0, handDelta: 0,
    startGoldDelta: 0, rerollDelta: 0, removeDelta: 0, noSell: false,
  };
  const top = stakeIndex(id);
  for (let i = 0; i <= top; i++) {
    const step = STAKE_STEP[STAKE_IDS[i]];
    mods.rewardDelta += step.rewardDelta ?? 0;
    mods.healthMult *= step.healthMult ?? 1;
    mods.attackBonus += step.attackBonus ?? 0;
    mods.handDelta += step.handDelta ?? 0;
    mods.startGoldDelta += step.startGoldDelta ?? 0;
    mods.rerollDelta += step.rerollDelta ?? 0;
    mods.removeDelta += step.removeDelta ?? 0;
    mods.noSell = mods.noSell || !!step.noSell;
  }
  return mods;
}
