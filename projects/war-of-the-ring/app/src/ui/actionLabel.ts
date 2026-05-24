import type { Action } from '../engine';
import { REGIONS, CARD_BY_ID, CHAR_BY_ID } from '../engine';

const rn = (id: string) => REGIONS[id]?.name ?? id;

export function actionLabel(a: Action): string {
  switch (a.type) {
    case 'recoverAndDraw':
      return '▶ Begin turn — recover dice & draw cards';
    case 'declareFellowship':
      return `Declare Fellowship at ${rn(a.regionId)}`;
    case 'changeGuide':
      return `Change Guide to ${CHAR_BY_ID[a.characterId]?.name ?? a.characterId}`;
    case 'huntAllocate':
      return `Allocate ${a.dice} die(dice) to the Hunt`;
    case 'rollDice':
      return '🎲 Roll the Action dice';
    case 'endPhase':
      return 'End phase ▶';
    case 'passDie':
      return 'Pass / forfeit one die';
    case 'forfeitRemaining':
      return 'Forfeit all remaining dice';
    case 'moveArmy':
      return `Move army ${rn(a.from)} → ${rn(a.to)}`;
    case 'attack':
      return `⚔ Attack ${rn(a.to)} from ${rn(a.from)}`;
    case 'moveFellowship':
      return '◈ Move the Fellowship (Hunt)';
    case 'hideFellowship':
      return 'Hide the Fellowship';
    case 'muster':
      return `Recruit ${a.nation} ${a.kind} at ${rn(a.regionId)}`;
    case 'advancePolitical':
      return `Advance ${a.nation} on the Political Track`;
    case 'bringCharacter':
      return `Bring ${CHAR_BY_ID[a.characterId]?.name ?? a.characterId} into play`;
    case 'drawCard':
      return `Draw a card (${a.deck})`;
    case 'playCard':
      return `Play "${CARD_BY_ID[a.cardId]?.title ?? a.cardId}"`;
    case 'upgradeAragorn':
      return '♛ Crown Aragorn (Will of the West)';
    case 'upgradeGandalf':
      return '✦ Return Gandalf the White (Will of the West)';
    case 'combatRound':
      return 'Fight a combat round';
    case 'combatRetreat':
      return a.toRegion ? `Retreat to ${rn(a.toRegion)}` : 'Retreat';
    case 'combatCease':
      return 'Cease the attack';
    case 'combatPressSiege':
      return 'Reduce an Elite to press the siege';
    case 'clearOutcome':
      return 'Continue ▶';
  }
}
