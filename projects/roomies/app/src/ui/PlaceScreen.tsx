import { useEffect, useMemo } from "react";
import { useStore } from "../state/store";
import {
  ANIMAL_BY_ID,
  ENV_BY_ID,
  IMPROVEMENT_BY_ID,
  envBiomes,
  envCapacity,
  envFreeRaum,
  scoreEnvironment,
  type EnvInstance,
  type GameState,
} from "../engine";
import { Hud } from "./Hud";
import { CardFace } from "./CardFace";
import { ANIMAL_GLYPH, BIOME_GLYPH, BIOME_LABEL, cardTitle, ENV_GLYPH, PLAYER_CLASS, PLAYER_GLYPH } from "./cardText";

const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

interface Target { label: string; enabled: boolean; reason?: string; go: (from?: { x: number; y: number }) => void; }
interface Model { kind: "env" | "animal" | "improvement"; targets: Target[]; }

export function PlaceScreen({ game }: { game: GameState }) {
  const { selectedCardId, selectCard, place, discardFromPool, endPlacement } = useStore();
  const player = game.players[game.current];
  const pool = player.pool;
  const aiControlled = game.config.seats[game.current] !== "human";
  const selected = selectedCardId != null && pool.includes(selectedCardId) ? game.cards[selectedCardId] : null;

  const model = useMemo<Model | null>(() => {
    if (!selected) return null;
    const id = selected.id;
    if (selected.kind === "env") return { kind: "env", targets: [{ label: "Place as a new room", enabled: true, go: (from) => place(id, {}, from) }] };
    if (selected.kind === "animal") {
      const need = ANIMAL_BY_ID[selected.defId].raum;
      return {
        kind: "animal",
        targets: player.environments.map((e) => {
          const free = envFreeRaum(e, game.cards);
          return {
            label: `${ENV_GLYPH[e.defId]} ${ENV_BY_ID[e.defId].name} · free ${free}/${envCapacity(e)}`,
            enabled: free >= need,
            reason: free >= need ? undefined : "full",
            go: (from) => place(id, { env: e.cardId }, from),
          };
        }),
      };
    }
    const idef = IMPROVEMENT_BY_ID[selected.defId];
    if (idef.kind === "verkleidung") {
      return {
        kind: "improvement",
        targets: player.environments.flatMap((e) =>
          e.animalIds.map((aid) => ({
            label: `${ANIMAL_GLYPH[game.cards[aid].defId]} ${ANIMAL_BY_ID[game.cards[aid].defId].name} (in ${ENV_BY_ID[e.defId].name})`,
            enabled: true,
            go: (from) => place(id, { animal: aid }, from),
          })),
        ),
      };
    }
    return {
      kind: "improvement",
      targets: player.environments.map((e) => ({
        label: `${ENV_GLYPH[e.defId]} ${ENV_BY_ID[e.defId].name}`,
        enabled: true,
        go: (from) => place(id, { env: e.cardId }, from),
      })),
    };
  }, [selected, player, game.cards, place]);

  // Keyboard: digits select a pool card, or (when one is selected) choose a target; D discard; E end.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (aiControlled) return;
      if (e.key === "Escape") return selectCard(null);
      if (e.key.toLowerCase() === "e") return endPlacement();
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1) {
        if (selected && model) {
          const t = model.targets[n - 1];
          if (t?.enabled) t.go();
        } else if (n <= pool.length) selectCard(pool[n - 1]);
        return;
      }
      if (e.key.toLowerCase() === "d" && selected) discardFromPool(selected.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiControlled, selected, model, pool, selectCard, discardFromPool, endPlacement]);

  return (
    <div className="screen place-screen">
      <Hud game={game} />

      <div className="turn-line">
        <span className={`turn-orb ${PLAYER_CLASS[game.current]}`}>{PLAYER_GLYPH[game.current]}</span>
        {aiControlled ? (
          <span><strong>Player {game.current + 1}</strong> <span className="ai-think">AI is placing<span className="dots">…</span></span></span>
        ) : (
          <>
            <span><strong>Player {game.current + 1}</strong> — place your drafted cards into rooms.</span>
            <button className="btn primary done-btn" onClick={() => endPlacement()}>Done placing (E)</button>
          </>
        )}
      </div>

      <main className="tableau" aria-label={`Player ${game.current + 1} rooms`}>
        {player.environments.length === 0 && <p className="empty-hint">No rooms yet — place an Environment card from your pool.</p>}
        {player.environments.map((env) => (
          <RoomCard key={env.cardId} env={env} game={game} />
        ))}
      </main>

      {aiControlled ? (
        <div className="actions hint">🤖 AI is arranging its rooms…</div>
      ) : selected && model ? (
        <div className="actions">
          <div className="actions-title">
            <strong>{cardTitle(selected)}</strong>
            <button className="btn ghost" onClick={() => selectCard(null)}>✕ deselect (Esc)</button>
          </div>
          <div className="row">
            {model.targets.map((t, i) => (
              <button key={i} className="btn target" disabled={!t.enabled} onClick={(e) => t.go(centerOf(e.currentTarget))}>
                <span className="hand-key">{i + 1}</span> {t.label}{t.reason ? ` · ${t.reason}` : ""}
              </button>
            ))}
            {model.targets.length === 0 && <span className="muted">No legal target — discard it.</span>}
            <button className="btn warn" onClick={() => discardFromPool(selected.id)}>Discard (D)</button>
          </div>
        </div>
      ) : (
        <div className="actions hint">Select a card from your pool to place it.</div>
      )}

      <footer className="pool-strip" data-pool={game.current} aria-label="your drafted cards">
        {pool.length === 0 && <span className="muted">Pool empty — press <strong>Done</strong> to pass.</span>}
        {pool.map((cid, i) => (
          <button
            key={cid}
            data-cardid={cid}
            className={`card hand-card ${game.cards[cid].kind} ${selectedCardId === cid ? "selected" : ""}`}
            disabled={aiControlled}
            onClick={aiControlled ? undefined : () => selectCard(cid)}
            aria-pressed={selectedCardId === cid}
          >
            <span className="hand-key">{i + 1}</span>
            <CardFace card={game.cards[cid]} jokered={game.jokered.includes(cid)} />
          </button>
        ))}
      </footer>
    </div>
  );
}

