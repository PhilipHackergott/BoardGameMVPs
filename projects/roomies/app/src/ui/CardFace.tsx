import { ANIMAL_BY_ID, ENV_BY_ID, IMPROVEMENT_BY_ID, type Card } from "../engine";
import { animalBadges, animalEffectText, BIOME_GLYPH, BIOME_LABEL, cardGlyph, GLYPH_SCALE, improvementEffectText, sheepTintClass } from "./cardText";

// A single card face (glyph "art" + title + meta + badges/effect). Presentational only.
export function CardFace({ card, jokered }: { card: Card; jokered?: boolean }) {
  const glyph = cardGlyph(card);
  if (card.kind === "env") {
    const d = ENV_BY_ID[card.defId];
    return (
      <div className="cf">
        <div className="cf-glyph">{glyph}</div>
        <div className="cf-name">{d.name}</div>
        <div className="cf-meta">Raum {d.raum} · ×{d.multiplier}</div>
        <div className="cf-badges">
          {d.biomes.map((b) => <span key={b} className={`biome biome-${b}`}>{BIOME_GLYPH[b]} {BIOME_LABEL[b]}</span>)}
        </div>
      </div>
    );
  }
  if (card.kind === "animal") {
    const d = ANIMAL_BY_ID[card.defId];
    const scale = GLYPH_SCALE[card.defId];
    const tint = sheepTintClass(card.defId, card.id);
    return (
      <div className="cf">
        <div className="cf-glyph">
          <span className={tint ?? undefined} style={scale ? { fontSize: `${scale}em`, display: "inline-block" } : undefined}>{glyph}</span>
          {jokered ? <span className="cf-joker">🃏</span> : null}
        </div>
        <div className="cf-name">{d.name}</div>
        <div className="cf-meta">Raum {d.raum} · {d.base} pts</div>
        <div className="cf-badges">{animalBadges(card.defId).map((b) => <span key={b} className="kw">{b}</span>)}</div>
        <div className="cf-effect">{animalEffectText(card.defId)}</div>
      </div>
    );
  }
  const d = IMPROVEMENT_BY_ID[card.defId];
  return (
    <div className="cf">
      <div className="cf-glyph">{glyph}</div>
      <div className="cf-name">{d.name}</div>
      <div className="cf-meta">Improvement</div>
      <div className="cf-effect">{improvementEffectText(card.defId)}</div>
    </div>
  );
}
