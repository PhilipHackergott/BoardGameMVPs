import { useGame } from "./store";
import CardFace from "./CardFace";
import { JokerArt, TarotArt } from "./CardArt";
import { contentMeta, makeCardFromTemplate } from "../engine/index";
import { PackKind, PackSize } from "../engine/types";
import { sfx } from "../audio/chiptune";

// The pack-opening modal: after a pack is bought it enters `shop.openPack`; this reveals its
// contents with a crack-open burst animation and lets you keep your pick(s).

const PACK_LABEL: Record<PackKind, string> = {
  card: "Card Pack",
  tarot: "Tarot Pack",
  relic: "Joker Pack",
  style: "Training Pack",
  spectral: "Spectral Pack",
};
const SIZE_LABEL: Record<PackSize, string> = { s: "S", m: "M", l: "L", xl: "XL" };

export default function PackModal() {
  const pack = useGame((s) => s.run.shop?.openPack ?? null);
  if (!pack) return null;

  const close = () => useGame.getState().dispatch({ type: "closePack" });
  const pick = (contentId: string) => {
    sfx.reward();
    useGame.getState().dispatch({ type: "pickPackContent", contentId });
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
        <div className="pack-contents">
          {pack.contentIds.map((cid, i) => {
            const meta = contentMeta(pack.kind, cid);
            return (
              <button
                key={cid + i}
                type="button"
                className={`pack-pick ${pack.kind === "card" ? "is-card" : ""} ${meta.rarity ? `rarity-${meta.rarity}` : ""}`}
                style={{ animationDelay: `${i * 70}ms` }}
                data-tip={meta.text}
                onClick={() => pick(cid)}
              >
                {pack.kind === "card" ? (
                  <CardFace card={makeCardFromTemplate(cid, i)} className="pack-card" />
                ) : pack.kind === "relic" ? (
                  <JokerArt id={cid} art={meta.art} size={48} />
                ) : (
                  <TarotArt id={cid} art={meta.art} size={48} />
                )}
                <span className="pp-name">{meta.name}</span>
                <span className="pp-text">{meta.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
