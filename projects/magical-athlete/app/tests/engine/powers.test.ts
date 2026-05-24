import { describe, it, expect } from 'vitest';
import {
  simulateRaceTurn,
  applySuckerfishFollow,
  applyDuel,
  type RaceState,
  type RacerInPlay,
  type Side,
} from '../../src/engine';

// Build a race state from simple specs. owner = seat index (standard play). 'egg'/'blimp' have no
// implemented hooks, so they act as plain racers.
function race(
  specs: { id: string; pos: number; tripped?: boolean; copiedPowerId?: string }[],
  side: Side = 'mild',
): RaceState {
  const racers: RacerInPlay[] = specs.map((sp, i) => ({
    racerId: sp.id,
    owner: i,
    pos: sp.pos,
    finished: false,
    place: null,
    tripped: sp.tripped ?? false,
    eliminated: false,
    copiedPowerId: sp.copiedPowerId ?? null,
  }));
  return {
    side,
    length: 24,
    racers,
    // turn-model fields are unused by simulateRaceTurn (it takes `current` directly), but satisfy the type
    playerOrder: racers.map((_, i) => i),
    playerPtr: 0,
    activations: racers.map((_, i) => i),
    actPtr: 0,
    firstTurnTaken: racers.map(() => false),
    goNext: null,
    geniusPrediction: null,
    extraTurn: false,
    mastermindPick: null,
    preTurnPos: racers.map((r) => r.pos),
    reactionsOffered: [],
    finishedCount: 0,
    result: { first: null, second: null },
    lastDie: null,
    pending: null,
  };
}

