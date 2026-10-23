// Deckbuilder — full pool, 30/max-3/legality + a Light-curve readout (the spec's deckbuilding loop).
// Click a pool card to add (max 3, up to 30); click a deck row to remove. Save persists to a slot.

import { useMemo, useState } from "react";
import { useStore } from "./store";
import { CardFace } from "./CardFace";
import { CurveBar } from "./CurveBar";
import { Button } from "./atoms";
import { allCards } from "../engine/content/registry";
import { getCard } from "../engine/content/registry";
import { isLegalDeck, STANDARD_FORMAT } from "../engine/content/format";
import { currentFormat } from "../engine/content/calendar";
import { AFFINITY } from "../render/theme";
import { Affinity, CardType } from "../engine/prism/types";

const AFFS: Affinity[] = ["ember", "tide", "verdant", "gloom", "order", "neutral"];
const TYPES: CardType[] = ["unit", "spell", "gear"];

export function Deckbuilder() {
  const builderCards = useStore((s) => s.builderCards);
  const builderName = useStore((s) => s.builderName);
  const career = useStore((s) => s.career);
  const A = useStore();
  const [affFilter, setAff] = useState<Affinity | null>(null);
  const [typeFilter, setType] = useState<CardType | null>(null);
  const [search, setSearch] = useState("");

  const pool = useMemo(() => {
    return allCards()
      .filter((c) => !affFilter || c.affinity === affFilter)
      .filter((c) => !typeFilter || c.type === typeFilter)
      .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [affFilter, typeFilter, search]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of builderCards) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [builderCards]);
  const distinct = [...counts.keys()].map((id) => getCard(id)).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  // legality reads the LIVE format in Story mode (so B&R announcements actually bind)
  const format = career ? currentFormat(career.day) : STANDARD_FORMAT;
  const legality = isLegalDeck(builderCards, format);
  const canSave = builderCards.length === 30 && legality.ok;

  return (
    <div className="builder">
      <div className="builder-head">
        <Button size="sm" variant="ghost" onClick={() => A.exitToHub()}>‹ Back</Button>
        <input className="name-input" value={builderName} onChange={(e) => A.setBuilderName(e.target.value)} aria-label="Deck name" />
        <span className={"tag " + (legality.ok ? "ok" : "warn")}>{builderCards.length}/30</span>
        <Button size="sm" variant="primary" disabled={!canSave} onClick={A.saveDeck}>💾 Save</Button>
        <Button size="sm" disabled={!canSave} onClick={() => { A.saveDeck(); A.setView("menu"); A.openOverlay("freeplay"); }}>Test in Free Play ▶</Button>
      </div>

      <div className="builder-body">
        {/* pool */}
        <div className="pool-pane">
          <div className="filters">
            <input className="search" placeholder="search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className={"chip" + (!affFilter ? " on" : "")} onClick={() => setAff(null)}>All</button>
            {AFFS.map((a) => (
              <button key={a} className={"chip" + (affFilter === a ? " on" : "")} style={{ color: AFFINITY[a].core }} onClick={() => setAff(affFilter === a ? null : a)}>{AFFINITY[a].glyph} {AFFINITY[a].label}</button>
            ))}
            {TYPES.map((t) => (
              <button key={t} className={"chip" + (typeFilter === t ? " on" : "")} onClick={() => setType(typeFilter === t ? null : t)}>{t}</button>
            ))}
          </div>
          <div className="pool-grid scroll">
            {pool.map((c) => {
              const have = counts.get(c.id) ?? 0;
              const owned = career ? career.collection[c.id] ?? 0 : 3; // quick-play = ungated pool
              const limit = Math.min(3, owned);
              const blocked = have >= limit || builderCards.length >= 30;
              return (
                <div key={c.id} className="pool-card" onClick={() => { if (!blocked) A.addCard(c.id); }} onPointerEnter={() => A.setPeek(c.id)} onPointerLeave={() => A.setPeek(null)}>
                  <CardFace card={c} size="list" selectable={!blocked} count={career ? owned : have || undefined} illegal={blocked} />
                </div>
              );
            })}
          </div>
        </div>

        {/* current deck */}
        <div className="deck-pane panel">
          <div className="panel-head">Your Deck</div>
          <div className="deck-list scroll">
            {distinct.length === 0 && <p className="muted" style={{ padding: 12 }}>Click cards to add them (max 3 each, 30 total).</p>}
            {distinct.map((c) => (
              <div key={c.id} className="deck-row" onClick={() => A.removeCard(c.id)} onPointerEnter={() => A.setPeek(c.id)} onPointerLeave={() => A.setPeek(null)}>
                <span className="dr-cost">{c.cost}</span>
                <span className="dr-aff" style={{ color: AFFINITY[c.affinity].core }}>{AFFINITY[c.affinity].glyph}</span>
                <span className="dr-name">{c.name}</span>
                <span className="dr-rar" style={{ color: `var(--rar-${c.rarity})` }}>{c.rarity[0].toUpperCase()}</span>
                <span className="dr-count">×{counts.get(c.id)}</span>
              </div>
            ))}
          </div>
          <div className="deck-foot">
            <CurveBar deck={builderCards} />
            {!legality.ok && builderCards.length > 0 && (
              <div className="legality">{legality.reasons.slice(0, 3).map((r, i) => <div key={i} className="warn-line">⚠ {r}</div>)}</div>
            )}
            {canSave && <div className="ok-line">✓ Legal deck</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
