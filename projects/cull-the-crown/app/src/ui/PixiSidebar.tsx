import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame } from "./store";
import { audio, music, sfx } from "../audio/chiptune";
import { FxCol, SidebarStage, SidebarVM, SIDEBAR_H, SIDEBAR_W } from "../render/sidebarStage";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";
import { currentHandMax, edictById, enemyIntent, previewPlay, styleOf } from "../engine/index";
import { FIGHTING_STYLE_NAME, FIGHTING_STYLE_PER_LEVEL, Suit } from "../engine/types";
import { GLYPH } from "./suits";

applyPixiFixes();

// The run sidebar as a Pixi canvas (the "game chrome" in Pixi). Hosts SidebarStage, builds its VM from
// the store each change, and routes its intents back. Replaces the DOM combat/shop sidebars in
// FeltScreen; the felt board + the joker/pouch HUD stay their own layers.

const ACT_NAME: Record<string, string> = { jack: "I · Jacks", queen: "II · Queens", king: "III · Kings" };

function buildVM(): SidebarVM {
  const s = useGame.getState();
  const run = s.run;
  const round = `${Math.min(run.enemyIndex + 1, run.castle.length)}/${run.castle.length}`;
  const edicts = (run.edicts ?? []).flatMap((id: string) => {
    const e = edictById(id);
    return e ? [{ id, name: e.name }] : [];
  });
  if (run.phase === "shop" || !run.combat) return { mode: "shop", gold: run.gold, round, edicts };

  const combat = run.combat;
  const defend = combat.subphase === "defend";
  const upg = run.suitUpgrades;
  const trained = (["H", "D", "C", "S"] as Suit[]).filter((x) => upg[x] > 0).map((x) => `${GLYPH[x]}+${upg[x]}`).join(" ");
  const selected = s.selected;
  const inHand = (id: string | null): id is string => !!id && run.hand.some((c) => c.id === id);
  const previewIds = selected.length > 0 ? selected : inHand(s.hoverId) ? [s.hoverId] : [];
  const preview = previewPlay(run, previewIds, s.wildSuits);
  const intent = enemyIntent(run);
  const style = styleOf(run.hand.filter((c) => previewIds.includes(c.id)));
  const styleLvl = run.styleLevels[style.size] ?? 0;
  const styleBonus = styleLvl * (FIGHTING_STYLE_PER_LEVEL[style.size] ?? 0);
  const empty = previewIds.length === 0;
  const styleMult = 1 + styleBonus; // STYLE phase scales suit effects by floor(base × (1 + Σ lvl·per))
  const eff = { damage: preview.damage, shield: preview.shield, draw: preview.draw, heal: preview.heal };
  // per-effect highlight, only when that effect actually has a value (a box at 0 stays neutral grey —
  // the royal's immunity is already shown in the royal panel, so an empty box never lights up):
  // red if the royal's immunity disables that suit, green if the style boosts it.
  const imm: Suit | null = combat.enemy.immunityCancelled ? null : combat.enemy.suit;
  const boosted = !empty && preview.valid && styleMult > 1.001;
  const fxFor = (s: Suit, val: number): FxCol => (val <= 0 ? "none" : imm === s ? "debuff" : boosted ? "buff" : "none");
  return {
    mode: "combat",
    gold: run.gold,
    round,
    royalTier: combat.enemy.tier,
    royalSuit: combat.enemy.suit,
    hp: Math.max(0, combat.enemy.maxHealth - combat.enemy.damageTaken),
    maxHp: combat.enemy.maxHealth,
    intent: intent ? { incoming: intent.incoming, enraged: intent.enraged, ignoresShield: intent.ignoresShield } : null,
    decrees: intent?.decrees.map((d) => ({ name: d.name, note: d.note ?? undefined })) ?? [],
    outcome: !!combat.outcome,
    turn: defend ? "defend" : "play",
    incoming: combat.incoming,
    styleName: empty ? "" : preview.valid ? FIGHTING_STYLE_NAME[style.size] : "Illegal hand",
    styleSub: empty ? "hover or select cards" : preview.valid ? `Lv ${styleLvl + 1}${styleBonus > 0 ? ` · +${styleBonus} to effects` : ""}` : preview.reason ?? "",
    styleId: style.size,
    styleMounted: !empty && preview.valid && style.mounted,
    styleWarn: !empty && !preview.valid,
    styleMult,
    effects: eff,
    fx: { damage: fxFor("C", eff.damage), shield: fxFor("S", eff.shield), draw: fxFor("D", eff.draw), heal: fxFor("H", eff.heal) },
    stage: ACT_NAME[combat.enemy.tier] ?? combat.enemy.tier,
    hand: `${run.hand.length}/${currentHandMax(run)}`,
    trained,
    canPlay: selected.length > 0 && preview.valid,
    hasSelection: selected.length > 0,
    edicts,
  };
}