describe('powers', () => {
  it('Banana (THE SLIP): trips a racer that passes it', () => {
    const { race: r } = simulateRaceTurn(race([{ id: 'banana', pos: 5 }, { id: 'egg', pos: 2 }]), 1, 'mild', 5);
    expect(r.racers[1].pos).toBe(7);
    expect(r.racers[1].tripped).toBe(true);
    expect(r.racers[0].pos).toBe(5);
  });

  it('Centaur (HOOFWHACK): a racer it passes moves -2', () => {
    const { race: r } = simulateRaceTurn(race([{ id: 'centaur', pos: 2 }, { id: 'egg', pos: 5 }]), 0, 'mild', 5);
    expect(r.racers[0].pos).toBe(7);
    expect(r.racers[1].pos).toBe(3);
  });

  it('Coach (GOOD HUSTLE): +1 to a racer on its space, nothing otherwise', () => {
    const onSpace = simulateRaceTurn(race([{ id: 'coach', pos: 0 }, { id: 'egg', pos: 0 }]), 1, 'mild', 3).race;
    expect(onSpace.racers[1].pos).toBe(4);
    const offSpace = simulateRaceTurn(race([{ id: 'coach', pos: 0 }, { id: 'egg', pos: 5 }]), 1, 'mild', 3).race;
    expect(offSpace.racers[1].pos).toBe(8);
  });

  it("Gunk (GOOP 'EM): -1 to other racers' main move (not its own), floored at 0", () => {
    const other = simulateRaceTurn(race([{ id: 'gunk', pos: 0 }, { id: 'egg', pos: 0 }]), 1, 'mild', 3).race;
    expect(other.racers[1].pos).toBe(2);
    const self = simulateRaceTurn(race([{ id: 'gunk', pos: 0 }, { id: 'egg', pos: 0 }]), 0, 'mild', 3).race;
    expect(self.racers[0].pos).toBe(3);
    const floored = simulateRaceTurn(race([{ id: 'gunk', pos: 0 }, { id: 'egg', pos: 0 }]), 1, 'mild', 1).race;
    expect(floored.racers[1].pos).toBe(0); // 1 - 1 = 0; moving 0 doesn't move
  });

  it('Hare (HUBRIS): +2 normally; skips and takes a bronze when alone in the lead', () => {
    const plus2 = simulateRaceTurn(race([{ id: 'hare', pos: 2 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3).race;
    expect(plus2.racers[0].pos).toBe(7);
    const lead = simulateRaceTurn(race([{ id: 'hare', pos: 5 }, { id: 'egg', pos: 2 }]), 0, 'mild', 3);
    expect(lead.race.racers[0].pos).toBe(5); // skipped main move
    expect(lead.chips).toEqual([{ player: 0, chip: { kind: 'bronze', value: 1 } }]);
  });

  it('Lackey (VERY GOOD SIRE): moves 2 when another racer rolls a 6', () => {
    const { race: r } = simulateRaceTurn(race([{ id: 'lackey', pos: 0 }, { id: 'egg', pos: 3 }]), 1, 'mild', 6);
    expect(r.racers[0].pos).toBe(2);
    expect(r.racers[1].pos).toBe(9);
  });

  it('Romantic (AH, LOVE!): moves 2 when anyone stops on a space with exactly one other racer', () => {
    const { race: r } = simulateRaceTurn(
      race([{ id: 'romantic', pos: 10 }, { id: 'egg', pos: 0 }, { id: 'blimp', pos: 5 }]),
      1,
      'mild',
      5,
    );
    expect(r.racers[1].pos).toBe(5); // egg lands on blimp's space
    expect(r.racers[0].pos).toBe(12); // romantic reacts
  });

  it('Heckler (SCHADENFREUDE): moves 2 when a racer ends within 1 of where it started (incl. recovering from a trip)', () => {
    const { race: r } = simulateRaceTurn(
      race([{ id: 'heckler', pos: 0 }, { id: 'egg', pos: 5, tripped: true }]),
      1,
      'mild',
      4,
    );
    expect(r.racers[1].tripped).toBe(false); // recovered
    expect(r.racers[1].pos).toBe(5); // skipped main move
    expect(r.racers[0].pos).toBe(2); // heckler reacts
  });

  // The rulebook's worked example (page 16): Romantic rolls 5, passing Scoocher and Banana.
  // Banana trips Romantic; Scoocher reacts to Banana's power (moves 1 onto Banana's space); that
  // makes a 2-racer space, so Romantic moves 2; Scoocher reacts again and moves 1 more.
  it('Scoocher cascade reproduces the rulebook example', () => {
    const { race: r } = simulateRaceTurn(
      race([{ id: 'romantic', pos: 0 }, { id: 'scoocher', pos: 3 }, { id: 'banana', pos: 4 }]),
      0,
      'mild',
      5,
    );
    expect(r.racers[0].tripped).toBe(true); // Romantic tripped by Banana
    expect(r.racers[2].pos).toBe(4); // Banana stays
    expect(r.racers[1].pos).toBe(5); // Scoocher moved 1 twice (3 -> 4 -> 5)
    expect(r.racers[0].pos).toBe(7); // Romantic main move 5, then +2 from its own power
  });

  it('Legs (JOG): optional — skip the roll and move 5, or roll normally', () => {
    const jog = simulateRaceTurn(race([{ id: 'legs', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 3, () => 'jog');
    expect(jog.race.racers[0].pos).toBe(5); // ignored the die (3), moved 5
    const rolled = simulateRaceTurn(race([{ id: 'legs', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 3, () => 'roll');
    expect(rolled.race.racers[0].pos).toBe(3); // rolled and moved 3
  });

  it('Alchemist (TRANSMUTE): optional on a roll of 1 or 2 — move 4 instead, or keep the roll', () => {
    const transmute = simulateRaceTurn(race([{ id: 'alchemist', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 1, () => 'transmute');
    expect(transmute.race.racers[0].pos).toBe(4);
    const keep = simulateRaceTurn(race([{ id: 'alchemist', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 2, () => 'normal');
    expect(keep.race.racers[0].pos).toBe(2);
    const noPrompt = simulateRaceTurn(race([{ id: 'alchemist', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 3); // 3 ≠ 1/2: no choice
    expect(noPrompt.race.racers[0].pos).toBe(3);
  });

  it("Lovable Loser (D'AWW): takes a bronze when alone in last, nothing when tied", () => {
    const alone = simulateRaceTurn(race([{ id: 'lovable-loser', pos: 0 }, { id: 'egg', pos: 10 }]), 0, 'mild', 3);
    expect(alone.chips).toEqual([{ player: 0, chip: { kind: 'bronze', value: 1 } }]);
    expect(alone.race.racers[0].pos).toBe(3); // still takes its normal main move
    const tied = simulateRaceTurn(race([{ id: 'lovable-loser', pos: 5 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3);
    expect(tied.chips).toEqual([]);
  });

  it('M.O.U.T.H. (CHOMP): eliminates a lone racer it stops on', () => {
    const r = simulateRaceTurn(race([{ id: 'mouth', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 5).race;
    expect(r.racers[0].pos).toBe(5);
    expect(r.racers[1].eliminated).toBe(true);
    // with two others on the space it does NOT chomp (needs exactly one other)
    const crowd = simulateRaceTurn(
      race([{ id: 'mouth', pos: 0 }, { id: 'egg', pos: 5 }, { id: 'blimp', pos: 5 }]),
      0,
      'mild',
      5,
    ).race;
    expect(crowd.racers[1].eliminated).toBe(false);
    expect(crowd.racers[2].eliminated).toBe(false);
  });

  it('Hypnotist (HSSSST): can warp a racer to its space, then takes its main move', () => {
    const r = simulateRaceTurn(race([{ id: 'hypnotist', pos: 5 }, { id: 'egg', pos: 10 }]), 0, 'mild', 3, () => 'warp:1').race;
    expect(r.racers[1].pos).toBe(5); // egg warped to the hypnotist's space
    expect(r.racers[0].pos).toBe(8); // then moved 3
  });

  it('Flip Flop (FLOP FLIP): can swap places with a racer instead of moving', () => {
    const r = simulateRaceTurn(race([{ id: 'flip-flop', pos: 2 }, { id: 'egg', pos: 9 }]), 0, 'mild', 4, () => 'swap:1').race;
    expect(r.racers[0].pos).toBe(9);
    expect(r.racers[1].pos).toBe(2);
  });

  it('Third Wheel (ROLL THROUGH): can warp to a 2-racer space, then takes its main move', () => {
    const r = simulateRaceTurn(
      race([{ id: 'third-wheel', pos: 0 }, { id: 'egg', pos: 8 }, { id: 'blimp', pos: 8 }]),
      0,
      'mild',
      3,
      () => 'to:8',
    ).race;
    expect(r.racers[0].pos).toBe(11); // warped to 8, then moved 3
  });

  it('Cheerleader (RAH RAH): can move last place +2, then itself +1, then its main move', () => {
    const r = simulateRaceTurn(race([{ id: 'cheerleader', pos: 8 }, { id: 'egg', pos: 2 }]), 0, 'mild', 3, () => 'cheer').race;
    expect(r.racers[1].pos).toBe(4); // last-place egg moved 2
    expect(r.racers[0].pos).toBe(12); // cheerleader +1 (8->9) then main move 3 (9->12)
  });

  it('Baba Yaga (LEG IT): trips a racer that stops on its space, and racers it stops on', () => {
    const onMine = simulateRaceTurn(race([{ id: 'baba-yaga', pos: 5 }, { id: 'egg', pos: 0 }]), 1, 'mild', 5).race;
    expect(onMine.racers[1].tripped).toBe(true);
    const onTheirs = simulateRaceTurn(race([{ id: 'baba-yaga', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 5).race;
    expect(onTheirs.racers[1].tripped).toBe(true);
  });

  it('Party Animal (ANIMAL MAGNETISM): pulls racers toward it, +1 per racer sharing its space', () => {
    const r = simulateRaceTurn(race([{ id: 'party-animal', pos: 5 }, { id: 'egg', pos: 4 }]), 0, 'mild', 3).race;
    expect(r.racers[1].pos).toBe(5); // egg pulled 1 toward PA, onto its space
    expect(r.racers[0].pos).toBe(9); // main move 3 + 1 (egg sharing its space)
  });

  it('Huge Baby (REALLY HUGE): bumps a racer that lands on its space to the space behind', () => {
    const onMine = simulateRaceTurn(race([{ id: 'huge-baby', pos: 5 }, { id: 'egg', pos: 0 }]), 1, 'mild', 5).race;
    expect(onMine.racers[1].pos).toBe(4); // egg bumped to the space behind Huge Baby
    const iLand = simulateRaceTurn(race([{ id: 'huge-baby', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 5).race;
    expect(iLand.racers[0].pos).toBe(5);
    expect(iLand.racers[1].pos).toBe(4); // egg bumped when Huge Baby lands on its space
  });

  it('Leaptoad (JUMPFROG): leaps over occupied spaces for free', () => {
    const r = simulateRaceTurn(
      race([{ id: 'leaptoad', pos: 0 }, { id: 'egg', pos: 2 }, { id: 'blimp', pos: 3 }]),
      0,
      'mild',
      3,
    ).race;
    expect(r.racers[0].pos).toBe(5); // moves 3 real spaces (1,4,5), leaping over 2 and 3
  });

  it('Skipper (SALTY DOG): schedules its player to go next when anyone rolls a 1', () => {
    const r = simulateRaceTurn(race([{ id: 'skipper', pos: 0 }, { id: 'egg', pos: 5 }]), 1, 'mild', 1).race;
    expect(r.goNext).toBe(0); // skipper is player 0
  });

  it('Inchworm (WRIGGLE): on another’s 1 with a Skipper racing, moves 1 and the Skipper goes next', () => {
    const r = simulateRaceTurn(
      race([{ id: 'inchworm', pos: 0 }, { id: 'skipper', pos: 8 }, { id: 'egg', pos: 5 }]),
      2,
      'mild',
      1,
    ).race;
    expect(r.racers[0].pos).toBe(1); // inchworm wriggles 1
    expect(r.goNext).toBe(1); // skipper (player 1) goes next
  });

  it('Mastermind (KNOW-IT-ALL): predicts a winner; finishes 2nd when that racer wins', () => {
    const predicted = simulateRaceTurn(race([{ id: 'mastermind', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3, () => 'pick:1').race;
    expect(predicted.mastermindPick).toEqual({ by: 0, predicted: 1 });
    const r0 = race([{ id: 'mastermind', pos: 10 }, { id: 'egg', pos: 22 }]);
    r0.mastermindPick = { by: 0, predicted: 1 };
    const r = simulateRaceTurn(r0, 1, 'mild', 2).race; // egg's turn: 22 + 2 = 24 = finish (1st)
    expect(r.racers[1].place).toBe(1);
    expect(r.racers[0].place).toBe(2); // mastermind finishes 2nd
  });

  it('Twin / Egg (DOUBLE DIP / SCRAMBLE): race using a copied power (here, Hare’s +2)', () => {
    const twin = simulateRaceTurn(race([{ id: 'twin', pos: 0, copiedPowerId: 'hare' }, { id: 'egg', pos: 5 }]), 0, 'mild', 3).race;
    expect(twin.racers[0].pos).toBe(5);
    const egg = simulateRaceTurn(race([{ id: 'egg', pos: 0, copiedPowerId: 'hare' }, { id: 'banana', pos: 8 }]), 0, 'mild', 3).race;
    expect(egg.racers[0].pos).toBe(5);
  });

  it('Genius (THINK GOOD): a correct prediction earns an extra turn; a wrong one does not', () => {
    const right = simulateRaceTurn(race([{ id: 'genius', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3, () => 'predict:3').race;
    expect(right.extraTurn).toBe(true);
    expect(right.racers[0].pos).toBe(3); // still just moves its roll
    const wrong = simulateRaceTurn(race([{ id: 'genius', pos: 0 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3, () => 'predict:2').race;
    expect(wrong.extraTurn).toBe(false);
  });

  it('Copycat (COPY THAT): has the lead racer’s power (here, Hare’s +2), but nothing while it leads', () => {
    const copying = simulateRaceTurn(race([{ id: 'copycat', pos: 0 }, { id: 'hare', pos: 10 }]), 0, 'mild', 3).race;
    expect(copying.racers[0].pos).toBe(5); // 3 + Hare's +2
    const leading = simulateRaceTurn(race([{ id: 'copycat', pos: 10 }, { id: 'hare', pos: 0 }]), 0, 'mild', 3).race;
    expect(leading.racers[0].pos).toBe(13); // copycat leads -> copies nothing -> plain 3
  });

  it('Blimp (BLOW IT): boosted before the second corner, penalized after', () => {
    const early = simulateRaceTurn(race([{ id: 'blimp', pos: 0 }, { id: 'egg', pos: 20 }]), 0, 'mild', 3).race;
    expect(early.racers[0].pos).toBe(6); // 3 + 3 (early)
    const late = simulateRaceTurn(race([{ id: 'blimp', pos: 15 }, { id: 'egg', pos: 0 }]), 0, 'mild', 3).race;
    expect(late.racers[0].pos).toBe(17); // 15 + (3 - 1)
  });

  it('Magician (reroll): may reroll up to twice, then must use the last roll', () => {
    const rerolled = simulateRaceTurn(race([{ id: 'magician', pos: 0 }, { id: 'egg', pos: 15 }]), 0, 'mild', [2, 5, 6], () => 'reroll').race;
    expect(rerolled.racers[0].pos).toBe(6); // 2 -> reroll 5 -> reroll 6 -> forced keep
    const kept = simulateRaceTurn(race([{ id: 'magician', pos: 0 }, { id: 'egg', pos: 15 }]), 0, 'mild', [2, 5], () => 'keep').race;
    expect(kept.racers[0].pos).toBe(2);
  });

  it('Dicemonger (DICEY DEALS): lets anyone reroll; it moves 1 when another racer does', () => {
    const rerolled = simulateRaceTurn(race([{ id: 'dicemonger', pos: 0 }, { id: 'egg', pos: 5 }]), 1, 'mild', [2, 5], () => 'reroll').race;
    expect(rerolled.racers[1].pos).toBe(10); // egg rerolled 2 -> 5, moved from 5
    expect(rerolled.racers[0].pos).toBe(1); // dicemonger +1 because egg rerolled
    const kept = simulateRaceTurn(race([{ id: 'dicemonger', pos: 0 }, { id: 'egg', pos: 5 }]), 1, 'mild', [2], () => 'keep').race;
    expect(kept.racers[1].pos).toBe(7); // egg kept the 2
    expect(kept.racers[0].pos).toBe(0); // no reroll -> dicemonger doesn't move
  });

  it('Rocket Scientist (KABLOOEY): may move double the roll, then trips; or move normally', () => {
    const boom = simulateRaceTurn(race([{ id: 'rocket-scientist', pos: 0 }, { id: 'egg', pos: 20 }]), 0, 'mild', 3, () => 'kablooey').race;
    expect(boom.racers[0].pos).toBe(6); // 3 doubled
    expect(boom.racers[0].tripped).toBe(true);
    const normal = simulateRaceTurn(race([{ id: 'rocket-scientist', pos: 0 }, { id: 'egg', pos: 20 }]), 0, 'mild', 3, () => 'normal').race;
    expect(normal.racers[0].pos).toBe(3);
    expect(normal.racers[0].tripped).toBe(false);
  });

  it('Sisyphus (KEEP ROLLIN’): rolling a 6 warps it to Start and loses a chip; otherwise moves normally', () => {
    const six = simulateRaceTurn(race([{ id: 'sisyphus', pos: 10 }, { id: 'egg', pos: 5 }]), 0, 'mild', 6);
    expect(six.race.racers[0].pos).toBe(0);
    expect(six.chips.some((c) => c.remove)).toBe(true);
    const three = simulateRaceTurn(race([{ id: 'sisyphus', pos: 10 }, { id: 'egg', pos: 5 }]), 0, 'mild', 3).race;
    expect(three.racers[0].pos).toBe(13);
  });

  it('Suckerfish (SUCKER!): can follow a racer to its space', () => {
    const r = race([{ id: 'suckerfish', pos: 2 }, { id: 'egg', pos: 9 }]);
    applySuckerfishFollow(r, 'mild', 0, 1);
    expect(r.racers[0].pos).toBe(9);
  });

  it('Duelist (DUEL!): the higher roll moves 2, and the Duelist wins ties', () => {
    const won = race([{ id: 'duelist', pos: 5 }, { id: 'egg', pos: 5 }]);
    applyDuel(won, 'mild', 0, 1, 6, 3);
    expect(won.racers[0].pos).toBe(7);
    const tie = race([{ id: 'duelist', pos: 5 }, { id: 'egg', pos: 5 }]);
    applyDuel(tie, 'mild', 0, 1, 4, 4);
    expect(tie.racers[0].pos).toBe(7); // ties go to the Duelist
    const lost = race([{ id: 'duelist', pos: 5 }, { id: 'egg', pos: 5 }]);
    applyDuel(lost, 'mild', 0, 1, 2, 5);
    expect(lost.racers[1].pos).toBe(7); // egg won the roll-off
  });

  it('Stickler (ACTUALLY...): other racers cross only by landing exactly on the finish', () => {
    const overshoot = simulateRaceTurn(race([{ id: 'stickler', pos: 0 }, { id: 'egg', pos: 22 }]), 1, 'mild', 5).race;
    expect(overshoot.racers[1].pos).toBe(22); // overshoot blocked — no move
    const exact = simulateRaceTurn(race([{ id: 'stickler', pos: 0 }, { id: 'egg', pos: 22 }]), 1, 'mild', 2).race;
    expect(exact.racers[1].finished).toBe(true); // 22 + 2 = 24 = exact finish
    const sticklerSelf = simulateRaceTurn(race([{ id: 'stickler', pos: 22 }, { id: 'egg', pos: 0 }]), 0, 'mild', 5).race;
    expect(sticklerSelf.racers[0].finished).toBe(true); // Stickler itself may overshoot
  });
});
