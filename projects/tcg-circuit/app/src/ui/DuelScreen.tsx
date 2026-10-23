// The PRISM duel screen. DOM board (3 lanes × 2 sides), the opponent/you Nexus + Light gauges, the
// hand, and click-to-target play. The pure engine drives everything; this only projects state and
// emits actions through the store. Combat: click your able units to pick attackers, then ⚔ Attack.

import { useStore, getCard, bandFor } from "./store";
import { CardFace } from "./CardFace";
import { Button } from "./atoms";
import { Duel, CardDef, TargetSpec } from "../engine/prism/types";
import { hasKw } from "../engine/prism/reduce";

function ableToAttack(d: Duel, lane: number): boolean {
  const u = d.players[0].lanes[lane].unit;
  return !!u && u.power - u.dmgTaken > 0 && !(u.justPlayed && !hasKw(u, "haste"));
}

export function DuelScreen() {
  const duel = useStore((s) => s.duel);
  const meta = useStore((s) => s.meta);
  const selectedHand = useStore((s) => s.selectedHand);
  const attackLanes = useStore((s) => s.attackLanes);
  const aiThinking = useStore((s) => s.aiThinking);
  const shakeId = useStore((s) => s.shakeId);
  const gauntlet = useStore((s) => s.gauntlet);
  const A = useStore();

  if (!duel || !meta) return null;
  const you = duel.players[0];
  const opp = duel.players[1];
  const yourTurn = duel.active === 0 && duel.phase !== "over" && !aiThinking;
  const sel = selectedHand != null ? you.hand.find((c) => c.iid === selectedHand) : undefined;
  const selDef: CardDef | undefined = sel ? getCard(sel.cardId) : undefined;

  const canAfford = (c: CardDef) => you.light >= c.cost;
  const oppUnits = opp.lanes.map((s) => s.unit);
  const yourUnits = you.lanes.map((s) => s.unit);

  // What the selected card wants as a target.
  const targetMode: "lane" | TargetSpec | null = (() => {
    if (!selDef || !yourTurn) return null;
    if (selDef.type === "unit") return "lane";
    if (selDef.type === "gear") {
      const t = (selDef.effects ?? []).find((e) => e.target && e.target !== "none");
      return t?.target ?? "ownUnit";
    }
    const t = (selDef.effects ?? []).map((e) => e.target).find((x) => x && x !== "none" && x !== "ownNexus");
    return t ?? "none";
  })();
  const faceable = !!selDef?.faceable;
  const gearToNexus = selDef?.type === "gear" && (selDef.effects ?? []).some((e) => e.target === "ownNexus");

  const laneDroppable = (lane: number) => targetMode === "lane" && !you.lanes[lane].unit && selDef && canAfford(selDef);
  const unitTargetable = (side: 0 | 1) => {
    if (!selDef || !canAfford(selDef)) return false;
    if (targetMode === "enemyUnit") return side === 1;
    if (targetMode === "ownUnit") return side === 0;
    if (targetMode === "anyUnit") return true;
    return false;
  };

  function clickLane(lane: number) {
    if (laneDroppable(lane) && sel) A.playUnit(sel.iid, lane);
  }
  function clickUnit(side: 0 | 1, iid: number) {
    if (sel && unitTargetable(side)) {
      if (selDef!.type === "gear") A.playGear(sel.iid, iid);
      else A.playSpell(sel.iid, iid);
    } else if (side === 0 && yourTurn && ableToAttack(duel!, laneOfUnit(duel!, 0, iid))) {
      A.toggleAttacker(laneOfUnit(duel!, 0, iid));
    }
  }

  const selectableHand = (c: CardDef) => yourTurn && canAfford(c);
  const ableLanes = [0, 1, 2].filter((l) => ableToAttack(duel, l));

  return (
    <div className="duel">
      {/* top bar */}
      <div className="duel-top">
        <div className="opp-id">
          <strong>{meta.oppName}</strong>
          <span className="tag">{bandFor(meta.skill)}</span>
          {gauntlet && <span className="tag">Gauntlet {gauntlet.rung + 1}/14</span>}
          <span className="muted opp-flavor">{meta.oppFlavor}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={A.togglePause}>☰ Menu</Button>
      </div>

      {/* opponent row */}
      <div className="side opp-side">
        <Nexus side={1} value={opp.nexus} name={meta.oppName} />
        <div className="side-info">
          <LightGauge side={1} light={opp.light} max={opp.maxLight} />
          <div className="hand-count">🂠 {opp.hand.length} in hand · {opp.deck.length} deck</div>
        </div>
      </div>

      {/* the board: 3 lanes */}
      <div className={"board" + (shakeId ? " shake" : "")} key={shakeId}>
        {[0, 1, 2].map((lane) => (
          <div className="lane" key={lane}>
            <Slot
              unit={oppUnits[lane]}
              side={1}
              targetable={!!oppUnits[lane] && unitTargetable(1)}
              onClick={() => oppUnits[lane] && clickUnit(1, oppUnits[lane]!.iid)}
              onPeek={A.setPeek}
            />
            <div className="lane-mid">{lane + 1}</div>
            <Slot
              unit={yourUnits[lane]}
              side={0}
              droppable={!!laneDroppable(lane)}
              attacking={attackLanes.includes(lane)}
              attackerReady={ableLanes.includes(lane)}
              targetable={!!yourUnits[lane] && unitTargetable(0)}
              onClick={() => (yourUnits[lane] ? clickUnit(0, yourUnits[lane]!.iid) : clickLane(lane))}
              onPeek={A.setPeek}
            />
          </div>
        ))}
      </div>

      {/* your row: nexus + light + actions */}
      <div className="side you-side">
        <Nexus side={0} value={you.nexus} name="You" />
        <div className="side-info">
          <LightGauge side={0} light={you.light} max={you.maxLight} />
          <div className="actions">
            <Button
              variant="primary"
              disabled={!yourTurn || ableLanes.length === 0}
              onClick={() => A.declareCombat()}
              title="Attack with the selected units (or all able)"
            >
              ⚔ Attack{attackLanes.length ? ` (${attackLanes.length})` : " All"}
            </Button>
            <Button disabled={!yourTurn} onClick={() => A.endTurn()}>End Turn ⏭</Button>
          </div>
        </div>
      </div>

      {/* contextual action bar for a selected card */}
      {sel && selDef && (
        <div className="ctx-bar">
          <span><strong style={{ color: "var(--gold)" }}>{selDef.name}</strong> — {hint(targetMode, gearToNexus)}</span>
          {targetMode === "none" && <Button size="sm" variant="primary" onClick={() => A.playSpell(sel.iid)}>Cast</Button>}
          {faceable && <Button size="sm" variant="primary" onClick={() => A.playSpell(sel.iid)}>Cast at Nexus</Button>}
          {gearToNexus && <Button size="sm" variant="primary" onClick={() => A.playGear(sel.iid, undefined, true)}>Attach to your Nexus</Button>}
          {!you.refractUsed && <Button size="sm" onClick={() => A.refractCard(sel.iid)}>Refract (+{(selDef.keywords ?? []).some((k) => k.kw === "refractplus") ? 2 : 1} Light)</Button>}
          <Button size="sm" variant="ghost" onClick={() => A.selectHand(null)}>Cancel</Button>
        </div>
      )}

      {/* hand */}
      <div className="hand" data-testid="hand">
        {you.hand.map((c) => {
          const def = getCard(c.cardId);
          return (
            <div
              key={c.iid}
              className={"hand-card" + (selectedHand === c.iid ? " sel" : "")}
              onClick={() => (selectableHand(def) ? A.selectHand(selectedHand === c.iid ? null : c.iid) : A.setPeek(null))}
              onPointerEnter={() => A.setPeek(c.cardId)}
              onPointerLeave={() => A.setPeek(null)}
            >
              <CardFace card={def} size="hand" selectable={selectableHand(def)} illegal={yourTurn && !canAfford(def)} />
            </div>
          );
        })}
        {you.hand.length === 0 && <span className="muted">Hand empty</span>}
      </div>

      {!yourTurn && duel.phase !== "over" && <div className="turn-banner">{aiThinking ? `${meta.oppName} is thinking…` : "Opponent's turn"}</div>}
    </div>
  );
}

