// PRISM reducer — the pure rules core. reduce(duel, action) -> duel (never mutates the input).
// Resolution order (spec): pay/play (deploy units / cast spells / attach gear) -> declared combat,
// lane by lane -> end-of-turn cleanup (clear damage, expire Volatile) -> pass + begin next turn.

import {
  Action,
  CardInst,
  Duel,
  FxEvent,
  KeywordName,
  PlayerState,
  UnitInstance,
} from "./types";
import { getCard } from "../content/registry";
import { beginTurn, drawCard } from "./setup";

const other = (s: 0 | 1): 0 | 1 => (s === 0 ? 1 : 0);

export function cloneDuel(d: Duel): Duel {
  return {
    turn: d.turn,
    active: d.active,
    firstPlayer: d.firstPlayer,
    rngState: d.rngState,
    phase: d.phase,
    combatDone: d.combatDone,
    winner: d.winner,
    nextIid: d.nextIid,
    fxSeq: d.fxSeq,
    log: d.log.slice(),
    fx: d.fx.map((f) => ({ ...f })),
    players: [clonePlayer(d.players[0]), clonePlayer(d.players[1])],
  };
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    name: p.name,
    nexus: p.nexus,
    maxLight: p.maxLight,
    light: p.light,
    refractUsed: p.refractUsed,
    hand: p.hand.map((c) => ({ ...c })),
    deck: p.deck.map((c) => ({ ...c })),
    discard: p.discard.map((c) => ({ ...c })),
    lanes: p.lanes.map((s) => (s.unit ? { unit: cloneUnit(s.unit) } : {})) as PlayerState["lanes"],
  };
}

function cloneUnit(u: UnitInstance): UnitInstance {
  return { ...u, keywords: u.keywords.map((k) => ({ ...k })), gear: u.gear.slice() };
}

export function hasKw(u: UnitInstance, kw: KeywordName): boolean {
  return u.keywords.some((k) => k.kw === kw);
}
function kwAmount(u: UnitInstance, kw: KeywordName): number {
  let n = 0;
  for (const k of u.keywords) if (k.kw === kw) n += k.n ?? 0;
  return n;
}

function emit(d: Duel, fx: Omit<FxEvent, "id">): void {
  d.fxSeq += 1;
  d.fx.push({ id: d.fxSeq, ...fx });
}

function findInHand(p: PlayerState, iid: number): CardInst | undefined {
  return p.hand.find((c) => c.iid === iid);
}
function removeFromHand(p: PlayerState, iid: number): CardInst | undefined {
  const i = p.hand.findIndex((c) => c.iid === iid);
  return i >= 0 ? p.hand.splice(i, 1)[0] : undefined;
}
function findUnit(d: Duel, iid: number): { unit: UnitInstance; side: 0 | 1; lane: number } | undefined {
  for (const side of [0, 1] as const) {
    const lanes = d.players[side].lanes;
    for (let lane = 0; lane < lanes.length; lane++) {
      const u = lanes[lane].unit;
      if (u && u.iid === iid) return { unit: u, side, lane };
    }
  }
  return undefined;
}

/** PUBLIC: apply an action, returning a new Duel. Illegal actions are no-ops (UI + AI gate via legalMoves). */
export function reduce(duel: Duel, action: Action): Duel {
  const d = cloneDuel(duel);
  if (d.phase === "over") return d;
  d.fx = []; // fx accumulate per-action; the UI drains them after each dispatch
  switch (action.type) {
    case "refract":
      doRefract(d, action.iid);
      break;
    case "deploy":
      doDeploy(d, action.iid, action.lane);
      break;
    case "cast":
      doCast(d, action.iid, action.targetIid);
      break;
    case "attach":
      doAttach(d, action.iid, action.targetIid, action.toNexus);
      break;
    case "combat":
      doCombat(d, action.laneOrder);
      break;
    case "endTurn":
      doEndTurn(d);
      break;
  }
  d.log.push(action);
  return d;
}

