// The 36 base racers. Names mirror the rulebook roster; powerId points at the powers registry
// (implemented in milestone 2 — until then powers are inert and racers simply run the track).

import type { Racer, RacerId } from './types';

export const RACERS: Racer[] = [
  { id: 'alchemist', name: 'Alchemist', powerId: 'alchemist' },
  { id: 'baba-yaga', name: 'Baba Yaga', powerId: 'baba-yaga' },
  { id: 'banana', name: 'Banana', powerId: 'banana' },
  { id: 'blimp', name: 'Blimp', powerId: 'blimp' },
  { id: 'centaur', name: 'Centaur', powerId: 'centaur' },
  { id: 'cheerleader', name: 'Cheerleader', powerId: 'cheerleader' },
  { id: 'coach', name: 'Coach', powerId: 'coach' },
  { id: 'copycat', name: 'Copycat', powerId: 'copycat' },
  { id: 'dicemonger', name: 'Dicemonger', powerId: 'dicemonger' },
  { id: 'duelist', name: 'Duelist', powerId: 'duelist' },
  { id: 'egg', name: 'Egg', powerId: 'egg' },
  { id: 'genius', name: 'Genius', powerId: 'genius' },
  { id: 'gunk', name: 'Gunk', powerId: 'gunk' },
  { id: 'hare', name: 'Hare', powerId: 'hare' },
  { id: 'heckler', name: 'Heckler', powerId: 'heckler' },
  { id: 'huge-baby', name: 'Huge Baby', powerId: 'huge-baby' },
  { id: 'hypnotist', name: 'Hypnotist', powerId: 'hypnotist' },
  { id: 'flip-flop', name: 'Flip Flop', powerId: 'flip-flop' },
  { id: 'inchworm', name: 'Inchworm', powerId: 'inchworm' },
  { id: 'lackey', name: 'Lackey', powerId: 'lackey' },
  { id: 'leaptoad', name: 'Leaptoad', powerId: 'leaptoad' },
  { id: 'legs', name: 'Legs', powerId: 'legs' },
  { id: 'lovable-loser', name: 'Lovable Loser', powerId: 'lovable-loser' },
  { id: 'magician', name: 'Magician', powerId: 'magician' },
  { id: 'mastermind', name: 'Mastermind', powerId: 'mastermind' },
  { id: 'mouth', name: 'M.O.U.T.H.', powerId: 'mouth' },
  { id: 'party-animal', name: 'Party Animal', powerId: 'party-animal' },
  { id: 'rocket-scientist', name: 'Rocket Scientist', powerId: 'rocket-scientist' },
  { id: 'romantic', name: 'Romantic', powerId: 'romantic' },
  { id: 'scoocher', name: 'Scoocher', powerId: 'scoocher' },
  { id: 'sisyphus', name: 'Sisyphus', powerId: 'sisyphus' },
  { id: 'skipper', name: 'Skipper', powerId: 'skipper' },
  { id: 'stickler', name: 'Stickler', powerId: 'stickler' },
  { id: 'suckerfish', name: 'Suckerfish', powerId: 'suckerfish' },
  { id: 'third-wheel', name: 'Third Wheel', powerId: 'third-wheel' },
  { id: 'twin', name: 'Twin', powerId: 'twin' },
];

export const racersById: Record<RacerId, Racer> = Object.fromEntries(
  RACERS.map((r) => [r.id, r]),
);
