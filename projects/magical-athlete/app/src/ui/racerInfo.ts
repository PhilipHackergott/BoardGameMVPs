// Human-readable power reference for the UI — so every player's drafted cards are referenceable at a
// glance. Keyed by powerId; each entry mirrors the behaviour implemented in engine/powers.ts +
// engine/resolve.ts (our own implementation notes, not CMYK's verbatim card text). Keep in sync if a
// power's behaviour changes.

import type { Racer } from '../engine';

export interface PowerInfo {
  /** Flavour name of the ability. */
  title: string;
  /** One-line description of what it does, matching the engine. */
  blurb: string;
}

export const POWER_INFO: Record<string, PowerInfo> = {
  gunk: { title: 'Goop ’Em', blurb: 'Every other racer’s main move is −1.' },
  blimp: { title: 'Blow It', blurb: 'Big boost early, small penalty after the second corner.' },
  coach: { title: 'Good Hustle', blurb: 'Everyone sharing my space (me included) gets +1 to their move.' },
  hare: { title: 'Hubris', blurb: '+2 to my move — but if I’m alone in the lead I skip it for a chip.' },
  banana: { title: 'The Slip', blurb: 'Any racer that passes me trips.' },
  centaur: { title: 'Hoofwhack', blurb: 'When I pass a racer, they’re knocked back 2.' },
  romantic: { title: 'Ah, Love!', blurb: 'When anyone lands beside exactly one other racer, I move 2.' },
  lackey: { title: 'Very Good, Sire', blurb: 'When another racer rolls a 6, I move 2 first.' },
  heckler: { title: 'Schadenfreude', blurb: 'When a racer barely moves (≤1), I move 2.' },
  'baba-yaga': { title: 'Leg It', blurb: 'Trip any racer that lands on my space — or that I land on.' },
  'party-animal': { title: 'Animal Magnetism', blurb: 'Pull every racer 1 toward me; +1 to my move per racer beside me.' },
  'huge-baby': { title: 'Really Huge', blurb: 'No one shares my space — they’re bumped to right behind me.' },
  mouth: { title: 'Chomp', blurb: 'Land beside a lone racer and eliminate them.' },
  'lovable-loser': { title: 'D’aww', blurb: 'Take a chip before my move whenever I’m alone in last.' },
  skipper: { title: 'Salty Dog', blurb: 'When anyone rolls a 1, I take the next turn.' },
  inchworm: { title: 'Wriggle', blurb: 'When another rolls a 1 (with Skipper racing), I move 1 and Skipper goes next.' },
  scoocher: { title: 'Scooch Scooch', blurb: 'Whenever any power activates, I scooch 1 forward.' },
  copycat: { title: 'Copy That', blurb: 'I always have the power of the current lead racer.' },
  twin: { title: 'Just Like You', blurb: 'I copy the power of the most recent race winner.' },
  egg: { title: 'Hatchling', blurb: 'I hatch into a copy of an undrafted racer’s power.' },
  leaptoad: { title: 'Jumpfrog', blurb: 'I leap over occupied spaces for free — they don’t count.' },
  stickler: { title: 'Actually…', blurb: 'Other racers must land exactly on the finish; overshoot = no move.' },
  mastermind: { title: 'Know-It-All', blurb: 'Predict the winner on turn one; if right, I finish 2nd.' },
  legs: { title: 'Stretch', blurb: 'I may skip the die and move exactly 5 instead.' },
  'flip-flop': { title: 'Switcheroo', blurb: 'I may swap places with another racer instead of moving.' },
  hypnotist: { title: 'Mesmerize', blurb: 'I may pull another racer to my space, then roll.' },
  'third-wheel': { title: 'Crash the Party', blurb: 'I may roll straight to a space holding two racers.' },
  cheerleader: { title: 'Go Team!', blurb: 'I may move the last-place racers +2 each, then move 1.' },
  genius: { title: 'Think Good', blurb: 'Predict my roll; if right, I get an extra turn.' },
  alchemist: { title: 'Transmute', blurb: 'On a roll of 1 or 2, I may move 4 instead.' },
  magician: { title: 'Abracadabra', blurb: 'I may reroll my main move (up to twice).' },
  'rocket-scientist': { title: 'Kablooey', blurb: 'I may move double my roll — then I trip.' },
  sisyphus: { title: 'Keep Rollin’', blurb: 'Start with 4 chips; rolling a 6 warps me to Start and costs a chip.' },
  dicemonger: { title: 'Dicey Deals', blurb: 'Any racer may reroll once; I scooch 1 when they do.' },
  suckerfish: { title: 'Sucker!', blurb: 'After a turn I may follow that racer to their space — even across the finish.' },
  duelist: { title: 'Duel!', blurb: 'After a turn I may challenge a racer to a roll-off; winner moves 2 (I win ties).' },
};

const FALLBACK: PowerInfo = { title: 'Racer', blurb: 'Runs the track.' };

export function powerInfo(racer: Racer | undefined): PowerInfo {
  if (!racer?.powerId) return FALLBACK;
  return POWER_INFO[racer.powerId] ?? FALLBACK;
}