function doRefract(d: Duel, iid: number): void {
  const p = d.players[d.active];
  if (p.refractUsed) return;
  const card = findInHand(p, iid);
  if (!card) return;
  const def = getCard(card.cardId);
  removeFromHand(p, iid);
  p.discard.push(card);
  const gain = (def.keywords ?? []).some((k) => k.kw === "refractplus") ? 2 : 1;
  p.light += gain;
  p.refractUsed = true;
  emit(d, { kind: "refract", side: d.active, amount: gain, cardId: card.cardId });
}

function makeUnit(card: CardInst): UnitInstance {
  const def = getCard(card.cardId);
  return {
    iid: card.iid,
    cardId: card.cardId,
    power: def.power ?? 0,
    basePower: def.power ?? 0,
    dmgTaken: 0,
    shield: 0,
    keywords: (def.keywords ?? []).map((k) => ({ ...k })),
    justPlayed: true,
    gear: [],
  };
}

function doDeploy(d: Duel, iid: number, lane: number): void {
  const p = d.players[d.active];
  const card = findInHand(p, iid);
  if (!card) return;
  const def = getCard(card.cardId);
  if (def.type !== "unit") return;
  if (lane < 0 || lane > 2 || p.lanes[lane].unit) return;
  if (p.light < def.cost) return;
  p.light -= def.cost;
  removeFromHand(p, iid);
  const unit = makeUnit(card);
  if (hasKw(unit, "haste")) unit.justPlayed = false;
  // Shield N keyword grants an initial shield.
  const sh = kwAmount(unit, "shield");
  if (sh > 0) unit.shield += sh;
  p.lanes[lane].unit = unit;
  emit(d, { kind: "deploy", side: d.active, lane, cardId: card.cardId });
  // onDeploy: Lifegain keyword
  const lg = kwAmount(unit, "lifegain");
  if (lg > 0) {
    p.nexus += lg;
    emit(d, { kind: "heal", side: d.active, amount: lg });
  }
  // onDeploy: Rally — your OTHER units get +N power (go-wide payoff; bounded by the 3 lanes)
  const rally = kwAmount(unit, "rally");
  if (rally > 0) {
    for (const slot of p.lanes) {
      if (slot.unit && slot.unit.iid !== unit.iid) {
        slot.unit.power += rally;
        slot.unit.basePower += rally;
      }
    }
    emit(d, { kind: "cast", side: d.active, amount: rally });
  }
  // onDeploy: non-targeted "battlecry" effects on the unit (damageNexus / healNexus / drawCards / ramp).
  // Targeted unit effects are out of scope for the MVP (the deploy action carries no target) — keeps
  // legalMoves small (an AI-learnability rule); such effects live on Spells/Gear instead.
  for (const eff of def.effects ?? []) {
    if (eff.kind === "damageNexus") {
      const opp = other(d.active);
      d.players[opp].nexus -= eff.n ?? 0;
      emit(d, { kind: "nexusHit", side: opp, amount: eff.n ?? 0 });
    } else if (eff.kind === "healNexus") {
      p.nexus += eff.n ?? 0;
      emit(d, { kind: "heal", side: d.active, amount: eff.n ?? 0 });
    } else if (eff.kind === "drawCards") {
      for (let i = 0; i < (eff.n ?? 0); i++) drawCard(d, d.active);
      emit(d, { kind: "draw", side: d.active, amount: eff.n ?? 0 });
    } else if (eff.kind === "ramp") {
      p.maxLight = Math.min(p.maxLight + (eff.n ?? 0), 10);
      p.light += eff.n ?? 0;
    }
  }
  checkWin(d);
}