function hint(mode: string | null, gearNexus: boolean): string {
  if (mode === "lane") return "click an empty lane to deploy";
  if (mode === "enemyUnit") return "click an enemy unit" + (gearNexus ? " or your Nexus" : "");
  if (mode === "ownUnit") return gearNexus ? "click your unit, or attach to your Nexus" : "click your unit";
  if (mode === "anyUnit") return "click any unit";
  if (mode === "none") return "ready to cast";
  return "";
}

function laneOfUnit(d: Duel, side: 0 | 1, iid: number): number {
  return d.players[side].lanes.findIndex((s) => s.unit?.iid === iid);
}

function Nexus({ side, value, name }: { side: 0 | 1; value: number; name: string }) {
  const pct = Math.max(0, Math.min(1, value / 16));
  return (
    <div className="nexus" data-nexus={side}>
      <div className="nexus-name">{name}</div>
      <div className="nexus-bar">
        <div className="nexus-fill" style={{ width: `${pct * 100}%`, background: value <= 5 ? "var(--bad)" : "linear-gradient(90deg,var(--good),var(--gold))" }} />
        <span className="nexus-val">♦ {value}</span>
      </div>
    </div>
  );
}

function LightGauge({ side, light, max }: { side: 0 | 1; light: number; max: number }) {
  return (
    <div className="light-gauge" data-light={side} title={`${light} of ${max} Light`}>
      {Array.from({ length: Math.max(max, light) }, (_, i) => (
        <span key={i} className={"light-pip" + (i < light ? " on" : "")}>◆</span>
      ))}
      <span className="light-num">{light}/{max}</span>
    </div>
  );
}

function Slot({
  unit, side, droppable, targetable, attacking, attackerReady, onClick, onPeek,
}: {
  unit: import("../engine/prism/types").UnitInstance | undefined;
  side: 0 | 1;
  droppable?: boolean;
  targetable?: boolean;
  attacking?: boolean;
  attackerReady?: boolean;
  onClick?: () => void;
  onPeek?: (id: string | null) => void;
}) {
  return (
    <div
      className={["slot", droppable ? "droppable" : "", attacking ? "attacking" : "", attackerReady && !attacking ? "attacker-ready" : ""].join(" ")}
      onClick={onClick}
    >
      {unit ? (
        <div onPointerEnter={() => onPeek?.(unit.cardId)} onPointerLeave={() => onPeek?.(null)}>
          <CardFace card={getCard(unit.cardId)} size="board" unit={unit} targetable={targetable} selectable={side === 0 && attackerReady} />
        </div>
      ) : (
        <div className="slot-empty">{droppable ? "▾ deploy" : ""}</div>
      )}
    </div>
  );
}
