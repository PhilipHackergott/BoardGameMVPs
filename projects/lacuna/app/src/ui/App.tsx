import { useEffect, useState } from "react";
import { currentHasLegalMove, useGame } from "../state/store";
import {
  aiAbyss,
  aiActive,
  aiClaim,
  aiDraftAffinity,
  aiDraftPick,
  aiDusk,
  aiFlexPass,
  aiFreePick,
  aiPlace,
  aiRepelPoint,
} from "../ai/ai";
import { MainMenu } from "./MainMenu";
import { DraftScreen } from "./DraftScreen";
import { DuskPicker } from "./DuskPicker";
import { Header } from "./Header";
import { PlayerColumn } from "./PlayerColumn";
import { ActionBanner } from "./ActionBanner";
import { GameCanvas } from "./GameCanvas";
import { Controls } from "./Controls";
import { TerritoryScrubber } from "./TerritoryScrubber";
import { RulesModal } from "./RulesModal";
import { LogModal } from "./LogModal";
import { Footer } from "./Footer";
import { FlyLayer } from "./FlyLayer";
import { VictoryOverlay } from "./VictoryOverlay";

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
  const clocks = useGame((s) => s.clocks);
  const config = useGame((s) => s.config);
  const draft = useGame((s) => s.draft);
  const pickupMode = useGame((s) => s.pickupMode);
  const paused = useGame((s) => s.paused);
  const revealAuto = useGame((s) => s.revealAuto);
  const startGame = useGame((s) => s.startGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  // AI driver: when the current actor (drafter or player) is an AI, step it one move
  // at a time through whichever phase/sub-phase is active, with a short delay.
  useEffect(() => {
    const s = useGame.getState();
    if (s.paused) return; // all-AI match paused for analysis — don't step the AI
    let diff = null as null | "low" | "medium" | "hard";
    if (s.screen === "draft" && s.draft) diff = s.config.ai[s.draft.order[s.draft.turn]] ?? null;
    else if (s.screen === "game" && s.game && s.game.phase !== "ended" && !s.pickupMode)
      diff = s.config.ai[s.game.current] ?? null;
    if (!diff) return;
    const d = diff;
    // In an all-AI game (no human seats) slow the cadence so it's watchable.
    // Both delays include an extra ~0.5s after a placement to take in the result.
    const allAI = Array.from({ length: s.config.players }, (_, p) => s.config.ai[p]).every((x) => x != null);
    const delay = allAI ? 1600 : 1020;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => {
      const st = useGame.getState();
      if (st.screen === "draft" && st.draft) {
        if (st.config.ai[st.draft.order[st.draft.turn]]) {
          if (st.draft.mode === "powers") st.draftPower(aiDraftPick(st.draft.pool, d));
          else st.draftAffinity(aiDraftAffinity(st.draft.affinityPool, d));
        }
        return;
      }
      const g = st.game;
      if (!g || g.phase === "ended" || st.pickupMode || st.config.ai[g.current] == null) return;
      if (g.phase === "setup") return st.selectStar(aiClaim(g, d));
      if (g.duskPending) return st.duskSteal(aiDusk(g));
      if (g.abyssPending) {
        const t = aiAbyss(g);
        return t === null ? st.abyssSkip() : st.abyssVoid(t);
      }
      if (g.repelOrigin) {
        const p = aiRepelPoint(g);
        return st.commitAt(p.x, p.y);
      }
      if (g.freePicks.length > 0) return st.selectStar(aiFreePick(g));
      // Optional actives the AI now uses (Flexible extra turn, Nomad redeploy).
      const act = aiActive(g);
      if (act) {
        if (act.type === "flexExtra") return st.flexExtra();
        if (act.type === "nomadPickup") return st.nomadReclaim(act.beaconId);
      }
      if (!currentHasLegalMove(g)) return aiFlexPass(g) ? st.flexPass() : st.passTurn();
      const mv = aiPlace(g, d);
      if (!mv) return aiFlexPass(g) ? st.flexPass() : st.passTurn();
      // Two-beat placement so the AI's move is visible: reveal the connection lines
      // and the snapped preview pawn, then drop it after a short pause — mirrors the
      // human placement tool instead of placing instantly.
      st.selectStar(mv.a);
      st.hoverAt(mv.x, mv.y);
      timers.push(window.setTimeout(() => useGame.getState().commitAt(mv.x, mv.y), 500));
    }, delay));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [screen, game, draft, pickupMode, config, paused]);

  // End-game animation: assign leftover flowers to their nearest pawn one by one.
  // Stops as soon as the user grabs the harvest scrubber (revealAuto = false).
  useEffect(() => {
    if (!game || game.phase !== "ended") return;
    const total = game.territory?.length ?? 0;
    const id = setInterval(() => {
      const s = useGame.getState();
      if (!s.revealAuto || s.reveal >= total) {
        clearInterval(id);
        return;
      }
      s.tickReveal();
    }, 360); // slow enough that each leftover flower's chord can ring out (the final symphony)
    return () => clearInterval(id);
  }, [game, revealAuto]);

  // Record a finished game to the scoreboard (guarded against double-recording).
  useEffect(() => {
    if (game && game.phase === "ended") useGame.getState().recordRun();
  }, [game]);

  // Chess-clock ticker: burns the active player's time while in play.
  useEffect(() => {
    if (screen !== "game") return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      useGame.getState().tickClock(dt);
    }, 200);
    return () => clearInterval(id);
  }, [screen]);

  // When the active player's clock reaches zero, auto-pass their turn (forfeit).
  useEffect(() => {
    if (screen !== "game" || !game || game.phase !== "play") return;
    if (config.clockSeconds > 0 && (clocks[game.current] ?? 1) <= 0) {
      useGame.getState().passTurn();
    }
  }, [game, clocks, screen, config.clockSeconds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useGame.getState().screen !== "game") return;
      const s = useGame.getState();
      if (e.key === " ") {
        e.preventDefault();
        s.toggleLens();
      } else if (e.key === "Enter") s.confirmPlace();
      else if (e.key === "Escape") s.deselect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (screen === "menu") return <MainMenu />;
  if (screen === "draft") return <DraftScreen />;

  const players = config.players;
  // Split the seats across the two flanks: first half left, the rest right.
  const seats = Array.from({ length: players }, (_, p) => p);
  const half = Math.ceil(players / 2);
  const leftPlayers = seats.slice(0, half);
  const rightPlayers = seats.slice(half);
  const center = (
    <section className="center-col">
      <ActionBanner />
      <div className="board-stage">
        <GameCanvas />
      </div>
      <TerritoryScrubber />
      <DuskPicker />
      <Controls />
    </section>
  );

  return (
    <div className="app">
      <Header
        onRules={() => setRulesOpen(true)}
        onLog={() => setLogOpen(true)}
        onReset={() => startGame(config)}
        onMenu={returnToMenu}
      />

      {/* All player counts flank the pond: boards split left and right, never beneath. */}
      <main className="board-main">
        <div className="side">
          {leftPlayers.map((p) => (
            <PlayerColumn key={p} player={p} />
          ))}
        </div>
        {center}
        <div className="side">
          {rightPlayers.map((p) => (
            <PlayerColumn key={p} player={p} />
          ))}
        </div>
      </main>

      <Footer />

      <FlyLayer />
      <VictoryOverlay />
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
      {logOpen && <LogModal onClose={() => setLogOpen(false)} />}
    </div>
  );
}
