// PRISM Set 3 — "Deeproots" (~36 cards). New keyword MOMENTUM (this unit gains +N power at the start
// of each of your turns — a go-tall payoff for Verdant). Per tcg-design §1, a set also brings ANSWERS:
// Deeproots adds more removal (to keep Set 2's go-wide Rally + growth honest). Pure DATA.

import { Affinity, CardDef, Effect, KeywordTag, Rarity } from "../prism/types";

const SET = "pr3";
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

export const SET3: CardDef[] = [
  // ── VERDANT — Momentum / go-tall growth ──
  U("sapling", "Sapling", "verdant", 1, 1, "common", "Momentum 1 (gains +1 power at the start of your turn).", [{ kw: "momentum", n: 1 }]),
  U("creeping_vine", "Creeping Vine", "verdant", 2, 2, "common", "Momentum 1.", [{ kw: "momentum", n: 1 }]),
  U("heartwood_guard", "Heartwood Guard", "verdant", 3, 3, "uncommon", "Guard. Momentum 1.", [{ kw: "guard" }, { kw: "momentum", n: 1 }]),
  U("ancient_grovelord", "Ancient Grovelord", "verdant", 5, 5, "rare", "Momentum 1.", [{ kw: "momentum", n: 1 }]),
  S("deeproot_ritual", "Deeproot Ritual", "verdant", 2, "uncommon", "Gain +2 max Light.", [{ kind: "ramp", n: 2 }]),
  G("verdant_vigor", "Verdant Vigor", "verdant", 2, "rare", "Attached unit gets +1 power and Momentum 1.", [{ kind: "buffPower", n: 1, target: "ownUnit" }, { kind: "grantKeyword", kw: { kw: "momentum", n: 1 }, target: "ownUnit" }]),
  U("worldroot_behemoth", "Worldroot Behemoth", "verdant", 7, 7, "mythic", "Momentum 1. Lifegain 2.", [{ kw: "momentum", n: 1 }, { kw: "lifegain", n: 2 }], [], "It does not grow old. It simply grows."),

  // ── TIDE — Value & an answer (bounce stalls momentum) ──
  U("reef_diviner", "Reef Diviner", "tide", 2, 2, "common", "When deployed, draw a card.", [], [{ kind: "drawCards", n: 1 }]),
  U("deepwatcher", "Deepwatcher", "tide", 4, 4, "uncommon", "Shield 1. When deployed, draw a card.", [{ kw: "shield", n: 1 }], [{ kind: "drawCards", n: 1 }]),
  S("tidal_recall", "Tidal Recall", "tide", 2, "common", "Return a unit to its owner's hand. (Resets a Momentum threat.)", [{ kind: "bounce", target: "anyUnit" }]),
  S("deep_study", "Deep Study", "tide", 3, "uncommon", "Draw 2 cards.", [{ kind: "drawCards", n: 2 }]),
  U("leviathan_calf", "Leviathan Calf", "tide", 3, 3, "rare", "Momentum 1. When deployed, draw a card.", [{ kw: "momentum", n: 1 }], [{ kind: "drawCards", n: 1 }]),

  // ── EMBER — Haste & reach (punish slow growth) ──
  U("scorchling", "Scorchling", "ember", 1, 2, "common", "Haste.", [{ kw: "haste" }]),
  U("blazerunner", "Blazerunner", "ember", 3, 3, "uncommon", "Haste. Pierce.", [{ kw: "haste" }, { kw: "pierce" }]),
  S("firebrand", "Firebrand", "ember", 2, "common", "Deal 3 to a unit or the enemy Nexus.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  S("cinder_volley", "Cinder Volley", "ember", 3, "uncommon", "Deal 4 to a unit or the enemy Nexus.", [{ kind: "damageUnit", n: 4, target: "enemyUnit" }]),
  U("inferno_herald", "Inferno Herald", "ember", 5, 5, "rare", "Haste. When deployed, deal 2 to the enemy Nexus.", [{ kw: "haste" }], [{ kind: "damageNexus", n: 2 }]),

  // ── GLOOM — Removal (the answer to go-wide + growth) ──
  U("rotcaller", "Rotcaller", "gloom", 2, 2, "common", "Drain.", [{ kw: "drain" }]),
  U("bonecharm_witch", "Bonecharm Witch", "gloom", 3, 3, "uncommon", "Vengeance 1.", [{ kw: "vengeance", n: 1 }]),
  S("wickerblight", "Wickerblight", "gloom", 2, "common", "Deal 3 to a unit or the enemy Nexus.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  S("annihilate", "Annihilate", "gloom", 4, "rare", "Destroy a unit.", [{ kind: "destroyUnit", target: "anyUnit" }]),
  S("creeping_rot", "Creeping Rot", "gloom", 3, "uncommon", "Deal 5 to a unit.", [{ kind: "damageUnit", n: 5, target: "enemyUnit" }]),
  U("famine_lord", "Famine Lord", "gloom", 6, 6, "mythic", "Drain. Vengeance 3.", [{ kw: "drain" }, { kw: "vengeance", n: 3 }], [], "Everything withers in his shadow."),

  // ── ORDER — Walls, heal & a wide-board answer ──
  U("warden_initiate", "Warden Initiate", "order", 2, 3, "common", "Guard.", [{ kw: "guard" }]),
  U("cleric_of_dawn", "Cleric of Dawn", "order", 2, 2, "common", "Lifegain 2.", [{ kw: "lifegain", n: 2 }]),
  U("bulwark_knight", "Bulwark Knight", "order", 4, 4, "uncommon", "Guard. Shield 2.", [{ kw: "guard" }, { kw: "shield", n: 2 }]),
  S("smite", "Smite", "order", 3, "uncommon", "Deal 4 to a unit.", [{ kind: "damageUnit", n: 4, target: "enemyUnit" }]),
  G("sanctified_arms", "Sanctified Arms", "order", 3, "rare", "Attached unit gets +2 power, Shield 2 and Guard.", [{ kind: "buffPower", n: 2, target: "ownUnit" }, { kind: "grantShield", n: 2, target: "ownUnit" }, { kind: "grantKeyword", kw: { kw: "guard" }, target: "ownUnit" }]),
  U("dawnbreaker_paladin", "Dawnbreaker Paladin", "order", 6, 7, "mythic", "Guard. Lifegain 4.", [{ kw: "guard" }, { kw: "lifegain", n: 4 }], [], "The first light over the wall."),

  // ── NEUTRAL — glue + answers ──
  U("wayfarer", "Wayfarer", "neutral", 2, 2, "common", "Travels light, fights hard.", []),
  U("ironclad", "Ironclad", "neutral", 4, 5, "uncommon", "Guard.", [{ kw: "guard" }]),
  S("disrupt", "Disrupt", "neutral", 2, "common", "Deal 3 to a unit.", [{ kind: "damageUnit", n: 3, target: "enemyUnit" }]),
  G("growth_serum", "Growth Serum", "neutral", 2, "uncommon", "Attached unit gets +3 power.", [{ kind: "buffPower", n: 3, target: "ownUnit" }]),
  U("vault_guardian", "Vault Guardian", "neutral", 5, 6, "rare", "Guard. Shield 2.", [{ kw: "guard" }, { kw: "shield", n: 2 }]),
];

const FACEABLE = new Set(["pr3_firebrand", "pr3_cinder_volley", "pr3_wickerblight", "pr3_disrupt"]);
for (const c of SET3) if (FACEABLE.has(c.id)) c.faceable = true;