function applyEffectToUnit(d: Duel, kind: string, n: number, kw: UnitInstance["keywords"][number] | undefined, targetIid: number | undefined): void {
  if (targetIid == null) return;
  const found = findUnit(d, targetIid);
  if (!found) return;
  const u = found.unit;
  switch (kind) {
    case "damageUnit": {
      const absorbed = Math.min(u.shield, n);
      u.shield -= absorbed;
      u.dmgTaken += n - absorbed;
      emit(d, { kind: "clash", side: found.side, lane: found.lane, amount: n });
      break;
    }
    case "destroyUnit":
      u.dmgTaken = u.power + 999;
      break;
    case "buffPower":
      u.power += n;
      u.basePower += n;
      break;
    case "grantShield":
      u.shield += n;
      break;
    case "grantKeyword":
      if (kw) {
        u.keywords.push({ ...kw });
        if (kw.kw === "shield") u.shield += kw.n ?? 0;
      }
      break;
    case "bounce": {
      const owner = found.side;
      d.players[found.side].lanes[found.lane] = {};
      // returns to owner hand as its base card
      d.players[owner].hand.push({ iid: u.iid, cardId: u.cardId });
      break;
    }
  }
}

function doCast(d: Duel, iid: number, targetIid?: number): void {
  const p = d.players[d.active];
  const card = findInHand(p, iid);
  if (!card) return;
  const def = getCard(card.cardId);
  if (def.type !== "spell") return;
  if (p.light < def.cost) return;
  p.light -= def.cost;
  removeFromHand(p, iid);
  p.discard.push(card);
  emit(d, { kind: "cast", side: d.active, cardId: card.cardId });
  for (const eff of def.effects ?? []) {
    // Reach: a faceable damage spell cast with no unit target hits the enemy Nexus instead.
    if (eff.kind === "damageUnit" && targetIid == null && def.faceable) {
      const opp = other(d.active);
      d.players[opp].nexus -= eff.n ?? 0;
      emit(d, { kind: "nexusHit", side: opp, amount: eff.n ?? 0 });
      continue;
    }
    switch (eff.kind) {
      case "damageNexus": {
        const opp = other(d.active);
        d.players[opp].nexus -= eff.n ?? 0;
        emit(d, { kind: "nexusHit", side: opp, amount: eff.n ?? 0 });
        break;
      }
      case "healNexus":
        p.nexus += eff.n ?? 0;
        emit(d, { kind: "heal", side: d.active, amount: eff.n ?? 0 });
        break;
      case "drawCards":
        for (let i = 0; i < (eff.n ?? 0); i++) drawCard(d, d.active);
        emit(d, { kind: "draw", side: d.active, amount: eff.n ?? 0 });
        break;
      case "ramp":
        p.maxLight = Math.min(p.maxLight + (eff.n ?? 0), 10);
        p.light += eff.n ?? 0;
        break;
      default:
        applyEffectToUnit(d, eff.kind, eff.n ?? 0, eff.kw, targetIid);
    }
  }
  sweepDead(d);
  checkWin(d);
}

function doAttach(d: Duel, iid: number, targetIid?: number, toNexus?: boolean): void {
  const p = d.players[d.active];
  const card = findInHand(p, iid);
  if (!card) return;
  const def = getCard(card.cardId);
  if (def.type !== "gear") return;
  if (p.light < def.cost) return;
  p.light -= def.cost;
  removeFromHand(p, iid);
  p.discard.push(card);
  emit(d, { kind: "attach", side: d.active, cardId: card.cardId });
  for (const eff of def.effects ?? []) {
    if (toNexus) {
      if (eff.kind === "healNexus") p.nexus += eff.n ?? 0;
      else if (eff.kind === "ramp") {
        p.maxLight = Math.min(p.maxLight + (eff.n ?? 0), 10);
        p.light += eff.n ?? 0;
      }
    } else {
      applyEffectToUnit(d, eff.kind, eff.n ?? 0, eff.kw, targetIid);
      if (targetIid != null) {
        const f = findUnit(d, targetIid);
        if (f) f.unit.gear.push(card.cardId);
      }
    }
  }
}

/** Apply combat damage to a unit, honoring shield. Returns overkill (excess beyond remaining health). */
function damageUnit(u: UnitInstance, incoming: number): number {
  const absorbed = Math.min(u.shield, incoming);
  u.shield -= absorbed;
  const dealt = incoming - absorbed;
  const remaining = u.power - u.dmgTaken;
  u.dmgTaken += dealt;
  return dealt - remaining; // >0 => overkill
}

