import { useState } from "react";
import { useGame } from "./store";
import PixiCard from "./PixiCard";
import { JokerArt, TarotArt } from "./CardArt";
import { contentMeta, makeCardFromTemplate, tarotById } from "../engine/index";
import { PACK_LABEL, SIZE_LABEL } from "./packMeta";
import { sfx } from "../audio/chiptune";

// The pack-opening modal. After a pack is bought it enters `shop.openPack`; this reveals its contents
// with a crack-open burst. Joker/Training/Card packs: pick to keep. Tarot & Spectral packs open over a
// fan of up to 8 cards drawn from your deck (run.hand) — you apply the pack's cards onto that fan right
// away (targeted tarots want a chosen card; hand-wide spectrals reshape the lot), Balatro-style.

export default function PackModal() {
  const pack = useGame((s) => s.run.shop?.openPack ?? null);
  const hand = useGame((s) => s.run.hand);
  const [armed, setArmed] = useState<string | null>(null); // a targeting consumable awaiting a target card
  if (!pack) return null;

  const isHandPack = pack.kind === "tarot" || pack.kind === "spectral";
  const close = () => {
    setArmed(null);
    useGame.getState().dispatch({ type: "closePack" });
  };
  const apply = (contentId: string, targetCardId?: string) => {
    sfx.reward();
    useGame.getState().dispatch({ type: "pickPackContent", contentId, targetCardId });
    setArmed(null);
  };
  const clickContent = (contentId: string) => {
    // A tarot/spectral that targets a card arms it; you then click a fan card. Everything else applies now.
    if (isHandPack && tarotById(contentId)?.target) {
      setArmed((cur) => (cur === contentId ? null : contentId));
      return;
    }
    apply(contentId);
  };

  return (
    <div className="help-backdrop pack-backdrop" role="dialog" aria-modal="true" aria-label="Open pack" onClick={close}>
      <div className="pack-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pack-burst" aria-hidden="true" />
        <div className="help-head">
          <h2>
            {PACK_LABEL[pack.kind]} <span className="pile-count">{SIZE_LABEL[pack.size]} · choose {pack.picksRemaining} of {pack.contentIds.length}</span>
          </h2>
          <button type="button" className="primary" onClick={close}>
            {pack.picksRemaining > 0 ? "Skip rest" : "Close"}
          </button>
        </div>

        {isHandPack && (
          <div className="pack-fan-wrap">
            <div className={`pack-fan-label ${armed ? "armed" : ""}`}>
              {armed ? "▾ apply to a card" : "cards drawn from your deck"}
            </div>
            <div className={`pack-fan ${armed ? "targeting" : ""}`}>
              {hand.map((c, i) => {
                const mid = (hand.length - 1) / 2;
                const rot = (i - mid) * 5;
                const lift = Math.abs(i - mid) * 5;
                return (
                  <div key={c.id} className="pack-fan-card" style={{ transform: `rotate(${rot}deg) translateY(${lift}px)` }}>
                    <PixiCard card={c} w={50} className={armed ? "targetable" : ""} onClick={armed ? () => apply(armed, c.id) : undefined} />
                  </div>
                );
              })}
              {hand.length === 0 && <div className="pack-fan-empty">Your deck is empty.</div>}
            </div>
          </div>
        )}

        <div className="pack-contents">
          {pack.contentIds.map((cid, i) => {
            const meta = contentMeta(pack.kind, cid);
            const targets = isHandPack && !!tarotById(cid)?.target;
            return (
              <button
                key={cid + i}
                type="button"
                className={`pack-pick ${pack.kind === "card" ? "is-card" : ""} ${meta.rarity ? `rarity-${meta.rarity}` : ""} ${armed === cid ? "armed" : ""}`}
                style={{ animationDelay: `${i * 70}ms` }}
                data-tip={meta.text}
                onClick={() => clickContent(cid)}
              >
                {pack.kind === "card" ? (
                  <PixiCard card={makeCardFromTemplate(cid, i)} w={66} className="pack-card" />
                ) : pack.kind === "relic" ? (
                  <JokerArt id={cid} art={meta.art} size={48} />
                ) : (
                  <TarotArt id={cid} art={meta.art} size={48} />
                )}
                <span className="pp-name">{meta.name}</span>
                <span className="pp-text">{meta.text}</span>
                {targets && <span className="pp-hint">{armed === cid ? "↑ pick a card" : "tap, then a card"}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
