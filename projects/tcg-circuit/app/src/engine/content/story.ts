// Act I — "Discovery" story script. DATA the career engine + the world UI both read. Each step names
// where to go, who/what to interact with, the dialogue, and (for duel steps) which ROSTER opponent to
// face — you advance on a WIN. The full discover→Worlds arc (Acts II–IV) is deferred.

import { LocationId } from "../career/types";

export interface Line { speaker: string; text: string; }

export interface StoryStep {
  id: string;
  objective: string;
  location: LocationId; // where the next beat happens (HUD hint)
  target: string; // npc/object id to interact with to progress
  duelOpponent?: string; // ROSTER id; if set, interacting starts a story duel (advance on win)
  preDialogue: Line[];
  winDialogue?: Line[]; // after a won duel
  lossDialogue?: Line[]; // after a lost duel (retry)
  rewardMoney?: number;
  setFlags?: string[];
  unlockDeck?: string;
}

export const ACT1: StoryStep[] = [
  {
    id: "wake",
    objective: "Talk to your sister before school.",
    location: "home",
    target: "sis",
    preDialogue: [
      { speaker: "Sis", text: "You're STILL in bed? Everyone at school is playing that new card game." },
      { speaker: "Sis", text: "It's called PRISM. Pip's Cards downtown is handing out free starter decks." },
      { speaker: "You", text: "…a card game. Huh. Maybe I'll swing by." },
    ],
    setFlags: ["heard_about_prism"],
  },
  {
    id: "meet_pip",
    objective: "Go downtown to Pip's Cards and meet the owner.",
    location: "shop",
    target: "pip",
    preDialogue: [
      { speaker: "Pip", text: "Welcome to Pip's Cards! First time? Here — a free Ember starter on the house." },
      { speaker: "Pip", text: "PRISM's simple: drop your Nexus to zero before they drop yours. Go try it at the table." },
      { speaker: "You", text: "Thanks! Let's see what this is about." },
    ],
    unlockDeck: "emberrush",
    setFlags: ["got_starter"],
  },
  {
    id: "tutorial",
    objective: "Learn the game — duel Milo at the play table.",
    location: "shop",
    target: "milo",
    duelOpponent: "milo",
    preDialogue: [
      { speaker: "Milo", text: "Oh hey, new blood! I'm Milo. I'll go easy — just deploy a unit and swing at my Nexus." },
    ],
    winDialogue: [
      { speaker: "Milo", text: "Nice! You've got the hang of it already." },
      { speaker: "Pip", text: "A natural. Here's a little something for the win." },
    ],
    lossDialogue: [{ speaker: "Milo", text: "Close! Refract a dead card for extra Light and try again." }],
    rewardMoney: 3,
    setFlags: ["learned_game"],
  },
  {
    id: "meet_rival",
    objective: "Head to school. Your classmate Vex has noticed your deck.",
    location: "school",
    target: "vex",
    preDialogue: [
      { speaker: "Vex", text: "You're the one Pip's been talking up? Cute. I've been playing since the beta." },
      { speaker: "Vex", text: "Meet me after class. I'll show you what a REAL deck looks like." },
      { speaker: "You", text: "…game on." },
    ],
    setFlags: ["rival_met"],
  },
  {
    id: "rival_duel",
    objective: "Duel your rival Vex.",
    location: "school",
    target: "vex",
    duelOpponent: "vex",
    preDialogue: [{ speaker: "Vex", text: "Cinderblood — fast and mean. Let's see if your starter can keep up." }],
    winDialogue: [
      { speaker: "Vex", text: "…okay. Okay! That was actually good. Don't let it go to your head." },
      { speaker: "Vex", text: "There's a Friday Night event at Pip's. You should enter. I'll be there." },
    ],
    lossDialogue: [{ speaker: "Vex", text: "Hah! Come back when your deck's tighter." }],
    rewardMoney: 5,
    setFlags: ["beat_rival"],
  },
  {
    id: "fnm_signup",
    objective: "Sign up for Friday Night at Pip's — check the events board.",
    location: "shop",
    target: "events_board",
    preDialogue: [
      { speaker: "You", text: "Friday Night PRISM — single elimination. Winner takes the pot." },
      { speaker: "Pip", text: "You're in! Cora's the one to beat — she's never lost a Friday here." },
    ],
    setFlags: ["fnm_signed"],
  },
  {
    id: "fnm_final",
    objective: "Win Friday Night — beat the shop ace, Cora.",
    location: "shop",
    target: "cora",
    duelOpponent: "cora",
    preDialogue: [{ speaker: "Cora", text: "So you're the upstart. I build walls nothing gets through. Show me." }],
    winDialogue: [
      { speaker: "Cora", text: "Unbelievable. Nobody breaks my Ironlaw. …well played, kid." },
      { speaker: "Pip", text: "FIRST FRIDAY WIN! The whole shop saw that. You're on the map now." },
    ],
    lossDialogue: [{ speaker: "Cora", text: "The wall holds. Tune your deck and come back." }],
    rewardMoney: 15,
    setFlags: ["fnm_won"],
  },
  {
    id: "finale",
    objective: "Talk to Pip — you've made a name at the local shop.",
    location: "shop",
    target: "pip",
    preDialogue: [
      { speaker: "Pip", text: "Word travels fast. There's a Regional Qualifier across town next month." },
      { speaker: "Pip", text: "Bigger decks, bigger names. The circuit's only just begun for you." },
      { speaker: "You", text: "Then I'd better keep brewing." },
    ],
    setFlags: ["act1_complete"],
  },
];
