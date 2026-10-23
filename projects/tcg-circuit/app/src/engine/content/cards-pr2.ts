// PRISM Set 2 — "Tideturn" (~36 cards). New mechanics ship as keywords (tcg-design §1): RALLY (on
// deploy, your other units get +N power — a go-wide payoff, bounded by the 3 lanes) and VENGEANCE
// (on destroyed, deal N to the enemy Nexus — reach/inevitability for aggro & Gloom). Pure DATA.

import { Affinity, CardDef, Effect, KeywordTag, Rarity } from "../prism/types";

const SET = "pr2";
const BUDGET: Record<Rarity, number> = { common: 1.0, uncommon: 1.15, rare: 1.35, mythic: 1.6 };

function U(id: string, name: string, affinity: Affinity, cost: number, power: number, rarity: Rarity, text: string, keywords: KeywordTag[] = [], effects: Effect[] = [], flavor?: string): CardDef {
  return { id: `${SET}_${id}`, name, setId: SET, affinity, type: "unit", cost, power, rarity, keywords, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}
function S(id: string, name: string, affinity: Affinity, cost: number, rarity: Rarity, text: string, effects: Effect[], flavor?: string): CardDef {
  return { id: `${SET}_${id}`, name, setId: SET, affinity, type: "spell", cost, rarity, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}
function G(id: string, name: string, affinity: Affinity, cost: number, rarity: Rarity, text: string, effects: Effect[], flavor?: string): CardDef {
  return { id: `${SET}_${id}`, name, setId: SET, affinity, type: "gear", cost, rarity, effects, powerBudget: BUDGET[rarity], text, art: null, flavor };
}

export const SET2: CardDef[] = [
  // ── EMBER — Vengeance aggro (reach on death) ──
  U("flare_imp", "Flare Imp", "ember", 1, 1, "common", "Haste. Vengeance 1.", [{ kw: "haste" }, { kw: "vengeance", n: 1 }]),
  U("ember_zealot", "Ember Zealot", "ember", 2, 2, "common", "Vengeance 1 (deal 1 to the enemy Nexus when destroyed).", [{ kw: "vengeance", n: 1 }]),
  U("cinder_revenant", "Cinder Revenant", "ember", 3, 3, "uncommon", "Vengeance 2.", [{ kw: "vengeance", n: 2 }]),
  U("pyre_champion", "Pyre Champion", "ember", 4, 4, "rare", "Haste. Vengeance 2.", [{ kw: "haste" }, { kw: "vengeance", n: 2 }]),
  S("ashflare", "Ashflare", "ember", 1, "common", "Deal 2 to a unit or the enemy Nexus.", [{ kind: "damageUnit", n: 2, target: "enemyUnit" }]),
  S("emberstorm", "Emberstorm", "ember", 4, "uncommon", "Deal 3 to a unit, then 2 to the enemy Nexus.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }, { kind: "damageNexus", n: 2 }]),
  U("immolation_drake", "Immolation Drake", "ember", 6, 6, "mythic", "Haste. Pierce. Vengeance 3.", [{ kw: "haste" }, { kw: "pierce" }, { kw: "vengeance", n: 3 }], [], "It burns brightest as it falls."),

  // ── TIDE — Tempo & card flow ──
  U("tide_skirmisher", "Tide Skirmisher", "tide", 2, 2, "common", "A nimble body.", []),
  U("current_sage", "Current Sage", "tide", 3, 3, "uncommon", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  U("spring_tide", "Spring Tide", "tide", 5, 5, "rare", "Shield 2. When deployed, draw a card.", [{ kw: "shield", n: 2 }], [{ kind: "drawCards", n: 1 }]),
  S("ebb", "Ebb", "tide", 1, "common", "Return a unit to its owner's hand.", [{ kind: "bounce", target: "anyUnit" }]),
  S("undertow_master", "Undertow Master", "tide", 3, "rare", "Return a unit to hand, then draw a card.", [{ kind: "bounce", target: "anyUnit" }, { kind: "drawCards", n: 1 }]),
  G("mistshaper", "Mistshaper", "tide", 2, "uncommon", "Attached unit gets +2 power and Shield 1.", [{ kind: "buffPower", n: 2, target: "ownUnit" }, { kind: "grantShield", n: 1, target: "ownUnit" }]),

  // ── VERDANT — Midrange bodies & ramp ──
  U("grove_keeper", "Grove Keeper", "verdant", 2, 3, "common", "A sturdy body.", []),
  U("thornwall", "Thornwall", "verdant", 2, 4, "common", "Guard.", [{ kw: "guard" }]),
  U("wildgrowth_shaman", "Wildgrowth Shaman", "verdant", 3, 3, "uncommon", "When deployed, gain +1 max Light.", [], [{ kind: "ramp", n: 1 }]),
  U("titanbark", "Titanbark", "verdant", 5, 6, "rare", "Guard.", [{ kw: "guard" }]),
  S("verdant_bounty", "Verdant Bounty", "verdant", 2, "uncommon", "Draw a card and gain +1 max Light.", [{ kind: "drawCards", n: 1 }, { kind: "ramp", n: 1 }]),
  U("elderwood_colossus", "Elderwood Colossus", "verdant", 7, 8, "mythic", "Guard. Lifegain 3.", [{ kw: "guard" }, { kw: "lifegain", n: 3 }], [], "Roots older than the circuit."),

  // ── GLOOM — Vengeance attrition ──
  U("gloom_acolyte", "Gloom Acolyte", "gloom", 1, 2, "common", "Vengeance 1.", [{ kw: "vengeance", n: 1 }]),
  U("soulreaper", "Soulreaper", "gloom", 3, 3, "uncommon", "Drain. Vengeance 1.", [{ kw: "drain" }, { kw: "vengeance", n: 1 }]),
  U("plaguebearer", "Plaguebearer", "gloom", 4, 4, "rare", "Vengeance 3.", [{ kw: "vengeance", n: 3 }]),
  S("graspingdark", "Grasping Dark", "gloom", 2, "common", "Deal 3 to a unit or the enemy Nexus.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  S("last_rite", "Last Rite", "gloom", 3, "uncommon", "Deal 3 to the enemy Nexus and heal your Nexus 3.", [{ kind: "damageNexus", n: 3 }, { kind: "healNexus", n: 3 }]),
  U("dread_monarch", "Dread Monarch", "gloom", 5, 6, "mythic", "Drain. Pierce. Vengeance 2.", [{ kw: "drain" }, { kw: "pierce" }, { kw: "vengeance", n: 2 }], [], "Death is only a promotion."),

  // ── ORDER — Rally / go-wide ──
  U("order_recruit", "Order Recruit", "order", 1, 2, "common", "A loyal body.", []),
  U("shieldmaiden", "Shieldmaiden", "order", 2, 3, "common", "Shield 1.", [{ kw: "shield", n: 1 }]),
  U("banner_bearer", "Banner Bearer", "order", 2, 2, "uncommon", "Rally 1 (your other units get +1 power on deploy).", [{ kw: "rally", n: 1 }]),
  U("lawgiver", "Lawgiver", "order", 3, 4, "uncommon", "Guard.", [{ kw: "guard" }]),
  U("warleader", "Warleader", "order", 4, 4, "rare", "Rally 2.", [{ kw: "rally", n: 2 }]),
  U("host_commander", "Host Commander", "order", 6, 5, "mythic", "Guard. Rally 2.", [{ kw: "guard" }, { kw: "rally", n: 2 }], [], "Where the banner goes, the host follows."),

  // ── NEUTRAL — glue + splashable payoffs ──
  U("drifter", "Drifter", "neutral", 2, 2, "common", "No allegiance, all grit.", []),
  U("sellsword", "Sellsword", "neutral", 3, 3, "common", "Paid in advance.", []),
  U("relic_keeper", "Relic Keeper", "neutral", 2, 2, "uncommon", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  G("warhorn", "Warhorn", "neutral", 2, "rare", "Attached unit gets +2 power and Vengeance 2.", [{ kind: "buffPower", n: 2, target: "ownUnit" }, { kind: "grantKeyword", kw: { kw: "vengeance", n: 2 }, target: "ownUnit" }]),
  U("mercenary_captain", "Mercenary Captain", "neutral", 4, 4, "uncommon", "Reliable hired steel.", []),
  U("war_titan", "War Titan", "neutral", 7, 8, "mythic", "Vengeance 3.", [{ kw: "vengeance", n: 3 }], [], "Even its fall is an attack."),
];

const FACEABLE = new Set(["pr2_ashflare", "pr2_graspingdark"]);
for (const c of SET2) if (FACEABLE.has(c.id)) c.faceable = true;
