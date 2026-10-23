// PrismNexus — the in-fiction community: a deck-tech FORUM and a set-review BLOG (diegetic UI, the
// content the user liked, reskinned to the game's pixel UI). DATA only; the News tab is derived from
// the campaign calendar (B&R + set drops). Blog posts embed a real decklist (rendered with a curve).

export interface ForumPost { author: string; sig?: string; text: string; }
export interface ForumThread { board: string; title: string; posts: ForumPost[]; }

export const FORUM_THREADS: ForumThread[] = [
  {
    board: "Metagame",
    title: "Is Verdant ramp just the best deck?",
    posts: [
      { author: "wallmaster", sig: "Greenwall enjoyer", text: "Ramp into a 7-drop and they just can't race it. Change my mind." },
      { author: "fastclock", sig: "Emberrush", text: "Reach burn says hi. Scorch your blockers, swing, send a Meteor to the face. The clock is real now." },
      { author: "PipsCards", text: "Friday's results had three different archetypes in the top 4. The format's healthier than you think." },
    ],
  },
  {
    board: "Deck Help",
    title: "New player — what do I build first?",
    posts: [
      { author: "rookie22", text: "Just got my Ember starter. Where do I go from here?" },
      { author: "cora_ace", sig: "Ironlaw, undefeated (mostly)", text: "Lean into Haste + reach burn early. Add a couple of Rares from packs, keep the curve low. Don't over-ramp." },
    ],
  },
  {
    board: "Rules Q&A",
    title: "Does Pierce get through Guard?",
    posts: [
      { author: "judge_nl", text: "Yes — Pierce ignores Guard entirely, and excess combat damage carries to the Nexus. Each Guard only stops ONE open-lane attack, too." },
    ],
  },
];

export interface BlogPost { title: string; author: string; date: string; deckId: string; body: string; }

export const BLOG_POSTS: BlogPost[] = [
  {
    title: "Set Review: First Light — the five Affinities ranked",
    author: "PrismTheory",
    date: "Launch week",
    deckId: "wildfire",
    body: "Ember and Tide set the early pace; Verdant ramp punishes slow draws; Gloom grinds; Order walls. My pick for week one is a Wildfire midrange list — ramp into beaters, burn to close. Decklist below.",
  },
  {
    title: "Tech: beating the Greenwall wall",
    author: "fastclock",
    date: "Week 2",
    deckId: "emberrush",
    body: "Post-B&R, World Titan is a one-of, so ramp's ceiling dropped. Pure Emberrush punishes the slow starts — hasty bodies, Pierce, and faceable burn. Sideboard your removal for their Guards.",
  },
];
