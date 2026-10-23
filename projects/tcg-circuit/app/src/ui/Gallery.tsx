// Card Gallery — browse every card grouped by Set, with per-set completion and Affinity/rarity
// filters. (The collection economy is part of the deferred world; the harness exposes the full pool,
// so completion shows the full set.)

import { useState } from "react";
import { useStore } from "./store";
import { CardFace } from "./CardFace";
import { Button } from "./atoms";
import { allCards, cardsInSet, SETS } from "../engine/content/registry";
import { AFFINITY, RARITY } from "../render/theme";
import { Affinity, Rarity } from "../engine/prism/types";

const AFFS: Affinity[] = ["ember", "tide", "verdant", "gloom", "order", "neutral"];
const RARS: Rarity[] = ["common", "uncommon", "rare", "mythic"];

export function Gallery() {
  const A = useStore();
  const [aff, setAff] = useState<Affinity | null>(null);
  const [rar, setRar] = useState<Rarity | null>(null);

  return (
    <div className="gallery">
      <div className="builder-head">
        <Button size="sm" variant="ghost" onClick={() => A.exitToHub()}>‹ Back</Button>
        <h2 style={{ fontSize: 16 }}>Card Gallery</h2>
        <span className="muted">{allCards().length} cards</span>
        <div className="filters" style={{ marginLeft: "auto" }}>
          <button className={"chip" + (!aff ? " on" : "")} onClick={() => setAff(null)}>All</button>
          {AFFS.map((a) => (
            <button key={a} className={"chip" + (aff === a ? " on" : "")} style={{ color: AFFINITY[a].core }} onClick={() => setAff(aff === a ? null : a)}>{AFFINITY[a].glyph}</button>
          ))}
          {RARS.map((r) => (
            <button key={r} className={"chip" + (rar === r ? " on" : "")} style={{ color: RARITY[r].color }} onClick={() => setRar(rar === r ? null : r)}>{RARITY[r].label}</button>
          ))}
        </div>
      </div>

      <div className="gallery-body scroll">
        {SETS.map((set) => {
          const all = cardsInSet(set.id);
          const shown = all.filter((c) => (!aff || c.affinity === aff) && (!rar || c.rarity === rar));
          return (
            <div key={set.id} className="set-block">
              <div className="set-head">
                <h3>{set.name} <span className="tag">{set.code}</span></h3>
                <span className="muted">{shown.length} / {all.length} cards · {Math.round((shown.length / all.length) * 100)}%</span>
              </div>
              <div className="set-grid">
                {shown.map((c) => (
                  <div key={c.id} onPointerEnter={() => A.setPeek(c.id)} onPointerLeave={() => A.setPeek(null)}>
                    <CardFace card={c} size="list" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