function doCombat(d: Duel, laneOrder: number[]): void {
  if (d.combatDone) return;
  const me = d.active;
  const opp = other(me);
  const Pme = d.players[me];
  const Popp = d.players[opp];
  // Each living Guard can stop ONE open-lane attack per combat (a wall, not an impasse — so a wide
  // board still punches through). Pierce ignores Guard entirely.
  let guardBlocks = Popp.lanes.filter((s) => s.unit && hasKw(s.unit!, "guard")).length;
  d.combatDone = true;

  for (const lane of laneOrder) {
    if (lane < 0 || lane > 2) continue;
    const atk = Pme.lanes[lane].unit;
    if (!atk) continue;
    if (atk.justPlayed && !hasKw(atk, "haste")) continue;
    if (atk.power - atk.dmgTaken <= 0) continue;
    const def = Popp.lanes[lane].unit;
    if (def) {
      const atkPow = atk.power;
      const defPow = def.power;
      emit(d, { kind: "clash", side: opp, lane, amount: atkPow });
      const overkill = damageUnit(def, atkPow);
      damageUnit(atk, defPow);
      if (hasKw(atk, "pierce") && overkill > 0) {
        Popp.nexus -= overkill;
        if (hasKw(atk, "drain")) Pme.nexus += overkill;
        emit(d, { kind: "nexusHit", side: opp, lane, amount: overkill });
      }
    } else {
      // open lane -> Nexus, unless a Guard intercepts it (Pierce ignores Guard)
      if (guardBlocks > 0 && !hasKw(atk, "pierce")) {
        guardBlocks--;
        continue;
      }
      const dmg = atk.power;
      Popp.nexus -= dmg;
      if (hasKw(atk, "drain")) Pme.nexus += dmg;
      emit(d, { kind: "nexusHit", side: opp, lane, amount: dmg });
    }
    if (Popp.nexus <= 0) break;
  }
  sweepDead(d);
  checkWin(d);
}

function sweepDead(d: Duel): void {
  for (const side of [0, 1] as const) {
    const lanes = d.players[side].lanes;
    for (let lane = 0; lane < lanes.length; lane++) {
      const u = lanes[lane].unit;
      if (u && u.dmgTaken >= u.power) {
        d.players[side].discard.push({ iid: u.iid, cardId: u.cardId });
        lanes[lane] = {};
        emit(d, { kind: "unitDie", side, lane, cardId: u.cardId });
        // onDestroyed: Vengeance — deal N to the enemy Nexus
        const v = kwAmount(u, "vengeance");
        if (v > 0) {
          const opp = other(side);
          d.players[opp].nexus -= v;
          emit(d, { kind: "nexusHit", side: opp, amount: v });
        }
      }
    }
  }
}

function doEndTurn(d: Duel): void {
  const me = d.active;
  // Expire Volatile (controller's end of turn).
  for (let lane = 0; lane < 3; lane++) {
    const u = d.players[me].lanes[lane].unit;
    if (u && hasKw(u, "volatile")) {
      d.players[me].discard.push({ iid: u.iid, cardId: u.cardId });
      d.players[me].lanes[lane] = {};
      emit(d, { kind: "unitDie", side: me, lane, cardId: u.cardId });
    }
  }
  // Damage resets at end of the turn it was dealt: clear all units' marked damage.
  for (const side of [0, 1] as const)
    for (const s of d.players[side].lanes) if (s.unit) s.unit.dmgTaken = 0;
  // Pass.
  d.active = other(me);
  beginTurn(d);
}

export function checkWin(d: Duel): void {
  if (d.winner != null) return;
  const oppOfActive = other(d.active);
  // Simultaneous lethal: the active player's opponent is checked first.
  if (d.players[oppOfActive].nexus <= 0) {
    d.winner = d.active;
    d.phase = "over";
  } else if (d.players[d.active].nexus <= 0) {
    d.winner = oppOfActive;
    d.phase = "over";
  }
}