export default function PixiSidebar() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<SidebarStage | null>(null);
  const [gen, setGen] = useState(0); // remount key — heals a lost WebGL context (mirrors PixiBoard)

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    const onCtxLost = (e: Event) => {
      e.preventDefault();
      window.setTimeout(() => {
        if (!cancelled) setGen((g) => g + 1);
      }, 0);
    };
    void (async () => {
      await app.init({ width: SIDEBAR_W, height: SIDEBAR_H, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: 3, autoDensity: false, textureGCActive: false, renderableGCActive: false });
      // Defensive: a single bad-frame throw must not permanently blank the sidebar; persistent failure
      // remounts (gen bump). Mirrors PixiBoard.
      const origRender = app.renderer.render.bind(app.renderer);
      let failStreak = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (app.renderer as any).render = (...args: unknown[]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = (origRender as any)(...args);
          if (failStreak !== 0) failStreak = 0;
          return r;
        } catch {
          failStreak += 1;
          if (failStreak === 20) {
            window.setTimeout(() => { if (!cancelled) setGen((g) => g + 1); }, 0);
          }
        }
      };
      try {
        await Promise.all([document.fonts.load("12px 'Silkscreen'"), document.fonts.load("16px 'Press Start 2P'")]);
      } catch {
        /* system font fallback */
      }
      if (cancelled) {
        releaseApp(app);
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        // Scale by WIDTH only (height:auto) so the 320×640 canvas keeps its 1:2 aspect — stretching it
        // to fill the column's height was the source of the warped text / uneven boxes.
        app.canvas.style.width = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.display = "block";
        app.canvas.style.imageRendering = "pixelated";
        app.canvas.addEventListener("webglcontextlost", onCtxLost, false);
      }
      const stage = new SidebarStage(app);
      stage.onPlay = () => useGame.getState().playCards();
      stage.onClear = () => useGame.getState().clearSelect();
      stage.onSort = (k) => useGame.getState().sortHand(k);
      stage.onRunInfo = () => useGame.getState().setMapOpen(true);
      stage.onOptions = () => useGame.getState().setPaused(true);
      stage.onMute = () => {
        const next = !audio.muted;
        audio.setMuted(next);
        music.start();
        if (!next) sfx.select();
        stage.setMuted(next);
      };
      stage.setMuted(audio.muted);
      stageRef.current = stage;
      stage.sync(buildVM());
    })();

    const unsub = useGame.subscribe(() => {
      const stage = stageRef.current;
      if (!stage) return;
      stage.sync(buildVM());
    });

    return () => {
      cancelled = true;
      unsub();
      try {
        app.canvas?.removeEventListener("webglcontextlost", onCtxLost);
      } catch {
        /* canvas already gone */
      }
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage) {
        stage.destroy();
        releaseApp(stage.app);
      }
    };
  }, [gen]);

  return <div className="pixi-sidebar-host" ref={hostRef} />;
}
