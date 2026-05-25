import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { CombatStage, STAGE_H, STAGE_W } from "../render/combatStage";
import { ShopItemVM, ShopVM } from "../render/shopStage";
import { HudHeldVM, HudJokerVM, HudTip, HudVM } from "../render/hudLayer";
import { applyPixiFixes } from "../render/pixiFixes";
import { contentMeta, discountedPrice, edictById, heldMax, jokerById, makeCardFromTemplate, maxSlots, tarotById } from "../engine/index";
import { PACK_LABEL, PACK_PICKS, SIZE_LABEL, LOOSE_TIP_TYPE, TYPE_CHIP, RARITY_CHIP } from "./packMeta";

applyPixiFixes(); // guard a Pixi v8.6 texture-pool bug before any rendering happens

// The single felt board, shared by combat AND the shop (Balatro's one stage). One persistent PixiJS
// Application/CombatStage renders the plasma felt, the draw pile and the played hand; the market is an
// embedded tray that rides up over the SAME felt (no separate canvas, no background reset). This
// component stays mounted across combat↔shop (see FeltScreen), so the felt is continuous. Renders at a
// low logical resolution (480×360), upscaled nearest-neighbour for a crisp 8-bit look.

async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load("12px 'Silkscreen'"),
      document.fonts.load("16px 'Press Start 2P'"),
    ]);
  } catch {
    /* fall back to system font silently */
  }
}

interface HoverTip {
  vm: ShopItemVM;
  x: number;
  y: number;
}
interface HudHoverTip {
  tip: HudTip;
  x: number;
  y: number;
}

