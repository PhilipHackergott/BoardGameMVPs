import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { sfx } from "../audio/chiptune";
import { CombatStage, STAGE_H, STAGE_W } from "../render/combatStage";
import { ShopItemVM, ShopVM } from "../render/shopStage";
import { HudHeldVM, HudJokerVM, HudVM } from "../render/hudLayer";
import { FeltControlsVM } from "../render/feltControls";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";
import { contentMeta, discountedPrice, edictById, heldMax, jokerById, makeCardFromTemplate, maxSlots, tarotById } from "../engine/index";
import { PACK_LABEL, PACK_PICKS, SIZE_LABEL, LOOSE_TIP_TYPE } from "./packMeta";
import { useTooltip } from "./tooltip";

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

// The felt's hover tooltips (shop wares + the guild/pouch band) feed the ONE shared tooltip surface
// (see tooltip.tsx) — same bubble the DOM `data-tip` and the Pixi modals use.
const TIP = Symbol("felt-hover");

export default function PixiBoard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<CombatStage | null>(null);
  const lastFx = useRef(0);
  // Bumped to remount the felt if its WebGL context is ever lost (browsers cap live contexts; opening
  // modals across a long session can evict the felt's — without this it stays a black screen). The
  // store is the source of truth, so a remount re-syncs the live combat with no state loss.
  const [gen, setGen] = useState(0);

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

  // The combat action controls: Sort, the defend block prompt, the wildcard suit-picker, the pending-
  // pick banner and the block pill. (Felt-only; the shop hides them via setMode.)
  function buildControlsVM(): FeltControlsVM {
    const g = useGame.getState();
    const run = g.run;
    const combat = run.combat;
    if (!combat) return { show: false, defend: false, incoming: 0, thrown: 0, blockEnough: false, block: 0, hasSelection: false, hasHover: false, pendingLabel: null, wildcards: [] };
    const selected = g.selected;
    const defend = combat.subphase === "defend";
    const thrown = run.hand.filter((c) => selected.includes(c.id)).reduce((a, c) => a + c.value, 0);
    const hasHover = !!g.hoverId && run.hand.some((c) => c.id === g.hoverId);
    const wildcards = defend
      ? []
      : run.hand
          .filter((c) => selected.includes(c.id) && (c.sigils ?? []).includes("wildcard"))
          .map((c) => ({ id: c.id, label: `Wild ${c.value > 1 ? c.value : "A"}`, suit: g.wildSuits[c.id] ?? c.suit ?? "H" }));
    return {
      show: !combat.outcome,
      defend,
      incoming: combat.incoming,
      thrown,
      blockEnough: thrown >= combat.incoming,
      block: combat.enemy.shield, // the player's accumulated block (soaks the royal's next strike)
      hasSelection: selected.length > 0,
      hasHover,
      pendingLabel: g.pendingPick ? g.pickLabel ?? "Tap a card" : null,
      wildcards,
    };
  }

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    // If the GL context is lost, keep the canvas (preventDefault) and remount on the next tick so a
    // fresh context replaces it — heals the "black felt after a modal" report instead of staying dead.
    const onCtxLost = (e: Event) => {
      e.preventDefault();
      window.setTimeout(() => {
        if (!cancelled) setGen((g) => g + 1);
      }, 0);
    };

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
        releaseApp(app);
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        app.canvas.style.width = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.display = "block";
        app.canvas.style.imageRendering = "pixelated";
        app.canvas.addEventListener("webglcontextlost", onCtxLost, false);
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
        useTooltip.getState().hide(TIP);
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
      stage.onShopHover = (vm, rect) =>
        vm && rect
          ? useTooltip.getState().show(TIP, { title: vm.name, text: vm.text, type: vm.tipType, rarity: vm.rarity, anchor: rect })
          : useTooltip.getState().hide(TIP);

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
      stage.onHudHover = (t, rect) =>
        t && rect
          ? useTooltip.getState().show(TIP, { title: t.name, text: t.text, type: t.type, rarity: t.rarity, anchor: rect })
          : useTooltip.getState().hide(TIP);

      // ---- combat action controls (sort / defend block / wildcard picker / pending-pick) ----
      stage.onSort = (k) => {
        sfx.click();
        useGame.getState().sortHand(k);
      };
      stage.onAuto = () => useGame.getState().autoBlock();
      stage.onBlock = () => useGame.getState().discardSelected();
      stage.onSetWild = (cardId, suit) => {
        sfx.select();
        useGame.getState().setWildSuit(cardId, suit);
      };
      stage.onCancelPick = () => {
        sfx.click();
        useGame.getState().setPendingPick(null);
      };

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
      stage.syncControls(buildControlsVM());
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
      stage.syncControls(buildControlsVM());
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
      try {
        app.canvas?.removeEventListener("webglcontextlost", onCtxLost);
      } catch {
        /* canvas already gone */
      }
      useTooltip.getState().hide(TIP); // clear any felt tooltip when the board unmounts
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage) {
        stage.destroy();
        releaseApp(stage.app);
      }
    };
  }, [gen]);

  return <div className="pixi-host" ref={hostRef} />;
}
