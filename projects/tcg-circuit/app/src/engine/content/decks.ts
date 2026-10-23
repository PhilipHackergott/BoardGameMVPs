// Prebuilt archetype decks — DATA. One+ per archetype so the game is instantly playable, and the
// pool the deckbuilder / Gauntlet / sim draw from. Every list is exactly 30 and Standard-legal
// (max 3 copies; Solflare Avatar limited to 1). Affinity is a card identity, not a build restriction
// (Light is universal), so hybrids are legal.

export type Archetype = "aggro" | "tempo" | "ramp" | "attrition" | "lockdown" | "midrange" | "control";

export interface DeckList {
  id: string;
  name: string;
  affinity: string; // primary affinity label (or "multi")
  archetype: Archetype;
  description: string;
  cards: { id: string; count: number }[];
}

export function expandDeck(d: DeckList): string[] {
  // Card ids may be bare (legacy pr1 lists, e.g. "ember_imp") or fully-qualified ("pr2_warleader").
  const full = (id: string) => (/^pr\d+_/.test(id) ? id : `pr1_${id}`);
  const out: string[] = [];
  for (const { id, count } of d.cards) for (let i = 0; i < count; i++) out.push(full(id));
  return out;
}

export const DECKS: DeckList[] = [
  {
    id: "emberrush",
    name: "Emberrush",
    affinity: "ember",
    archetype: "aggro",
    description: "Cheap hasty bodies and burn — end it before they stabilize.",
    cards: [
      { id: "ember_imp", count: 3 }, { id: "cinder_sprite", count: 3 }, { id: "ashfang_hound", count: 3 },
      { id: "emberkin_raider", count: 3 }, { id: "ember_brute", count: 3 }, { id: "firefist_duelist", count: 3 },
      { id: "flame_jab", count: 3 }, { id: "scorch", count: 3 }, { id: "meteor", count: 2 },
      { id: "solflare_avatar", count: 1 }, { id: "lightning_rod", count: 3 },
    ],
  },
  {
    id: "tidewatch",
    name: "Tidewatch",
    affinity: "tide",
    archetype: "tempo",
    description: "Bounce, card draw, and shielded threats that grind you out.",
    cards: [
      { id: "tide_minnow", count: 3 }, { id: "reef_scout", count: 3 }, { id: "tide_warden", count: 3 },
      { id: "wavecaller", count: 3 }, { id: "tide_oracle", count: 3 }, { id: "undertow", count: 3 },
      { id: "foresight", count: 3 }, { id: "riptide", count: 2 }, { id: "mistveil", count: 2 },
      { id: "abyssal_leviathan", count: 2 }, { id: "blast_charge", count: 3 },
    ],
  },
  {
    id: "wildgrowth",
    name: "Wildgrowth",
    affinity: "verdant",
    archetype: "ramp",
    description: "Ramp your Light, then drop bodies nothing can trade with.",
    cards: [
      { id: "verdant_sprout", count: 3 }, { id: "briar_guardian", count: 3 }, { id: "thorn_elk", count: 3 },
      { id: "verdant_tender", count: 3 }, { id: "ancient_ent", count: 3 }, { id: "mana_grove", count: 3 },
      { id: "growth_surge", count: 3 }, { id: "root_network", count: 2 }, { id: "overgrowth", count: 2 },
      { id: "world_titan", count: 2 }, { id: "colossus", count: 1 }, { id: "iron_sentinel", count: 2 },
    ],
  },
  {
    id: "gravetide",
    name: "Gravetide",
    affinity: "gloom",
    archetype: "attrition",
    description: "Drain, removal, and reach — out-attrition the table.",
    cards: [
      { id: "gloom_wretch", count: 3 }, { id: "grave_knight", count: 3 }, { id: "bone_golem", count: 3 },
      { id: "dread_reaver", count: 3 }, { id: "nightshade_knight", count: 3 }, { id: "lord_of_gloom", count: 2 },
      { id: "wither", count: 3 }, { id: "soul_drain", count: 3 }, { id: "grim_harvest", count: 2 },
      { id: "doom", count: 2 }, { id: "blast_charge", count: 3 },
    ],
  },
  {
    id: "ironlaw",
    name: "Ironlaw",
    affinity: "order",
    archetype: "lockdown",
    description: "Walls, shields, and healing — lock the board and grind.",
    cards: [
      { id: "order_squire", count: 3 }, { id: "order_sentinel", count: 3 }, { id: "field_medic", count: 3 },
      { id: "lawkeeper", count: 3 }, { id: "radiant_cleric", count: 3 }, { id: "high_marshal", count: 3 },
      { id: "shield_wall", count: 3 }, { id: "rally", count: 3 }, { id: "aegis_protocol", count: 2 },
      { id: "sunhammer_paladin", count: 1 }, { id: "iron_sentinel", count: 3 },
    ],
  },
  {
    id: "cinderblood",
    name: "Cinderblood",
    affinity: "multi",
    archetype: "aggro",
    description: "Ember speed spliced with Gloom drain — fast and relentless.",
    cards: [
      { id: "cinder_sprite", count: 3 }, { id: "ashfang_hound", count: 3 }, { id: "ember_brute", count: 3 },
      { id: "grave_knight", count: 3 }, { id: "dread_reaver", count: 3 }, { id: "flame_jab", count: 3 },
      { id: "wither", count: 3 }, { id: "scorch", count: 2 }, { id: "grim_harvest", count: 2 },
      { id: "lord_of_gloom", count: 2 }, { id: "blast_charge", count: 3 },
    ],
  },
  {
    id: "bastion",
    name: "Bastion",
    affinity: "multi",
    archetype: "control",
    description: "Tide card advantage behind Order walls, closing with Leviathans.",
    cards: [
      { id: "tide_warden", count: 3 }, { id: "reef_scout", count: 3 }, { id: "wavecaller", count: 3 },
      { id: "order_sentinel", count: 3 }, { id: "lawkeeper", count: 3 }, { id: "high_marshal", count: 3 },
      { id: "foresight", count: 3 }, { id: "shield_wall", count: 2 }, { id: "riptide", count: 2 },
      { id: "abyssal_leviathan", count: 2 }, { id: "radiant_cleric", count: 3 },
    ],
  },
  {
    id: "greenwall",
    name: "Greenwall",
    affinity: "multi",
    archetype: "ramp",
    description: "Ramp into a wall of Guards, then the biggest things in the game.",
    cards: [
      { id: "mana_grove", count: 3 }, { id: "growth_surge", count: 3 }, { id: "briar_guardian", count: 3 },
      { id: "order_sentinel", count: 3 }, { id: "ancient_ent", count: 3 }, { id: "high_marshal", count: 3 },
      { id: "iron_sentinel", count: 3 }, { id: "world_titan", count: 2 }, { id: "sunhammer_paladin", count: 1 },
      { id: "colossus", count: 1 }, { id: "verdant_tender", count: 3 }, { id: "root_network", count: 2 },
    ],
  },
  {
    id: "drownmark",
    name: "Drownmark",
    affinity: "multi",
    archetype: "attrition",
    description: "Gloom removal and Tide draw — answer everything, then drain them out.",
    cards: [
      { id: "wither", count: 3 }, { id: "soul_drain", count: 3 }, { id: "doom", count: 2 },
      { id: "grim_harvest", count: 2 }, { id: "undertow", count: 3 }, { id: "foresight", count: 3 },
      { id: "reef_scout", count: 3 }, { id: "grave_knight", count: 3 }, { id: "nightshade_knight", count: 3 },
      { id: "lord_of_gloom", count: 2 }, { id: "bone_golem", count: 3 },
    ],
  },
  {
    id: "wildfire",
    name: "Wildfire",
    affinity: "multi",
    archetype: "midrange",
    description: "Ramp into Ember beaters and burn — a midrange powerhouse.",
    cards: [
      { id: "mana_grove", count: 3 }, { id: "growth_surge", count: 2 }, { id: "ember_brute", count: 3 },
      { id: "thorn_elk", count: 3 }, { id: "emberkin_raider", count: 3 }, { id: "firefist_duelist", count: 3 },
      { id: "ancient_ent", count: 3 }, { id: "scorch", count: 3 }, { id: "meteor", count: 2 },
      { id: "overgrowth", count: 2 }, { id: "solflare_avatar", count: 1 }, { id: "lightning_rod", count: 2 },
    ],
  },
];