function RoomCard({ env, game }: { env: EnvInstance; game: GameState }) {
  const def = ENV_BY_ID[env.defId];
  const sc = scoreEnvironment(env, game.cards, game.jokered);
  const used = env.animalIds.reduce((s, id) => s + ANIMAL_BY_ID[game.cards[id].defId].raum, 0);
  const cap = envCapacity(env);
  return (
    <div className="room" data-room={env.cardId}>
      <div className="room-head">
        <span className="room-glyph">{ENV_GLYPH[env.defId]}</span>
        <span className="room-name">{def.name}</span>
        <span className="room-mult">×{def.multiplier}</span>
      </div>
      <div className="capbar" aria-label={`capacity ${used} of ${cap}`}>
        <div className="capfill" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
        <span className="captext">Raum {used}/{cap}</span>
      </div>
      <div className="room-tags">
        {envBiomes(env).map((b) => <span key={b} className={`biome biome-${b}`}>{BIOME_GLYPH[b]} {BIOME_LABEL[b]}</span>)}
        {env.ausbau > 0 && <span className="imp">🔨 +{env.ausbau * 2}</span>}
        {env.dekoration && <span className="imp">🖼️</span>}
      </div>
      <ul className="room-animals">
        {sc.animals.map((a) => (
          <li key={a.cardId} data-anim={a.cardId}>
            <span className="ra-glyph">{ANIMAL_GLYPH[a.defId]}</span>
            <span className="ra-name">{ANIMAL_BY_ID[a.defId].name}</span>
            <span className="ra-pts">{a.adjusted >= 0 ? `+${a.adjusted}` : a.adjusted}</span>
            {a.reasons.length > 0 && <span className="ra-why">{a.reasons.join(", ")}</span>}
          </li>
        ))}
        {sc.animals.length === 0 && <li className="muted empty">empty</li>}
      </ul>
      <div className="room-total">{sc.subtotal} × {def.multiplier} = <strong>{sc.total}</strong></div>
    </div>
  );
}