export default function PixiBoard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<CombatStage | null>(null);
  const lastFx = useRef(0);
  const [tip, setTip] = useState<HoverTip | null>(null);
  const [hudTip, setHudTip] = useState<HudHoverTip | null>(null);

  function syncFromState(): void {
    const stage = stageRef.current;
    if (!stage) return;
    const run = useGame.getState().run;
    if (!run.combat) return;
    const e = run.combat.enemy;
    const lastCard = run.discard[run.discard.length - 1] ?? run.table[run.table.length - 1] ?? null;
    stage.sync({
      hand: run.hand,
      selectedIds: useGame.getState().selected,
      subphase: run.combat.subphase,
      incoming: run.combat.incoming,
      deckCount: run.deck.length,
      discardCount: run.discard.length + run.table.length,
      deckId: run.deckId,
      lastDiscard: lastCard ? { suit: lastCard.suit, value: lastCard.value, kind: lastCard.kind } : null,
      enemy: {
        tier: e.tier,
        maxHealth: e.maxHealth,
        damageTaken: e.damageTaken,
        attack: e.attack,
        shield: e.shield,
        immuneSuit: e.suit,
      },
    });
  }

  // The market view-model (offerings + costs), read from the live shop state.
  function buildShopVM(): ShopVM {
    const run = useGame.getState().run;
    const shop = run.shop;
    if (!shop) return { packs: [], wares: [], edicts: [], deckId: run.deckId, deckCount: run.deck.length, gold: run.gold, rerollCost: 0, removeCost: 0 };
    const packs: ShopItemVM[] = shop.packs.map((p) => {
      const price = discountedPrice(p.price, run.edicts);
      return { id: p.id, group: "pack", kind: p.kind, contentId: p.id, name: `${PACK_LABEL[p.kind]} · ${SIZE_LABEL[p.size]}`, text: `${SIZE_LABEL[p.size]} pack — ${PACK_PICKS[p.size]}.`, art: "", price, affordable: run.gold >= price, packLabel: PACK_LABEL[p.kind], packSize: SIZE_LABEL[p.size], shimmer: true, tipType: "booster" };
    });
    const wares: ShopItemVM[] = shop.looseOffers.map((o) => {
      const meta = contentMeta(o.kind, o.contentId);
      const price = discountedPrice(o.price, run.edicts);
      let card: ShopItemVM["card"] = null;
      if (o.kind === "card") {
        const c = makeCardFromTemplate(o.contentId, 0);
        card = { suit: c.suit, value: c.value, companion: c.kind === "companion" };
      }
      return { id: o.id, group: "ware", kind: o.kind, contentId: o.contentId, name: meta.name, text: meta.text, art: meta.art, price, affordable: run.gold >= price, card, tipType: LOOSE_TIP_TYPE[o.kind], rarity: meta.rarity };
    });
    const edicts: ShopItemVM[] = (shop.edictOffers ?? []).flatMap((id) => {
      const ed = edictById(id);
      if (!ed) return [];
      const price = discountedPrice(ed.price, run.edicts);
      return [{ id, group: "edict" as const, kind: "edict", contentId: id, name: ed.name, text: ed.text, art: ed.art, price, affordable: run.gold >= price, shimmer: true, tipType: "edict" }];
    });
    return { packs, wares, edicts, deckId: run.deckId, deckCount: run.deck.length, gold: run.gold, rerollCost: shop.rerollCost, removeCost: discountedPrice(shop.removeCardCost, run.edicts) };
  }

  // The guild/pouch HUD band: your jokers (sellable in the shop) + the consumable pouch.
  function buildHudVM(): HudVM {
    const run = useGame.getState().run;
    const inShop = run.phase === "shop";
    const jokers: HudJokerVM[] = run.slots.flatMap((id) => {
      const j = jokerById(id);
      if (!j) return [];
      return [{ id, artId: j.id, name: j.name, text: j.text, rarity: j.rarity, edition: run.slotEditions?.[id], sellValue: j.sellValue, sellable: inShop }];
    });
    const held: HudHeldVM[] = run.held.flatMap((h) => {
      const t = tarotById(h.tarotId);
      if (!t) return [];
      return [{ id: h.id, tarotId: h.tarotId, name: t.name, text: t.text }];
    });
    return { jokers, jokerMax: maxSlots(run), showPouch: inShop || !run.combat?.outcome, held, heldMax: heldMax(run) };
  }

  useEffect(() => {
    let cancelled = false;
    const app = new Application();

    void (async () => {
      await app.init({
        width: STAGE_W,
        height: STAGE_H,
        background: 0x120a18,
        antialias: false,
        roundPixels: true,
        resolution: 3, // higher-res "faux-retro" backing store — crisper felt text, matches the Pixi sidebar
        autoDensity: false,
        textureGCActive: false,
        renderableGCActive: false,
      });
      await loadFonts();
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.display = "block";
        app.canvas.style.imageRendering = "pixelated";
      }
      const stage = new CombatStage(app);
      // ---- combat intents ----
      stage.onCardTap = (id) => {
        const g = useGame.getState();
        if (g.pendingPick) {
          sfx.reward();
          g.pendingPick(id);
          g.setPendingPick(null);
          return;
        }
        sfx.select();
        g.toggleSelect(id);
      };
      stage.onDeckClick = () => {
        sfx.pile();
        useGame.getState().setPileModal("deck");
      };
      stage.onDiscardClick = () => {
        sfx.pile();
        useGame.getState().setPileModal("discard");
      };
      stage.onDeckHover = (over) => useGame.getState().setDeckHover(over);
      stage.onHover = (id) => {
        if (id) sfx.leaf();
        useGame.getState().setHoverId(id);
      };
      stage.onCardBlock = (id) => {
        const g = useGame.getState();
        if (!g.selected.includes(id)) g.toggleSelect(id);
        const s2 = useGame.getState();
        const c = s2.run.combat;
        if (!c) return;
        const total = s2.run.hand.filter((card) => s2.selected.includes(card.id)).reduce((a, card) => a + card.value, 0);
        if (total >= c.incoming) s2.discardSelected();
      };
      stage.onCardPlay = (id) => {
        const g = useGame.getState();
        if (g.pendingPick) {
          sfx.reward();
          g.pendingPick(id);
          g.setPendingPick(null);
          return;
        }
        if (g.selected.includes(id) && g.selected.length > 1) {
          g.playCards();
        } else {
          g.clearSelect();
          g.toggleSelect(id);
          useGame.getState().playCards();
        }
      };
      // ---- shop intents (the tray is a layer on this same felt) ----
      stage.onShopBuy = (vm) => {
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
      stage.onShopReroll = () => {
        const g = useGame.getState();
        if (g.run.shop && g.run.gold >= g.run.shop.rerollCost) {
          sfx.buy();
          g.dispatch({ type: "reroll" });
        }
      };
      stage.onShopRemove = () => {
        const g = useGame.getState();
        g.setPendingPick((cardId) => g.dispatch({ type: "removeCard", targetCardId: cardId }), "Remove which card from your deck?");
        g.setPileModal("all");
      };
      stage.onShopNextFight = () => useGame.getState().dispatch({ type: "nextFight" });
      stage.onShopHover = (vm, screen) => setTip(vm && screen ? { vm, x: screen.x, y: screen.y } : null);

      // guild/pouch HUD band intents
      stage.onHudSellJoker = (id) => {
        sfx.coin();
        useGame.getState().dispatch({ type: "sellJoker", jokerId: id });
      };
      stage.onHudUseHeld = (instanceId, tarotId) => {
        const t = tarotById(tarotId);
        if (!t) return;
        const g = useGame.getState();
        if (t.target) {
          // targeting tarot: pick a card (deck modal in the shop, tap a hand card mid-combat)
          g.setPendingPick((cardId) => g.dispatch({ type: "useHeld", instanceId, targetCardId: cardId }), `Use ${t.name} on a card`);
          if (g.run.phase === "shop") g.setPileModal("all");
        } else {
          sfx.buy();
          g.dispatch({ type: "useHeld", instanceId });
        }
      };
      stage.onHudHover = (t, screen) => setHudTip(t && screen ? { tip: t, x: screen.x, y: screen.y } : null);

      stageRef.current = stage;
      // Treat any pre-existing FX event as already handled (avoid re-firing a stale kill cascade).
      lastFx.current = useGame.getState().fxEvent?.id ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__stage = stage;
      // initial mode + sync
      if (useGame.getState().run.phase === "shop") {
        stage.setMode("shop");
        stage.syncShop(buildShopVM());
      }
      syncFromState();
      stage.syncHud(buildHudVM());
    })();

    const unsub = useGame.subscribe((s) => {
      const stage = stageRef.current;
      if (!stage) return;
      if (s.paused) {
        stage.app.ticker.stop();
        return;
      }
      if (!stage.app.ticker.started) stage.app.ticker.start();
      stage.syncHud(buildHudVM()); // jokers/pouch band — cheap (skips when unchanged)
      if (s.run.phase === "shop") {
        stage.setMode("shop");
        stage.syncShop(buildShopVM());
        syncFromState(); // the felt's draw pile keeps rendering under the tray
        return;
      }
      stage.setMode("combat");
      const ev = s.fxEvent;
      if (ev && ev.id !== lastFx.current) {
        lastFx.current = ev.id;
        if (ev.kind === "jester") sfx.jester();
        stage.setExitMode(ev.kind === "play" ? "toEnemy" : "toDiscard");
        syncFromState();
        const playMeta = ev.style ? { style: ev.style, mounted: !!ev.mounted, value: ev.comboValue ?? 0 } : undefined;
        stage.handleEvent(ev.kind, ev.result, ev.killed, ev.strike, playMeta, ev.blocked);
      } else {
        syncFromState();
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
  }, []);

  const chip = tip?.vm.tipType ? TYPE_CHIP[tip.vm.tipType] : undefined;
  const rarityChip = tip?.vm.rarity ? RARITY_CHIP[tip.vm.rarity] : undefined;
  const hudChip = hudTip?.tip.type ? TYPE_CHIP[hudTip.tip.type] : undefined;
  const hudRarityChip = hudTip?.tip.rarity ? RARITY_CHIP[hudTip.tip.rarity] : undefined;
  return (
    <>
      <div className="pixi-host" ref={hostRef} />
      {tip && (
        <div className="tip-pop tip-top shop-tip" style={{ left: Math.min(Math.max(tip.x, 138), window.innerWidth - 138), top: tip.y - 14 }} role="tooltip">
          <div className="tip-title">{tip.vm.name}</div>
          <div className="tip-body">{tip.vm.text}</div>
          {(chip || rarityChip) && (
            <div className="tip-chips">
              {chip && <span className={`tip-type ${chip.cls}`}>{chip.label}</span>}
              {rarityChip && <span className={`tip-type ${rarityChip.cls}`}>{rarityChip.label}</span>}
            </div>
          )}
        </div>
      )}
      {hudTip && (
        <div className="tip-pop tip-bottom shop-tip" style={{ left: Math.min(Math.max(hudTip.x, 138), window.innerWidth - 138), top: hudTip.y + 10 }} role="tooltip">
          <div className="tip-title">{hudTip.tip.name}</div>
          <div className="tip-body">{hudTip.tip.text}</div>
          {(hudChip || hudRarityChip) && (
            <div className="tip-chips">
              {hudChip && <span className={`tip-type ${hudChip.cls}`}>{hudChip.label}</span>}
              {hudRarityChip && <span className={`tip-type ${hudRarityChip.cls}`}>{hudRarityChip.label}</span>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