// ── Set 2/3 archetype decks (showcase the new keywords; also exercise the expanded pool in the sim) ──
DECKS.push(
  {
    id: "vanguard",
    name: "Vanguard",
    affinity: "order",
    archetype: "lockdown",
    description: "Order go-wide: Rally pumps the board, walls hold the line (Tideturn).",
    cards: [
      { id: "pr2_order_recruit", count: 3 }, { id: "pr2_shieldmaiden", count: 3 }, { id: "pr2_banner_bearer", count: 3 },
      { id: "pr2_lawgiver", count: 3 }, { id: "pr2_warleader", count: 3 }, { id: "pr2_host_commander", count: 1 },
      { id: "rally", count: 3 }, { id: "shield_wall", count: 3 }, { id: "pr3_sanctified_arms", count: 2 },
      { id: "pr3_cleric_of_dawn", count: 3 }, { id: "pr3_warden_initiate", count: 3 },
    ],
  },
  {
    id: "revenant",
    name: "Revenant Rush",
    affinity: "multi",
    archetype: "aggro",
    description: "Ember/Gloom Vengeance: hit fast, and hit again when your units die (Tideturn).",
    cards: [
      { id: "pr2_flare_imp", count: 3 }, { id: "pr2_ember_zealot", count: 3 }, { id: "pr2_cinder_revenant", count: 3 },
      { id: "pr2_gloom_acolyte", count: 3 }, { id: "pr2_soulreaper", count: 3 }, { id: "pr2_pyre_champion", count: 3 },
      { id: "pr2_ashflare", count: 3 }, { id: "pr2_graspingdark", count: 3 }, { id: "pr2_plaguebearer", count: 2 },
      { id: "pr2_war_titan", count: 1 }, { id: "pr2_warhorn", count: 3 },
    ],
  },
  {
    id: "overgrowth",
    name: "Overgrowth",
    affinity: "verdant",
    archetype: "ramp",
    description: "Verdant Momentum: grow small threats, ramp into big ones (Deeproots).",
    cards: [
      { id: "pr3_sapling", count: 3 }, { id: "pr3_creeping_vine", count: 3 }, { id: "pr3_heartwood_guard", count: 3 },
      { id: "pr2_grove_keeper", count: 3 }, { id: "pr2_thornwall", count: 3 }, { id: "pr3_ancient_grovelord", count: 2 },
      { id: "mana_grove", count: 3 }, { id: "pr3_deeproot_ritual", count: 2 }, { id: "pr3_verdant_vigor", count: 2 },
      { id: "pr3_worldroot_behemoth", count: 2 }, { id: "pr3_growth_serum", count: 2 }, { id: "thorn_elk", count: 2 },
    ],
  },
  {
    id: "deepcontrol",
    name: "Deep Control",
    affinity: "multi",
    archetype: "control",
    description: "Tide/Gloom: answer everything with Deeproots removal, drain them out.",
    cards: [
      { id: "pr3_reef_diviner", count: 3 }, { id: "pr3_deepwatcher", count: 3 }, { id: "pr2_current_sage", count: 3 },
      { id: "pr3_rotcaller", count: 3 }, { id: "pr3_bonecharm_witch", count: 3 }, { id: "pr3_deep_study", count: 3 },
      { id: "pr3_annihilate", count: 2 }, { id: "pr3_creeping_rot", count: 3 }, { id: "pr3_wickerblight", count: 3 },
      { id: "pr3_famine_lord", count: 2 }, { id: "pr3_tidal_recall", count: 2 },
    ],
  },
);

export function getDeck(id: string): DeckList {
  const d = DECKS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown deck: ${id}`);
  return d;
}

/** A friendly starter for onboarding — a simple, forgiving aggro list. */
export const STARTER_DECK_ID = "emberrush";
