// PRISM — the "First Light" launch set (~60 cards). Pure DATA on the registry the engine reads.
// 5 Affinities × ~2 archetypes + neutrals, full rarity spread balanced AROUND rarity (tcg-design §3:
// rarer = bigger power budget, but capped + answerable). Adding a card here is data only — no engine
// change (§1). Numbers are the FIRST tuning pass; the sim (npm run sim) refines them.

import { Affinity, CardDef, Effect, KeywordTag, Rarity } from "../prism/types";
import { LAUNCH_SET_ID } from "./sets";

const BUDGET: Record<Rarity, number> = { common: 1.0, uncommon: 1.15, rare: 1.35, mythic: 1.6 };

function U(
  id: string,
  name: string,
  affinity: Affinity,
  cost: number,
  power: number,
  rarity: Rarity,
  text: string,
  keywords: KeywordTag[] = [],
  effects: Effect[] = [],
  flavor?: string,
): CardDef {
  return { id: `pr1_${id}`, name, setId: LAUNCH_SET_ID, affinity, type: "unit", cost, power, rarity, keywords, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}
function S(id: string, name: string, affinity: Affinity, cost: number, rarity: Rarity, text: string, effects: Effect[], flavor?: string): CardDef {
  return { id: `pr1_${id}`, name, setId: LAUNCH_SET_ID, affinity, type: "spell", cost, rarity, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}
function G(id: string, name: string, affinity: Affinity, cost: number, rarity: Rarity, text: string, effects: Effect[], flavor?: string): CardDef {
  return { id: `pr1_${id}`, name, setId: LAUNCH_SET_ID, affinity, type: "gear", cost, rarity, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}

export const LAUNCH_SET: CardDef[] = [
  // ── EMBER — Burn / Aggro-swarm (cheap, fast, reach) ───────────────────────────────────────────
  U("ember_imp", "Ember Imp", "ember", 1, 2, "common", "A cheap, eager body.", [], [], "First to the table, first to the fight."),
  U("cinder_sprite", "Cinder Sprite", "ember", 1, 2, "common", "Haste. Volatile (dies at the end of your turn).", [{ kw: "haste" }, { kw: "volatile" }], [], "A spark that burns bright and brief."),
  U("ember_brute", "Ember Brute", "ember", 3, 4, "common", "A solid beater.", []),
  U("ashfang_hound", "Ashfang Hound", "ember", 2, 3, "common", "Haste.", [{ kw: "haste" }]),
  U("emberkin_raider", "Emberkin Raider", "ember", 2, 3, "uncommon", "Haste.", [{ kw: "haste" }]),
  U("firefist_duelist", "Firefist Duelist", "ember", 3, 4, "rare", "Haste. Pierce.", [{ kw: "haste" }, { kw: "pierce" }]),
  S("flame_jab", "Flame Jab", "ember", 1, "common", "Deal 2 damage to a unit.", [{ kind: "damageUnit", n: 2, target: "enemyUnit" }]),
  S("scorch", "Scorch", "ember", 3, "uncommon", "Deal 4 damage to a unit.", [{ kind: "damageUnit", n: 4, target: "enemyUnit" }]),
  S("meteor", "Meteor", "ember", 4, "rare", "Deal 3 to the enemy Nexus and 3 to a unit.", [{ kind: "damageNexus", n: 3 }, { kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  U("solflare_avatar", "Solflare Avatar", "ember", 6, 7, "mythic", "Haste. Pierce. When deployed, deal 3 to the enemy Nexus.", [{ kw: "haste" }, { kw: "pierce" }], [{ kind: "damageNexus", n: 3 }], "The sky opens and the sun walks down."),

  // ── TIDE — Tempo / Draw-control (bounce, cards, shields) ──────────────────────────────────────
  U("tide_minnow", "Tide Minnow", "tide", 1, 2, "common", "A nimble blocker.", []),
  U("reef_scout", "Reef Scout", "tide", 2, 2, "common", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  U("tide_warden", "Tide Warden", "tide", 3, 3, "uncommon", "Guard.", [{ kw: "guard" }]),
  U("wavecaller", "Wavecaller", "tide", 3, 3, "uncommon", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  U("tide_oracle", "Tide Oracle", "tide", 4, 4, "rare", "When deployed, draw 2 cards.", [], [{ kind: "drawCards", n: 2 }]),
  S("undertow", "Undertow", "tide", 2, "common", "Return a unit to its owner's hand.", [{ kind: "bounce", target: "anyUnit" }]),
  S("foresight", "Foresight", "tide", 2, "uncommon", "Draw 2 cards.", [{ kind: "drawCards", n: 2 }]),
  S("riptide", "Riptide", "tide", 3, "rare", "Return a unit to hand, then draw a card.", [{ kind: "bounce", target: "anyUnit" }, { kind: "drawCards", n: 1 }]),
  G("mistveil", "Mistveil", "tide", 2, "uncommon", "Attached unit gets +1 power and Shield 2.", [{ kind: "buffPower", n: 1, target: "ownUnit" }, { kind: "grantShield", n: 2, target: "ownUnit" }]),
  U("abyssal_leviathan", "Abyssal Leviathan", "tide", 6, 8, "mythic", "Shield 3. When deployed, draw a card.", [{ kw: "shield", n: 3 }], [{ kind: "drawCards", n: 1 }], "It surfaces only to end things."),

  // ── VERDANT — Ramp / Go-tall (mana, big bodies, lifegain) ─────────────────────────────────────
  U("verdant_sprout", "Verdant Sprout", "verdant", 1, 2, "common", "A hardy starter.", []),
  U("briar_guardian", "Briar Guardian", "verdant", 2, 3, "common", "Guard.", [{ kw: "guard" }]),
  U("thorn_elk", "Thorn Elk", "verdant", 3, 4, "common", "A towering body.", []),
  U("verdant_tender", "Verdant Tender", "verdant", 2, 2, "uncommon", "Lifegain 3 (heal your Nexus 3 on deploy).", [{ kw: "lifegain", n: 3 }]),
  U("ancient_ent", "Ancient Ent", "verdant", 5, 5, "rare", "Guard.", [{ kw: "guard" }]),
  S("mana_grove", "Mana Grove", "verdant", 1, "common", "Gain +1 max Light.", [{ kind: "ramp", n: 1 }]),
  S("growth_surge", "Growth Surge", "verdant", 3, "uncommon", "Gain +2 max Light.", [{ kind: "ramp", n: 2 }]),
  S("root_network", "Root Network", "verdant", 2, "rare", "Draw a card and gain +1 max Light.", [{ kind: "drawCards", n: 1 }, { kind: "ramp", n: 1 }]),
  G("overgrowth", "Overgrowth", "verdant", 3, "uncommon", "Attached unit gets +4 power.", [{ kind: "buffPower", n: 4, target: "ownUnit" }]),
  U("world_titan", "World Titan", "verdant", 7, 8, "mythic", "Lifegain 4 (heal your Nexus 4 on deploy).", [{ kw: "lifegain", n: 4 }], [], "Older than the circuit, older than the game."),

  // ── GLOOM — Sacrifice / Attrition (drain, removal, reach) ─────────────────────────────────────
  U("gloom_wretch", "Gloom Wretch", "gloom", 1, 1, "common", "Cheap fodder.", []),
  U("grave_knight", "Grave Knight", "gloom", 3, 3, "common", "Drain.", [{ kw: "drain" }]),
  U("bone_golem", "Bone Golem", "gloom", 4, 5, "common", "A grim wall of bone.", []),
  U("dread_reaver", "Dread Reaver", "gloom", 2, 2, "uncommon", "Haste. Drain.", [{ kw: "haste" }, { kw: "drain" }]),
  U("nightshade_knight", "Nightshade Knight", "gloom", 4, 4, "rare", "Drain.", [{ kw: "drain" }]),
  S("wither", "Wither", "gloom", 2, "common", "Deal 3 damage to a unit.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  S("soul_drain", "Soul Drain", "gloom", 2, "uncommon", "Deal 2 to a unit and heal your Nexus 2.", [{ kind: "damageUnit", n: 2, target: "enemyUnit" }, { kind: "healNexus", n: 2 }]),
  S("grim_harvest", "Grim Harvest", "gloom", 3, "uncommon", "Deal 3 to the enemy Nexus and heal yours 3.", [{ kind: "damageNexus", n: 3 }, { kind: "healNexus", n: 3 }]),
  S("doom", "Doom", "gloom", 4, "rare", "Destroy a unit.", [{ kind: "destroyUnit", target: "anyUnit" }]),
  U("lord_of_gloom", "Lord of Gloom", "gloom", 5, 6, "mythic", "Drain. Pierce. When deployed, deal 2 to the enemy Nexus.", [{ kw: "drain" }, { kw: "pierce" }], [{ kind: "damageNexus", n: 2 }], "Every culled card feeds him."),

  // ── ORDER — Go-wide / Lockdown (shields, guard, buffs) ────────────────────────────────────────
  U("order_squire", "Order Squire", "order", 1, 2, "common", "Shield 1.", [{ kw: "shield", n: 1 }]),
  U("order_sentinel", "Order Sentinel", "order", 2, 2, "common", "Guard.", [{ kw: "guard" }]),
  U("field_medic", "Field Medic", "order", 2, 2, "common", "Lifegain 2 (heal your Nexus 2 on deploy).", [{ kw: "lifegain", n: 2 }]),
  U("lawkeeper", "Lawkeeper", "order", 3, 3, "uncommon", "Guard. Shield 1.", [{ kw: "guard" }, { kw: "shield", n: 1 }]),
  U("radiant_cleric", "Radiant Cleric", "order", 3, 3, "uncommon", "Lifegain 3 (heal your Nexus 3 on deploy).", [{ kw: "lifegain", n: 3 }]),
  U("high_marshal", "High Marshal", "order", 4, 4, "rare", "Guard.", [{ kw: "guard" }]),
  S("shield_wall", "Shield Wall", "order", 2, "common", "Give a unit Shield 3.", [{ kind: "grantShield", n: 3, target: "ownUnit" }]),
  S("rally", "Rally", "order", 2, "uncommon", "Give a unit +2 power and Shield 1.", [{ kind: "buffPower", n: 2, target: "ownUnit" }, { kind: "grantShield", n: 1, target: "ownUnit" }]),
  G("aegis_protocol", "Aegis Protocol", "order", 3, "rare", "Attached unit gets +2 power, Shield 3 and Guard.", [{ kind: "buffPower", n: 2, target: "ownUnit" }, { kind: "grantShield", n: 3, target: "ownUnit" }, { kind: "grantKeyword", kw: { kw: "guard" }, target: "ownUnit" }]),
  U("sunhammer_paladin", "Sunhammer Paladin", "order", 6, 7, "mythic", "Guard. Lifegain 3 (heal your Nexus 3 on deploy).", [{ kw: "guard" }, { kw: "lifegain", n: 3 }], [], "Order made manifest, hammer in hand."),

  // ── NEUTRAL — splashable glue + a colossal top-end ────────────────────────────────────────────
  U("scrap_drone", "Scrap Drone", "neutral", 1, 1, "common", "Refract+ (discard this to Refract for +2 Light instead of +1).", [{ kw: "refractplus" }], [], "Worth more melted down than fielded."),
  U("wanderer", "Wanderer", "neutral", 2, 2, "common", "No allegiance, all hustle.", []),
  U("mercenary", "Mercenary", "neutral", 3, 3, "common", "Pays for itself.", []),
  U("relic_hunter", "Relic Hunter", "neutral", 2, 2, "uncommon", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  U("traveling_merchant", "Traveling Merchant", "neutral", 3, 4, "uncommon", "Reliable muscle for hire.", []),
  U("iron_sentinel", "Iron Sentinel", "neutral", 4, 5, "uncommon", "Guard.", [{ kw: "guard" }]),
  S("blast_charge", "Blast Charge", "neutral", 2, "common", "Deal 3 damage to a unit.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  G("lightning_rod", "Lightning Rod", "neutral", 1, "common", "Attached unit gets +2 power.", [{ kind: "buffPower", n: 2, target: "ownUnit" }]),
  G("champions_blade", "Champion's Blade", "neutral", 3, "rare", "Attached unit gets +3 power and Pierce.", [{ kind: "buffPower", n: 3, target: "ownUnit" }, { kind: "grantKeyword", kw: { kw: "pierce" }, target: "ownUnit" }]),
  U("colossus", "Colossus", "neutral", 8, 9, "mythic", "An unanswerable wall of iron — if you can reach 8 Light.", [], [], "The circuit's final exam."),
];

// Reach: these damage spells may instead hit the enemy Nexus (caster's choice), so removal doubles
// as a clock — the lever that keeps aggro/tempo viable against go-tall in a 3-lane board.
const FACEABLE = new Set(["pr1_flame_jab", "pr1_scorch", "pr1_blast_charge", "pr1_wither", "pr1_soul_drain"]);
for (const c of LAUNCH_SET) if (FACEABLE.has(c.id)) c.faceable = true;
