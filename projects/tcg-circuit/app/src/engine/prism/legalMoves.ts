// legalMoves(duel) — the SINGLE source of truth for what the active player may do. The UI gates
// inputs with it (and explains illegality), and the AI chooses only from it (so it can't cheat or
// reach a state the UI can't). Keep the branching small (an AI-learnability hard rule).

import { Action, Duel, UnitInstance } from "./types";
import { getCard } from "../content/registry";
import { hasKw } from "./reduce";

const other = (s: 0 | 1): 0 | 1 => (s === 0 ? 1 : 0);

function ableToAttack(u: UnitInstance): boolean {
  if (u.power - u.dmgTaken <= 0) return false;
  if (u.justPlayed && !hasKw(u, "haste")) return false;
  return true;
}

/** Why a specific (cardId, lane?) play is illegal — for UI feedback. null = legal. */
export function deployIllegalReason(d: Duel, iid: number, lane: number): string | null {
  const p = d.players[d.active];
  const card = p.hand.find((c) => c.iid === iid);
  if (!card) return "Not in hand";
  const def = getCard(card.cardId);
  if (def.type !== "unit") return "Not a Unit";
  if (p.light < def.cost) return `Need ${def.cost} Light (have ${p.light})`;
  if (p.lanes[lane]?.unit) return "Lane occupied";
  return null;
}

function nonEmptySubsets<T>(items: T[]): T[][] {
  const out: T[][] = [];
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const s: T[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(items[i]);
    out.push(s);
  }
  return out;
}

export function legalMoves(duel: Duel): Action[] {
  const d = duel;
  if (d.phase === "over") return [];
  const p = d.players[d.active];
  const opp = other(d.active);
  const moves: Action[] = [];

  // Refract — one per hand card (the pitch choice matters).
  if (!p.refractUsed) {
    for (const c of p.hand) moves.push({ type: "refract", iid: c.iid });
  }

  const enemyUnits = d.players[opp].lanes.filter((s) => s.unit).map((s) => s.unit!.iid);
  const ownUnits = p.lanes.filter((s) => s.unit).map((s) => s.unit!.iid);
  const emptyLanes = [0, 1, 2].filter((l) => !p.lanes[l].unit);

  for (const c of p.hand) {
    const def = getCard(c.cardId);
    if (def.cost > p.light) continue;
    if (def.type === "unit") {
      for (const lane of emptyLanes) moves.push({ type: "deploy", iid: c.iid, lane });
    } else if (def.type === "spell") {
      const needs = (def.effects ?? []).map((e) => e.target).find((t) => t && t !== "none" && t !== "ownNexus");
      if (!needs) {
        moves.push({ type: "cast", iid: c.iid });
      } else {
        const targets =
          needs === "enemyUnit" ? enemyUnits : needs === "ownUnit" ? ownUnits : [...ownUnits, ...enemyUnits];
        for (const t of targets) moves.push({ type: "cast", iid: c.iid, targetIid: t });
        // Reach: a faceable damage spell may instead hit the enemy Nexus (no unit target).
        if (def.faceable) moves.push({ type: "cast", iid: c.iid });
      }
    } else if (def.type === "gear") {
      const wantsNexus = (def.effects ?? []).some((e) => e.target === "ownNexus");
      if (wantsNexus) moves.push({ type: "attach", iid: c.iid, toNexus: true });
      const unitTargets = (def.effects ?? []).some((e) => e.target === "enemyUnit" || e.target === "anyUnit")
        ? [...ownUnits, ...enemyUnits]
        : ownUnits;
      for (const t of unitTargets) moves.push({ type: "attach", iid: c.iid, targetIid: t });
    }
  }

  // Combat — any non-empty subset of able attackers (lets the AI hold back blockers).
  if (!d.combatDone) {
    const ableLanes = [0, 1, 2].filter((l) => {
      const u = p.lanes[l].unit;
      return u && ableToAttack(u);
    });
    for (const subset of nonEmptySubsets(ableLanes)) moves.push({ type: "combat", laneOrder: subset });
  }

  moves.push({ type: "endTurn" });
  return moves;
}
