import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { applyPixiFixes } from "../render/pixiFixes";
import { ShopStage, SHOP_W, SHOP_H, ShopVM, ShopItemVM } from "../render/shopStage";
import { contentMeta, discountedPrice, edictById, makeCardFromTemplate } from "../engine/index";
import { PackKind, PackSize } from "../engine/types";

applyPixiFixes();

// The Black Market rendered as a Pixi tray that slides up over the battle felt. Wares, packs and
// edicts are physical floating card objects; reroll / remove / next-fight are tray buttons. All
// intents dispatch through the store. The sidebar (DOM) shows the big animated SHOP sign + run state.

const PACK_LABEL: Record<PackKind, string> = { card: "Card Pack", tarot: "Tarot Pack", relic: "Joker Pack", style: "Training Pack", spectral: "Spectral Pack" };
const PACK_PICKS: Record<PackSize, string> = { s: "pick 1 of 2", m: "pick 1 of 3", l: "pick 1 of 5", xl: "pick 2 of 5" };
const LOOSE_TIP_TYPE: Record<PackKind, string> = { card: "card", tarot: "tarot", relic: "joker", style: "drill", spectral: "spectral" };

const TYPE_CHIP: Record<string, { label: string; cls: string }> = {
  joker: { label: "Joker", cls: "tt-joker" },
  tarot: { label: "Tarot", cls: "tt-tarot" },
  spectral: { label: "Spectral", cls: "tt-spectral" },
  drill: { label: "Training", cls: "tt-drill" },
  card: { label: "Playing Card", cls: "tt-card" },
  booster: { label: "Booster", cls: "tt-booster" },
  edict: { label: "Edict", cls: "tt-edict" },
};

interface HoverTip {
  vm: ShopItemVM;
  x: number;
  y: number;
}

export default function ShopBoard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ShopStage | null>(null);
  const [tip, setTip] = useState<HoverTip | null>(null);

  function buildVM(): ShopVM {
    const run = useGame.getState().run;
    const shop = run.shop;
    if (!shop) return { packs: [], wares: [], edicts: [], deckId: run.deckId, deckCount: run.deck.length, gold: run.gold, rerollCost: 0, removeCost: 0 };
    const packs: ShopItemVM[] = shop.packs.map((p) => {
      const price = discountedPrice(p.price, run.edicts);
      return { id: p.id, group: "pack", kind: p.kind, contentId: p.id, name: PACK_LABEL[p.kind], text: `${PACK_PICKS[p.size]}.`, art: "", price, affordable: run.gold >= price, packLabel: PACK_LABEL[p.kind], shimmer: true, tipType: "booster" };
    });
    const wares: ShopItemVM[] = shop.looseOffers.map((o) => {
      const meta = contentMeta(o.kind, o.contentId);
      const price = discountedPrice(o.price, run.edicts);
      let card: ShopItemVM["card"] = null;
      if (o.kind === "card") {
        const c = makeCardFromTemplate(o.contentId, 0);
        card = { suit: c.suit, value: c.value, companion: c.kind === "companion" };
      }
      return { id: o.id, group: "ware", kind: o.kind, contentId: o.contentId, name: meta.name, text: meta.text, art: meta.art, price, affordable: run.gold >= price, card, tipType: LOOSE_TIP_TYPE[o.kind] };
    });
    const edicts: ShopItemVM[] = (shop.edictOffers ?? []).flatMap((id) => {
      const e = edictById(id);
      if (!e) return [];
      const price = discountedPrice(e.price, run.edicts);
      return [{ id, group: "edict" as const, kind: "edict", contentId: id, name: e.name, text: e.text, art: e.art, price, affordable: run.gold >= price, shimmer: true, tipType: "edict" }];
    });
    return {
      packs,
      wares,
      edicts,
      deckId: run.deckId,
      deckCount: run.deck.length,
      gold: run.gold,
      rerollCost: shop.rerollCost,
      removeCost: discountedPrice(shop.removeCardCost, run.edicts),
    };
  }

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      await app.init({ width: SHOP_W, height: SHOP_H, background: 0x120a18, antialias: false, roundPixels: true, resolution: 1, autoDensity: false, textureGCActive: false, renderableGCActive: false });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";
        app.canvas.style.display = "block";
        app.canvas.style.objectFit = "contain";
        app.canvas.style.imageRendering = "pixelated";
      }
      const stage = new ShopStage(app);
      stage.onBuy = (vm) => {
        const g = useGame.getState();
        if (!vm.affordable) return;
        if (vm.group === "pack") {
          sfx.packOpen();
          g.dispatch({ type: "openPack", packId: vm.id });
        } else if (vm.group === "edict") {
          sfx.buy();
          g.dispatch({ type: "buyEdict", offerId: vm.id });
        } else {
          sfx.buy();
          g.dispatch({ type: "buyLoose", offerId: vm.id });
        }
        setTip(null);
      };
      stage.onReroll = () => {
        const g = useGame.getState();
        if (g.run.shop && g.run.gold >= g.run.shop.rerollCost) {
          sfx.buy();
          g.dispatch({ type: "reroll" });
        }
      };
      stage.onRemove = () => {
        const g = useGame.getState();
        g.setPendingPick((cardId) => g.dispatch({ type: "removeCard", targetCardId: cardId }), "Remove which card from your deck?");
        g.setPileModal("all");
      };
      stage.onNextFight = () => useGame.getState().dispatch({ type: "nextFight" });
      stage.onHover = (vm, screen) => setTip(vm && screen ? { vm, x: screen.x, y: screen.y } : null);
      stageRef.current = stage;
      stage.setShop(buildVM());
    })();

    const unsub = useGame.subscribe((s, prev) => {
      const stage = stageRef.current;
      if (!stage) return;
      if (s.run !== prev.run && s.run.phase === "shop") {
        stage.setShop(buildVM());
        setTip(null);
      }
    });

    return () => {
      cancelled = true;
      unsub();
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage) {
        stage.destroy();
        stage.app.destroy(true, { children: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chip = tip?.vm.tipType ? TYPE_CHIP[tip.vm.tipType] : undefined;
  return (
    <div className="shop-board">
      <div className="pixi-host shop-host" ref={hostRef} />
      {tip && (
        <div className="tip-pop tip-top shop-tip" style={{ left: Math.min(Math.max(tip.x, 138), window.innerWidth - 138), top: tip.y - 14 }} role="tooltip">
          <div className="tip-title">{tip.vm.name}</div>
          <div className="tip-body">{tip.vm.text}</div>
          {chip && <div className={`tip-type ${chip.cls}`}>{chip.label}</div>}
        </div>
      )}
    </div>
  );
}
